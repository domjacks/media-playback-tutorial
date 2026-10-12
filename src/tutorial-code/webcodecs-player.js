import { loadDashVod } from "./dash.js";
import { demuxFragment, parseInitSegment } from "./mp4-demuxer.js";

const manifestUrl = "https://rdmedia.bbc.co.uk/bbb/2/client_manifest-avc1-high_profile.mpd";
const canvas = document.querySelector("#picture");
const context = canvas.getContext("2d");
const status = document.querySelector("#status");
const playButton = document.querySelector("#play");
const pauseButton = document.querySelector("#pause");
const replayButton = document.querySelector("#replay");

let session = null;

playButton.addEventListener("click", async () => {
  try {
    if (!session) {
      session = await createSession();
    }
    await session.audioContext.resume();
    session.decode().catch(showError);
    session.startClock();
    playButton.disabled = true;
    pauseButton.disabled = false;
    replayButton.disabled = false;
    status.textContent = "Playing decoded samples";
  } catch (error) {
    showError(error);
  }
});

pauseButton.addEventListener("click", async () => {
  if (!session) return;
  session.stopClock();
  await session.audioContext.suspend();
  playButton.disabled = false;
  pauseButton.disabled = true;
  status.textContent = "Paused";
});

replayButton.addEventListener("click", async () => {
  if (session) session.close();
  session = null;
  clearCanvas();
  playButton.disabled = false;
  pauseButton.disabled = true;
  replayButton.disabled = true;
  status.textContent = "Restarting from the first sample…";
  playButton.click();
});

try {
  if (!isSecureContext) throw new Error("WebCodecs needs a secure page. Use HTTPS or localhost.");
  if (!("VideoDecoder" in window) || !("AudioDecoder" in window)) {
    throw new Error("This browser does not provide both VideoDecoder and AudioDecoder.");
  }
  session = await createSession();
  status.textContent = `Ready: ${session.sampleCount.toLocaleString()} timed samples extracted. Press Play.`;
} catch (error) {
  showError(error);
}

async function createSession() {
  status.textContent = "Reading the DASH manifest…";
  const dash = await loadDashVod(manifestUrl, { bufferSeconds: 10 });
  const [videoInit, audioInit] = await Promise.all([fetchBytes(dash.video.init), fetchBytes(dash.audio.init)]);
  const videoTrack = parseInitSegment(videoInit).find((track) => track.kind === "video");
  const audioTrack = parseInitSegment(audioInit).find((track) => track.kind === "audio");
  const videoConfig = await VideoDecoder.isConfigSupported(videoTrack.config);
  const audioConfig = await AudioDecoder.isConfigSupported(audioTrack.config);
  if (!videoConfig.supported) throw new Error(`Unsupported video decoder configuration: ${videoTrack.config.codec}`);
  if (!audioConfig.supported) throw new Error(`Unsupported audio decoder configuration: ${audioTrack.config.codec}`);

  status.textContent = "Fetching DASH fragments and extracting samples…";
  const [videoSamples, audioSamples] = await Promise.all([
    fetchTrackSamples(dash.video, videoTrack),
    fetchTrackSamples(dash.audio, audioTrack)
  ]);
  const samples = [...videoSamples, ...audioSamples].sort((left, right) =>
    left.decodeTime / left.track.timescale - right.decodeTime / right.track.timescale
  );
  const firstTimestamp = samples.reduce((minimum, sample) =>
    Math.min(minimum, sample.timestamp / sample.track.timescale), Infinity
  );
  const presentationDuration = samples.reduce((maximum, sample) =>
    Math.max(maximum, (sample.timestamp + sample.duration) / sample.track.timescale - firstTimestamp), 0
  );
  const audioContext = new AudioContext();
  await audioContext.suspend();
  const audioOrigin = audioContext.currentTime + 0.2;
  const videoFrames = [];
  const sources = new Set();
  let audioScheduledUntil = audioOrigin;
  let animationFrame = 0;
  let active = true;
  let decodeStarted = false;

  const audioDecoder = new AudioDecoder({
    output: (audioData) => {
      if (!active) { audioData.close(); return; }
      try {
        const buffer = audioContext.createBuffer(audioData.numberOfChannels, audioData.numberOfFrames, audioData.sampleRate);
        for (let channel = 0; channel < audioData.numberOfChannels; channel += 1) {
          audioData.copyTo(buffer.getChannelData(channel), { planeIndex: channel, format: "f32-planar" });
        }
        const source = audioContext.createBufferSource();
        source.buffer = buffer;
        source.connect(audioContext.destination);
        source.onended = () => sources.delete(source);
        sources.add(source);
        const sampleTime = audioData.timestamp / 1_000_000 - firstTimestamp;
        const startAt = Math.max(audioOrigin + sampleTime, audioContext.currentTime + 0.01);
        source.start(startAt);
        audioScheduledUntil = Math.max(audioScheduledUntil, startAt + buffer.duration);
      } finally {
        audioData.close();
      }
    },
    error: (error) => showError(error)
  });
  const videoDecoder = new VideoDecoder({
    output: (frame) => {
      if (!active) { frame.close(); return; }
      if (videoFrames.length >= 6) videoFrames.shift().close();
      videoFrames.push(frame);
    },
    error: (error) => showError(error)
  });
  audioDecoder.configure(audioConfig.config);
  videoDecoder.configure(videoConfig.config);

  async function decodeSamples() {
    if (decodeStarted) return;
    decodeStarted = true;
    for (let index = 0; index < samples.length; index += 1) {
      const sample = samples[index];
      if (sample.track.kind === "audio") {
        while (audioScheduledUntil - audioContext.currentTime > 2) await wait(25);
      }
      const timestamp = Math.round((sample.timestamp / sample.track.timescale - firstTimestamp) * 1_000_000);
      const duration = Math.round((sample.duration / sample.track.timescale) * 1_000_000);
      const init = { timestamp, duration, data: sample.data };
      if (sample.track.kind === "video") {
        videoDecoder.decode(new EncodedVideoChunk({ ...init, type: sample.key ? "key" : "delta" }));
      } else {
        audioDecoder.decode(new EncodedAudioChunk({ ...init, type: "key" }));
      }
      while (videoDecoder.decodeQueueSize > 12 || audioDecoder.decodeQueueSize > 12) await wait(10);
      if (index % 32 === 31) status.textContent = `Decoded ${index + 1} of ${samples.length} encoded samples…`;
    }
    await Promise.all([videoDecoder.flush(), audioDecoder.flush()]);
    status.textContent = "All samples decoded. Playback is ready.";
  }

  function drawFrame() {
    if (!active || audioContext.state !== "running") return;
    const now = audioContext.currentTime;
    const mediaTime = now - audioOrigin;
    let nextFrame;
    while (videoFrames.length && videoFrames[0].timestamp / 1_000_000 <= mediaTime) {
      nextFrame?.close();
      nextFrame = videoFrames.shift();
    }
    if (nextFrame) {
      context.drawImage(nextFrame, 0, 0, canvas.width, canvas.height);
      nextFrame.close();
    }
    if (mediaTime >= presentationDuration) {
      cancelAnimationFrame(animationFrame);
      audioContext.suspend();
      playButton.disabled = true;
      pauseButton.disabled = true;
      replayButton.disabled = false;
      status.textContent = "Playback ended. Press Replay to start again.";
      return;
    }
    animationFrame = requestAnimationFrame(drawFrame);
  }

  return {
    sampleCount: samples.length,
    audioContext,
    startClock() { cancelAnimationFrame(animationFrame); animationFrame = requestAnimationFrame(drawFrame); },
    stopClock() { cancelAnimationFrame(animationFrame); },
    close() {
      active = false;
      cancelAnimationFrame(animationFrame);
      for (const frame of videoFrames) frame.close();
      for (const source of sources) { source.stop(); source.disconnect(); }
      audioDecoder.close();
      videoDecoder.close();
      audioContext.close();
    },
    decode: decodeSamples
  };
}

async function fetchTrackSamples(track, trackConfig) {
  const samples = [];
  for (let index = 0; index < track.segments.length; index += 4) {
    const batch = track.segments.slice(index, index + 4);
    const buffers = await Promise.all(batch.map(async (segment) => {
      const response = await fetch(segment.url);
      if (!response.ok) throw new Error(`Failed to fetch media segment ${response.url}`);
      return response.arrayBuffer();
    }));
    for (const buffer of buffers) samples.push(...demuxFragment(buffer, [trackConfig]));
    status.textContent = `Read ${Math.min(index + batch.length, track.segments.length)} of ${track.segments.length} ${trackConfig.kind} fragments…`;
  }
  return samples;
}

async function fetchBytes(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch ${url}`);
  return response.arrayBuffer();
}

function clearCanvas() { context.clearRect(0, 0, canvas.width, canvas.height); }
function wait(milliseconds) { return new Promise((resolve) => setTimeout(resolve, milliseconds)); }
function showError(error) {
  status.textContent = `Playback error: ${error.stack ?? error}`;
  playButton.disabled = false;
  pauseButton.disabled = true;
}

