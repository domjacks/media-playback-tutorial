import {
  chooseRuntimeRepresentation,
  createEwma,
  estimateInitialThroughput,
  loadDashVod,
  measureFetch
} from "./dash.js";

// #region config
const mpdUrl = "https://rdmedia.bbc.co.uk/bbb/2/client_manifest-avc1-high_profile.mpd";

// ?goal=600 makes the forward buffer huge, which is a quick way to provoke QuotaExceededError.
const BUFFER_GOAL_SECONDS = Number(new URLSearchParams(location.search).get("goal")) || 30;
const BACK_BUFFER_SECONDS = 30;
const MAX_GAP_SECONDS = 0.5; // the largest hole we will jump over
const END_TOLERANCE_SECONDS = 0.5; // buffered this close to the end counts as finished
const POLL_MS = 250;
// #endregion config

const video = document.querySelector("#video");
const readoutEl = document.querySelector("#readout");
const log = document.querySelector("#log");

let lastAction = "starting";
function setAction(text) {
  lastAction = `${video.currentTime.toFixed(1)}s ${text}`;
  console.log(lastAction);
}

try {
  const dash = await loadDashVod(mpdUrl, { throughputBps: estimateInitialThroughput(), bufferSeconds: 0 });
  await playDash(video, dash);
} catch (error) {
  log.textContent = error.stack ?? String(error);
}

async function playDash(video, dash) {
  if (!MediaSource.isTypeSupported(dash.video.mime)) {
    throw new Error(`Unsupported video MIME type: ${dash.video.mime}`);
  }
  if (!MediaSource.isTypeSupported(dash.audio.mime)) {
    throw new Error(`Unsupported audio MIME type: ${dash.audio.mime}`);
  }

  const mediaSource = new MediaSource();
  video.src = URL.createObjectURL(mediaSource);
  await once(mediaSource, "sourceopen");
  mediaSource.duration = dash.duration; // the scrubber shows the whole 9:32 from the start

  const ctx = {
    mediaSource,
    duration: dash.duration,
    throughput: createEwma(estimateInitialThroughput()),
    tracks: [
      makeTrack("video", mediaSource.addSourceBuffer(dash.video.mime), dash.video, dash.representations.video),
      makeTrack("audio", mediaSource.addSourceBuffer(dash.audio.mime), dash.audio, [dash.audio])
    ],
    controller: new AbortController(),
    generation: 0,
    running: [],
    nudging: false
  };

  video.addEventListener("seeking", () => onSeeking(ctx));
  video.addEventListener("waiting", () => jumpSmallGap(ctx));
  setInterval(() => {
    if (video.readyState < HTMLMediaElement.HAVE_FUTURE_DATA && !video.paused) jumpSmallGap(ctx);
    renderReadout(ctx);
  }, POLL_MS);

  startLoops(ctx);
}

function makeTrack(name, sourceBuffer, startRep, reps) {
  return {
    name,
    sourceBuffer,
    reps, // candidate Representations (audio has just one in this lesson)
    current: startRep,
    codecs: startRep.codecs, // the codec string the SourceBuffer is currently configured for
    initId: null, // the Representation whose init segment the parser last received
    done: false
  };
}

// #region buffer-helpers
// End of the contiguous buffered range containing `time`, or null if `time` is not buffered.
function bufferedEnd(ranges, time) {
  for (let i = 0; i < ranges.length; i += 1) {
    if (ranges.start(i) - 0.1 <= time && time <= ranges.end(i)) return ranges.end(i);
  }
  return null;
}

function bufferAhead(ranges, time) {
  const end = bufferedEnd(ranges, time);
  return end === null ? 0 : Math.max(0, end - time);
}
// #endregion buffer-helpers

// #region track-loop
// One loop per track. It re-reads the playhead on every iteration, so the same code handles
// normal playback, a seek into unbuffered media, and a seek into media that is already buffered.
async function runTrack(track, ctx, signal) {
  const sb = track.sourceBuffer;

  try {
    while (true) {
      signal.throwIfAborted();
      const now = video.currentTime;
      const bufferedTo = bufferedEnd(sb.buffered, now);
      const ahead = bufferedTo === null ? 0 : bufferedTo - now;

      if (bufferedTo !== null && bufferedTo >= ctx.duration - END_TOLERANCE_SECONDS) {
        track.done = true;
        endIfFinished(ctx);
        return;
      }
      if (ahead >= BUFFER_GOAL_SECONDS) {
        await sleep(POLL_MS, signal);
        continue;
      }

      // Segment index from the playhead: the segment after the buffered end, or the one
      // containing the playhead when nothing is buffered there. (+0.1 absorbs timestamp jitter.)
      const seconds = track.current.segmentSeconds;
      const index = Math.floor((bufferedTo === null ? now : bufferedTo + 0.1) / seconds);

      const rep = track.name === "video"
        ? chooseRuntimeRepresentation(track.reps, track.current, {
            throughputBps: ctx.throughput.value(),
            bufferSeconds: ahead
          })
        : track.current;

      if (track.initId !== rep.id) {
        if (track.codecs !== rep.codecs) {
          await waitIdle(sb);
          sb.changeType(rep.mime);
          track.codecs = rep.codecs;
        }
        const init = await measureFetch(rep.init, { signal });
        await appendWithQuota(track, init.bytes, signal);
        track.initId = rep.id;
      }

      track.current = rep;
      const segment = rep.segments[index];
      setAction(`fetch ${track.name} ${rep.id} #${segment.number}`);
      const result = await measureFetch(segment.url, { signal });
      if (track.name === "video") ctx.throughput.sample(result.throughputBps);
      await appendWithQuota(track, result.bytes, signal);
    }
  } catch (error) {
    if (signal.aborted) return; // a seek cancelled this loop; the new loop takes over
    log.textContent = error.stack ?? String(error);
    throw error;
  }
}
// #endregion track-loop

// #region evict
// Remove everything before `keepFrom`. This drops the back buffer and, after a long forward
// seek, the abandoned island of media near the old playhead.
async function evictBehind(sb, keepFrom, signal) {
  if (keepFrom <= 0 || sb.buffered.length === 0 || sb.buffered.start(0) >= keepFrom) return;
  setAction(`evict 0-${keepFrom.toFixed(1)}s`);
  await runOperation(sb, () => sb.remove(0, keepFrom), signal);
}

async function appendWithQuota(track, bytes, signal) {
  const sb = track.sourceBuffer;
  await evictBehind(sb, video.currentTime - BACK_BUFFER_SECONDS, signal);

  try {
    await runOperation(sb, () => sb.appendBuffer(bytes), signal);
  } catch (error) {
    if (error.name !== "QuotaExceededError") throw error;
    // The browser says the buffer is full: evict harder (keep only 5 s behind), retry once.
    setAction(`${track.name} QuotaExceededError, evicting to 5 s behind`);
    await evictBehind(sb, video.currentTime - 5, signal);
    await runOperation(sb, () => sb.appendBuffer(bytes), signal);
  }
}

// Run one append/remove and resolve on updateend. appendBuffer() can throw synchronously
// (QuotaExceededError, InvalidStateError); that rejects the promise too.
async function runOperation(sb, start, signal) {
  await waitIdle(sb);
  signal.throwIfAborted();

  return new Promise((resolve, reject) => {
    const events = {
      updateend: () => settle(resolve),
      error: () => settle(reject, new Error("SourceBuffer error")),
      abort: () => settle(reject, new DOMException("Operation aborted", "AbortError"))
    };
    const settle = (callback, value) => {
      for (const [name, listener] of Object.entries(events)) sb.removeEventListener(name, listener);
      callback(value);
    };
    for (const [name, listener] of Object.entries(events)) sb.addEventListener(name, listener);

    try {
      start();
    } catch (error) {
      settle(reject, error);
    }
  });
}

function waitIdle(sb) {
  return sb.updating ? once(sb, "updateend") : Promise.resolve();
}
// #endregion evict

// #region seek-restart
function startLoops(ctx) {
  ctx.controller = new AbortController();
  for (const track of ctx.tracks) {
    track.done = false;
    track.running = runTrack(track, ctx, ctx.controller.signal).catch(() => {});
  }
}

async function onSeeking(ctx) {
  if (ctx.nudging) { // our own gap jump: the loops are already doing the right thing
    ctx.nudging = false;
    return;
  }

  const generation = ++ctx.generation;
  setAction(`seeking to ${video.currentTime.toFixed(1)}s: abort in-flight work`);

  ctx.controller.abort(); // cancels fetches and wakes sleeping loops
  for (const track of ctx.tracks) {
    // Cancel an append that is part-way through and reset the parser to "waiting for a segment".
    // abort() is only legal while the MediaSource is open, and it throws InvalidStateError
    // if the buffer is busy with remove() (eviction) rather than an append: let that finish.
    if (ctx.mediaSource.readyState === "open" && track.sourceBuffer.updating) {
      try {
        track.sourceBuffer.abort();
      } catch (error) {
        if (error.name !== "InvalidStateError") throw error;
      }
    }
    track.initId = null; // re-append the init segment: cheap, and it guarantees a clean parser
  }

  await Promise.all(ctx.tracks.map((track) => track.running));
  if (generation !== ctx.generation) return; // a newer seek is already restarting the loops
  startLoops(ctx);
}
// #endregion seek-restart

// #region gap-jump
// If playback has stalled just before a buffered range that starts within 0.5 s, step over the hole.
function jumpSmallGap(ctx) {
  if (video.seeking || video.ended) return false;
  const now = video.currentTime;

  for (let i = 0; i < video.buffered.length; i += 1) {
    const start = video.buffered.start(i);
    if (start > now && start - now <= MAX_GAP_SECONDS) {
      setAction(`gap jump ${now.toFixed(2)} -> ${start.toFixed(2)}`);
      ctx.nudging = true;
      video.currentTime = start + 0.001;
      return true;
    }
  }
  return false;
}
// #endregion gap-jump

// #region end-of-stream
// Both tracks have everything up to the end, and no append is running: close the stream.
// Seeking back reopens the MediaSource by itself (readyState goes "ended" -> "open").
function endIfFinished(ctx) {
  if (!ctx.tracks.every((track) => track.done)) return;
  if (ctx.mediaSource.readyState !== "open") return;
  if (ctx.tracks.some((track) => track.sourceBuffer.updating)) return;
  ctx.mediaSource.endOfStream();
  setAction("endOfStream()");
}
// #endregion end-of-stream

// #region readout
function renderReadout(ctx) {
  const [videoTrack, audioTrack] = ctx.tracks;
  const now = video.currentTime;
  readoutEl.textContent = [
    `playhead      ${now.toFixed(1)} s / ${ctx.duration.toFixed(1)} s   (readyState ${video.readyState}, MediaSource ${ctx.mediaSource.readyState})`,
    `video buffer  ${formatRanges(videoTrack.sourceBuffer.buffered)}`,
    `audio buffer  ${formatRanges(audioTrack.sourceBuffer.buffered)}`,
    `buffer ahead  video ${bufferAhead(videoTrack.sourceBuffer.buffered, now).toFixed(1)} s, audio ${bufferAhead(audioTrack.sourceBuffer.buffered, now).toFixed(1)} s (goal ${BUFFER_GOAL_SECONDS} s)`,
    `representation ${videoTrack.current.id}, measured ${Math.round(ctx.throughput.value() / 1000)} kbps`,
    `last action   ${lastAction}`
  ].join("\n");
}

function formatRanges(ranges) {
  const parts = [];
  for (let i = 0; i < ranges.length; i += 1) {
    parts.push(`[${ranges.start(i).toFixed(1)} - ${ranges.end(i).toFixed(1)}]`);
  }
  return parts.join(" ") || "(empty)";
}
// #endregion readout

function sleep(ms, signal) {
  return new Promise((resolve) => {
    const done = () => {
      clearTimeout(timer);
      signal.removeEventListener("abort", done);
      resolve();
    };
    const timer = setTimeout(done, ms);
    signal.addEventListener("abort", done);
  });
}

function once(target, event) {
  return new Promise((resolve) => target.addEventListener(event, resolve, { once: true }));
}
