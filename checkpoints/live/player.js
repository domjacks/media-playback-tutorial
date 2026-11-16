import { loadLiveMpd } from "./dash-live.js";
import {
  createLiveController,
  fetchBytes,
  getLiveSegmentRange,
  removeOldBuffer,
  seekToLiveStart,
  updateLiveCatchup
} from "./live.js";

// DASH-IF live simulator: a looping test stream with a 2 s segment duration.
const mpdUrl = "https://livesim2.dashif.org/livesim2/testpic_2s/Manifest.mpd";
const video = document.querySelector("#video");
const status = document.querySelector("#status");

// #region clock-sync
// The MPD's UTCTiming element names a server clock. Measure how far the local clock is from it.
async function fetchClockOffsetMs(url) {
  const sentAt = Date.now();
  const response = await fetch(url, { cache: "no-store" });
  const receivedAt = Date.now();
  if (!response.ok) throw new Error(`Failed to fetch ${url}`);
  const serverMs = Date.parse((await response.text()).trim());
  return serverMs - (sentAt + receivedAt) / 2; // assume the reply took half the round trip
}
// #endregion clock-sync

let clockOffsetMs = 0;
let timing = null; // latest parsed MPD timing
let lastNumber = null;

try {
  const manifest = await loadLiveMpd(mpdUrl);
  timing = manifest.timing;
  if (manifest.utcTimingUrl) clockOffsetMs = await fetchClockOffsetMs(manifest.utcTimingUrl);
  await playLive(manifest);
} catch (error) {
  showError(error);
}

async function playLive(manifest) {
  const mediaSource = new MediaSource();
  video.src = URL.createObjectURL(mediaSource);
  await once(mediaSource, "sourceopen");

  const tracks = manifest.tracks.map((track) => ({
    ...track,
    sourceBuffer: mediaSource.addSourceBuffer(track.mime)
  }));

  // Serialise every SourceBuffer operation (appends and removals) so none overlaps another.
  let busy = Promise.resolve();
  const exclusive = (task) => {
    const run = busy.then(task);
    busy = run.catch(() => {});
    return run;
  };

  await Promise.all(tracks.map(async (track) => {
    const init = await fetchBytes(track.initUrl);
    await exclusive(() => appendBufferChecked(track.sourceBuffer, init, `${track.kind} init`));
  }));

  // #region live-wiring
  const controller = createLiveController({
    refreshManifest: async () => {
      timing = (await loadLiveMpd(mpdUrl)).timing;
      return { timing };
    },
    getNow: () => Date.now() + clockOffsetMs,
    appendSegment: async (number) => {
      // Fetch every track first: a 404 on either one must not leave the other half-appended.
      const bytes = await Promise.all(tracks.map((track) => fetchBytes(track.segmentUrl(number))));
      await exclusive(() => Promise.all(tracks.map((track, index) =>
        appendBufferChecked(track.sourceBuffer, bytes[index], `${track.kind} segment ${number}`)
      )));
      lastNumber = number;
    },
    onStarted: () => seekToLiveStart(video, mediaSource),
    onError: showError
  });
  await controller.start();
  // #endregion live-wiring

  // #region live-maintenance
  setInterval(() => {
    const range = getLiveSegmentRange(timing, Date.now() + clockOffsetMs);
    const targetLatency = range.livePresentationTime - range.targetPlaybackTime;
    updateLiveCatchup(video, { livePresentationTime: range.livePresentationTime, targetLatency });

    for (const track of tracks) {
      exclusive(() => removeOldBuffer(track.sourceBuffer, video.currentTime)).catch(console.error);
    }
    if (video.buffered.length && mediaSource.readyState === "open") {
      mediaSource.setLiveSeekableRange?.(video.buffered.start(0), video.buffered.end(video.buffered.length - 1));
    }

    const latency = range.livePresentationTime - video.currentTime;
    status.textContent =
      `segment ${lastNumber}, latency ${latency.toFixed(1)}s (target ${targetLatency.toFixed(1)}s), ` +
      `rate ${video.playbackRate}, clock offset ${Math.round(clockOffsetMs)} ms`;
  }, 1000);
  // #endregion live-maintenance
}

function showError(error) {
  status.textContent = error.stack ?? String(error);
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
