import { estimateInitialThroughput, loadDashVod, measureFetch } from "./dash.js";
import { addSubtitleTrack } from "./subtitles.js";

const mpdUrl = "https://rdmedia.bbc.co.uk/bbb/2/client_manifest-avc1-high_profile.mpd";
const video = document.querySelector("#video");
const log = document.querySelector("#log");

try {
  const throughputBps = estimateInitialThroughput();
  const dash = await loadDashVod(mpdUrl, { throughputBps, bufferSeconds: 0 });
  addSubtitleTrack(video, {
    src: "./sample.vtt",
    label: "English",
    language: "en",
    defaultTrack: true
  });
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
  const videoBuffer = mediaSource.addSourceBuffer(dash.video.mime);
  const audioBuffer = mediaSource.addSourceBuffer(dash.audio.mime);

  await Promise.all([
    appendTrack(videoBuffer, [dash.video.init, ...dash.video.segments.map((segment) => segment.url)], "video"),
    appendTrack(audioBuffer, [dash.audio.init, ...dash.audio.segments.map((segment) => segment.url)], "audio")
  ]);

  if (mediaSource.readyState === "open") mediaSource.endOfStream();
  log.textContent = `Ready: video ${dash.video.id}, audio ${dash.audio.id}`;
}

function appendTrack(sourceBuffer, urls, label) {
  let index = 0;

  return new Promise((resolve, reject) => {
    async function appendNext() {
      if (index >= urls.length) {
        resolve();
        return;
      }

      const result = await measureFetch(urls[index]);
      index += 1;
      log.textContent = `Appending ${label} ${Math.max(0, index - 1)} at ${Math.round(result.throughputBps / 1000)} kbps`;
      sourceBuffer.appendBuffer(result.bytes);
    }

    sourceBuffer.addEventListener("updateend", () => appendNext().catch(reject));
    appendNext().catch(reject);
  });
}

function once(target, event) {
  return new Promise((resolve) => target.addEventListener(event, resolve, { once: true }));
}
