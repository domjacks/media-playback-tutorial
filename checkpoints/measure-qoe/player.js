import {
  chooseRuntimeRepresentation,
  createEwma,
  estimateInitialThroughput,
  loadDashVod
} from "./dash.js";
import { createCmcdSession } from "./cmcd.js";
import { createQoeRecorder, timedFetch } from "./qoe.js";

const mpdUrl = "https://rdmedia.bbc.co.uk/bbb/2/client_manifest-avc1-high_profile.mpd";
const video = document.querySelector("#video");
const metricsPanel = document.querySelector("#metrics");
const log = document.querySelector("#log");
const cmcdToggle = document.querySelector("#cmcd-toggle");

performance.setResourceTimingBufferSize(1000); // the default buffer of 250 entries would silently drop timings

const qoe = createQoeRecorder(video);
const cmcd = createCmcdSession({ contentId: "bbb-avc1-high" });
cmcdToggle.addEventListener("change", () => { cmcd.enabled = cmcdToggle.checked; });

const requests = []; // the latest per-request measurements, newest last
let lastCmcd = "";
let lastThroughputKbps = 0;

try {
  const throughputBps = estimateInitialThroughput();
  const dash = await loadDashVod(mpdUrl, { throughputBps, bufferSeconds: 0 });
  setInterval(renderPanel, 500);
  await playDash(video, dash);
} catch (error) {
  log.textContent = error.stack ?? String(error);
}

async function playDash(video, dash) {
  const mediaSource = new MediaSource();
  video.src = URL.createObjectURL(mediaSource);
  await once(mediaSource, "sourceopen");
  const videoBuffer = mediaSource.addSourceBuffer(dash.video.mime);
  const audioBuffer = mediaSource.addSourceBuffer(dash.audio.mime);

  await Promise.all([
    appendVideoAbr(video, videoBuffer, dash),
    appendAudio(video, audioBuffer, dash.audio, dash)
  ]);
  if (mediaSource.readyState === "open") mediaSource.endOfStream();
}

// #region cmcd-fetch
// Fetch one object with CMCD attached, and keep the measured timing for the panel and for ABR.
let stableBufferReached = false;
let starvedReported = 0;

async function fetchWithCmcd(url, fields, dash) {
  const bufferMs = bufferAhead(video) * 1000;
  stableBufferReached ||= bufferMs >= 10_000; // su stays true until the buffer first reaches ~10 s

  const stallCount = qoe.snapshot().rebufferCount;
  const starved = stallCount > starvedReported;
  starvedReported = stallCount;

  const topVideoKbps = Math.max(...dash.representations.video.map((rep) => rep.bandwidth)) / 1000;
  const { url: requestUrl, cmcd: payload } = cmcd.urlFor(url, {
    startup: !stableBufferReached,
    starved,
    playbackRate: video.playbackRate,
    bufferMs,
    throughputKbps: lastThroughputKbps || undefined,
    topBitrateKbps: fields.objectType === "v" ? topVideoKbps : undefined,
    ...fields
  });
  lastCmcd = payload;

  const result = await timedFetch(requestUrl);
  requests.push({ name: url.split("/").slice(-2).join("/"), ...result.timing });
  if (requests.length > 8) requests.shift();
  lastThroughputKbps = result.timing.kbps;
  return result;
}
// #endregion cmcd-fetch

// #region abr-loop
const BUFFER_GOAL_SECONDS = 30;

async function appendVideoAbr(video, videoBuffer, dash) {
  const throughput = createEwma(estimateInitialThroughput());
  let current = dash.video;
  let initInBuffer = null;

  for (let index = 0; index < dash.video.segments.length; index += 1) {
    await waitForBufferGoal(video);

    current = chooseRuntimeRepresentation(dash.representations.video, current, {
      throughputBps: throughput.value(),
      bufferSeconds: bufferAhead(video)
    });

    if (initInBuffer?.id !== current.id) {
      if (initInBuffer && initInBuffer.codecs !== current.codecs) videoBuffer.changeType(current.mime);
      const init = await fetchWithCmcd(current.init, { objectType: "i" }, dash);
      await appendBufferChecked(videoBuffer, init.bytes, `video init ${current.id}`);
      initInBuffer = current;
    }

    const segment = current.segments[index];
    const next = current.segments[index + 1];
    const result = await fetchWithCmcd(segment.url, {
      objectType: "v",
      bitrateKbps: current.bandwidth / 1000,
      durationMs: (segment.end - segment.start) * 1000,
      next: next ? `${String(next.number).padStart(6, "0")}.m4s` : undefined
    }, dash);

    throughput.sample(result.timing.kbps * 1000); // Resource Timing throughput feeds ABR, not wall-clock time
    qoe.recordSegment(segment.start, segment.end, current.bandwidth);
    await appendBufferChecked(videoBuffer, result.bytes, `video segment ${segment.number}`);
  }
}
// #endregion abr-loop

async function appendAudio(video, audioBuffer, audio, dash) {
  const init = await fetchWithCmcd(audio.init, { objectType: "i" }, dash);
  await appendBufferChecked(audioBuffer, init.bytes, `audio init ${audio.id}`);

  for (const segment of audio.segments) {
    await waitForBufferGoal(video);
    const result = await fetchWithCmcd(segment.url, {
      objectType: "a",
      bitrateKbps: audio.bandwidth / 1000,
      durationMs: (segment.end - segment.start) * 1000
    }, dash);
    await appendBufferChecked(audioBuffer, result.bytes, `audio segment ${segment.number}`);
  }
}

async function waitForBufferGoal(video) {
  while (bufferAhead(video) >= BUFFER_GOAL_SECONDS) {
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
}

// #region metrics-panel
function renderPanel() {
  const m = qoe.snapshot();
  const fmt = (value, digits = 0) => (value === null ? "-" : value.toFixed(digits));
  const timingMissing = requests.some((request) => request.source === "fetch-fallback");

  metricsPanel.textContent = [
    `startup           ${fmt(m.startupMs)} ms (session start to first frame)`,
    `rebuffers         ${m.rebufferCount} (${fmt(m.rebufferMs)} ms, ratio ${(m.rebufferRatio * 100).toFixed(2)}%)`,
    `bitrate switches  ${m.switchCount} (${m.oscillations} reversals)`,
    `average bitrate   ${fmt(m.averageKbps)} kbps (weighted by media seconds played)`,
    `dropped frames    ${m.droppedFrames} / ${m.totalFrames}`,
    `buffer ahead      ${bufferAhead(video).toFixed(1)} s`,
    `CMCD              ${cmcd.enabled ? lastCmcd || "(waiting)" : "off"}`,
    "",
    "recent requests (ms = fetch start to end, kbps = body bytes / body time)",
    ...requests.map((r) => `  ${r.name.padEnd(28)} ${String(Math.round(r.bytes)).padStart(8)} B ${fmt(r.ms).padStart(5)} ms ${fmt(r.kbps).padStart(6)} kbps ${r.source}`),
    timingMissing
      ? "\nNo Timing-Allow-Origin for this origin: Resource Timing hides sizes and phases, so throughput falls back to wall-clock fetch time (includes waiting)."
      : ""
  ].join("\n");
}
// #endregion metrics-panel

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
