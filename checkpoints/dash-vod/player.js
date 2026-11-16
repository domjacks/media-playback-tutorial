import { loadDashVod } from "./dash.js";

const mpdUrl = "https://rdmedia.bbc.co.uk/bbb/2/client_manifest-avc1-high_profile.mpd";
const video = document.querySelector("#video");
const dash = await loadDashVod(mpdUrl);

if (!MediaSource.isTypeSupported(dash.video.mime)) {
  throw new Error(`Unsupported video type: ${dash.video.mime}`);
}
if (!MediaSource.isTypeSupported(dash.audio.mime)) {
  throw new Error(`Unsupported audio type: ${dash.audio.mime}`);
}

const mediaSource = new MediaSource();
video.src = URL.createObjectURL(mediaSource);

mediaSource.addEventListener("sourceopen", async () => {
  const videoBuffer = mediaSource.addSourceBuffer(dash.video.mime);
  const audioBuffer = mediaSource.addSourceBuffer(dash.audio.mime);

  await Promise.all([
    appendTrack(videoBuffer, [dash.video.init, ...dash.video.segments.map((segment) => segment.url)]),
    appendTrack(audioBuffer, [dash.audio.init, ...dash.audio.segments.map((segment) => segment.url)])
  ]);

  mediaSource.endOfStream();
}, { once: true });

async function appendTrack(sourceBuffer, urls) {
  for (const url of urls) {
    await appendBuffer(sourceBuffer, await fetchBytes(url));
  }
}

// Resolves on updateend, rejects on error, and removes both listeners once settled.
function appendBuffer(sourceBuffer, bytes) {
  return new Promise((resolve, reject) => {
    const onUpdateEnd = () => settle(resolve);
    const onError = () => settle(reject, new Error("SourceBuffer append failed"));
    const settle = (callback, value) => {
      sourceBuffer.removeEventListener("updateend", onUpdateEnd);
      sourceBuffer.removeEventListener("error", onError);
      callback(value);
    };

    sourceBuffer.addEventListener("updateend", onUpdateEnd);
    sourceBuffer.addEventListener("error", onError);
    sourceBuffer.appendBuffer(bytes);
  });
}

async function fetchBytes(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch ${url}`);
  return response.arrayBuffer();
}
