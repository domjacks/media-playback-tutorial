import { loadLiveMpd } from "./dash-live.js";
import { streamSegment } from "./chunked.js";
import {
  chooseCatchupRate,
  fetchBytes,
  getLowLatencyEdge,
  removeOldBuffer,
  seekToTarget,
  segmentAvailableAt
} from "./live.js";

// livesim2 with 2 s segments cut into 0.5 s chunks, available 1.5 s early: the first chunk of a segment
// can be requested 0.5 s after the segment starts, and the response stays open while the rest is produced.
const mpdUrl = "https://livesim2.dashif.org/livesim2/chunkdur_0.5/ato_1.5/testpic_2s/Manifest.mpd";
const video = document.querySelector("#video");
const status = document.querySelector("#status");
const chunkLog = document.querySelector("#chunks");

let clockOffsetMs = 0;
const now = () => Date.now() + clockOffsetMs;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Same clock sync as the live lesson: the MPD names a UTC server clock.
async function fetchClockOffsetMs(url) {
  const sentAt = Date.now();
  const response = await fetch(url, { cache: "no-store" });
  const receivedAt = Date.now();
  if (!response.ok) throw new Error(`Failed to fetch ${url}`);
  return Date.parse((await response.text()).trim()) - (sentAt + receivedAt) / 2;
}

try {
  const manifest = await loadLiveMpd(mpdUrl);
  if (manifest.utcTimingUrl) clockOffsetMs = await fetchClockOffsetMs(manifest.utcTimingUrl);
  await playLowLatency(manifest);
} catch (error) {
  status.textContent = error.stack ?? String(error);
}

async function playLowLatency({ timing, tracks: trackInfo }) {
  const mediaSource = new MediaSource();
  video.src = URL.createObjectURL(mediaSource);
  await once(mediaSource, "sourceopen");

  // Each track gets its own SourceBuffer and its own append queue: audio and video chunks arrive independently.
  const tracks = trackInfo.map((track) => {
    let busy = Promise.resolve();
    return {
      ...track,
      sourceBuffer: mediaSource.addSourceBuffer(track.mime),
      exclusive(task) {
        const run = busy.then(task);
        busy = run.catch(() => {});
        return run;
      }
    };
  });

  await Promise.all(tracks.map(async (track) => {
    const init = await fetchBytes(track.initUrl);
    await track.exclusive(() => appendBufferChecked(track.sourceBuffer, init, `${track.kind} init`));
  }));

  // #region ll-loop
  let number = getLowLatencyEdge(timing, now()).startNumber; // the segment holding (live - target latency)
  let started = false;
  let lastReport = "";

  for (;;) {
    // Wait until the first chunk of this segment should exist: segment end minus availabilityTimeOffset.
    const waitMs = segmentAvailableAt(timing, number) - now();
    if (waitMs > 0) await sleep(waitMs);

    // Every track streams the same segment number at once; each appends chunks the moment they are complete.
    const results = await Promise.all(tracks.map((track) =>
      streamSegment(track.segmentUrl(number), (bytes, arrival) =>
        track.exclusive(() => appendBufferChecked(track.sourceBuffer, bytes, `${track.kind} ${number}`))
          .then(() => { lastReport = `${track.kind} ${number} chunk +${Math.round(arrival.atMs)} ms ${arrival.bytes} B`; })
      )
    ));

    if (results.some((result) => result === null)) {
      await sleep(100); // 404 or 425: our clock is slightly ahead of the packager, so try the same segment again
      continue;
    }

    chunkLog.textContent = tracks.map((track, index) =>
      `${track.kind} segment ${number}: ` +
      results[index].arrivals.map((a) => `+${Math.round(a.atMs)} ms (${a.bytes} B)`).join("  ")
    ).join("\n");

    number += 1;
    if (!started) {
      started = true;
      seekToTarget(video, mediaSource, getLowLatencyEdge(timing, now()).targetPlaybackTime);
      startMaintenance(timing, mediaSource, tracks, () => lastReport);
    }
  }
  // #endregion ll-loop
}

// #region latency-status
function startMaintenance(timing, mediaSource, tracks, getLastReport) {
  setInterval(() => {
    const edge = getLowLatencyEdge(timing, now());
    const latency = edge.livePresentationTime - video.currentTime;
    const ahead = bufferAhead(video);

    video.playbackRate = chooseCatchupRate({ latency, bufferAhead: ahead }, timing);

    for (const track of tracks) {
      track.exclusive(() => removeOldBuffer(track.sourceBuffer, video.currentTime)).catch(console.error);
    }
    if (video.buffered.length && mediaSource.readyState === "open") {
      mediaSource.setLiveSeekableRange?.(video.buffered.start(0), video.buffered.end(video.buffered.length - 1));
    }

    status.textContent =
      `latency ${latency.toFixed(2)} s (target ${timing.targetLatency.toFixed(1)} s), ` +
      `rate ${video.playbackRate.toFixed(3)}, buffer ${ahead.toFixed(2)} s\nlast: ${getLastReport()}`;
  }, 250);
}
// #endregion latency-status

function bufferAhead(video) {
  for (let i = 0; i < video.buffered.length; i += 1) {
    const start = video.buffered.start(i);
    const end = video.buffered.end(i);
    if (start <= video.currentTime && video.currentTime <= end) return end - video.currentTime;
  }
  return 0;
}

// Same helper as the MSE debugging lesson.
function appendBufferChecked(sourceBuffer, bytes, label) {
  if (sourceBuffer.updating) {
    throw new Error(`${label}: SourceBuffer is still updating`);
  }

  return new Promise((resolve, reject) => {
    const events = {
      updateend: () => settle(resolve),
      error: () => settle(reject, new Error(`${label}: SourceBuffer error`)),
      abort: () => settle(reject, new Error(`${label}: SourceBuffer abort`))
    };
    const settle = (callback, value) => {
      for (const [name, listener] of Object.entries(events)) {
        sourceBuffer.removeEventListener(name, listener);
      }
      callback(value);
    };

    for (const [name, listener] of Object.entries(events)) {
      sourceBuffer.addEventListener(name, listener);
    }

    try {
      sourceBuffer.appendBuffer(bytes);
    } catch (error) {
      settle(reject, error);
    }
  });
}

function once(target, event) {
  return new Promise((resolve) => target.addEventListener(event, resolve, { once: true }));
}
