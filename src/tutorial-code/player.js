import { loadDashVod } from "./dash.js";
import { addSubtitleTrack } from "./subtitles.js";

const mpdUrl = "https://rdmedia.bbc.co.uk/bbb/2/client_manifest-common_init.mpd";
const video = document.querySelector("#video");
const log = document.querySelector("#log");

try {
  const manifest = await loadDashVod(mpdUrl);
  addSubtitleTrack(video, {
    src: "./sample.vtt",
    label: "English",
    language: "en",
    defaultTrack: true
  });
  await playManifest(video, manifest);
} catch (error) {
  log.textContent = error.stack ?? String(error);
}

async function playManifest(video, manifest) {
  if (!MediaSource.isTypeSupported(manifest.mime)) {
    throw new Error(`Unsupported MIME type: ${manifest.mime}`);
  }

  const mediaSource = new MediaSource();
  video.src = URL.createObjectURL(mediaSource);

  await once(mediaSource, "sourceopen");
  const sourceBuffer = mediaSource.addSourceBuffer(manifest.mime);
  const urls = [manifest.init, ...manifest.segments.slice(0, 24)];

  sourceBuffer.addEventListener("updateend", async () => {
    if (!urls.length) {
      if (mediaSource.readyState === "open") mediaSource.endOfStream();
      return;
    }
    sourceBuffer.appendBuffer(await fetchBytes(urls.shift()));
  });

  sourceBuffer.appendBuffer(await fetchBytes(urls.shift()));
}

async function fetchBytes(url) {
  log.textContent = `Fetching ${url}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch ${url}`);
  return response.arrayBuffer();
}

function once(target, event) {
  return new Promise((resolve) => target.addEventListener(event, resolve, { once: true }));
}
