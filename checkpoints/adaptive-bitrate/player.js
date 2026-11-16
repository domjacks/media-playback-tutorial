// #region startup-choice
import {
  chooseRuntimeRepresentation,
  createEwma,
  estimateInitialThroughput,
  loadDashVod,
  measureFetch
} from "./dash.js";

const mpdUrl = "https://rdmedia.bbc.co.uk/bbb/2/client_manifest-avc1-high_profile.mpd";
const video = document.querySelector("#video");
const log = document.querySelector("#log");

try {
  const throughputBps = estimateInitialThroughput();
  const dash = await loadDashVod(mpdUrl, { throughputBps, bufferSeconds: 0 });
  await playDash(video, dash);
} catch (error) {
  log.textContent = error.stack ?? String(error);
}
// #endregion startup-choice

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
  const videoBuffer = mediaSource.addSourceBuffer(dash.video.mime);
  const audioBuffer = mediaSource.addSourceBuffer(dash.audio.mime);

  await Promise.all([
    appendVideoAbr(video, videoBuffer, dash),
    appendAudio(video, audioBuffer, dash.audio)
  ]);

  if (mediaSource.readyState === "open") mediaSource.endOfStream();
  log.textContent = "Ready: all segments appended";
}

// #region abr-loop
const BUFFER_GOAL_SECONDS = 30;

// Runtime ABR: choose a video Representation before every segment request.
async function appendVideoAbr(video, videoBuffer, dash) {
  const throughput = createEwma(estimateInitialThroughput());
  let current = dash.video;
  let initInBuffer = null; // the Representation whose init segment the SourceBuffer last received

  for (let index = 0; index < dash.video.segments.length; index += 1) {
    await waitForBufferGoal(video);

    current = chooseRuntimeRepresentation(dash.representations.video, current, {
      throughputBps: throughput.value(),
      bufferSeconds: bufferAhead(video)
    });

    if (initInBuffer?.id !== current.id) {
      if (initInBuffer && initInBuffer.codecs !== current.codecs) {
        videoBuffer.changeType(current.mime);
      }
      await appendBufferChecked(videoBuffer, await fetchBytes(current.init), `video init ${current.id}`);
      initInBuffer = current;
    }

    const segment = current.segments[index];
    const result = await measureFetch(segment.url);
    throughput.sample(result.throughputBps);
    await appendBufferChecked(videoBuffer, result.bytes, `video segment ${segment.number}`);
    log.textContent = `video ${current.id} segment ${segment.number}, ${Math.round(throughput.value() / 1000)} kbps, ${bufferAhead(video).toFixed(1)}s buffered`;
  }
}

// Without a buffer goal a fast network downloads everything and bufferAhead() stops meaning anything.
async function waitForBufferGoal(video) {
  while (bufferAhead(video) >= BUFFER_GOAL_SECONDS) {
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
}

async function fetchBytes(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch ${url}`);
  return response.arrayBuffer();
}
// #endregion abr-loop

// Audio stays on one Representation: append its init segment, then every media segment.
async function appendAudio(video, audioBuffer, audio) {
  await appendBufferChecked(audioBuffer, await fetchBytes(audio.init), `audio init ${audio.id}`);

  for (const segment of audio.segments) {
    await waitForBufferGoal(video);
    await appendBufferChecked(audioBuffer, await fetchBytes(segment.url), `audio segment ${segment.number}`);
  }
}

// #region buffer-depth
function bufferAhead(video) {
  for (let i = 0; i < video.buffered.length; i += 1) {
    const start = video.buffered.start(i);
    const end = video.buffered.end(i);
    if (start <= video.currentTime && video.currentTime <= end) {
      return end - video.currentTime;
    }
  }

  return 0;
}
// #endregion buffer-depth

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
