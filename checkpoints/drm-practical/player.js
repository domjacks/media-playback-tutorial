import { installClearKey } from "./drm.js";

const video = document.querySelector("#video");
const logElement = document.querySelector("#log");

function log(text) {
  const line = `${(performance.now() / 1000).toFixed(2)}s  ${text}`;
  console.log(line);
  logElement.textContent += `${line}\n`;
}

// #region test-key
// TEST ONLY: the same published values as lab.sh. Never ship a real key in client code.
const TEST_KEYS = [{ kid: "00112233445566778899aabbccddeeff", key: "0f1e2d3c4b5a69788796a5b4c3d2e1f0" }];
// #endregion test-key

const tracks = [
  { mime: 'video/mp4; codecs="avc1.64001f"', url: "./media/video.mp4" },
  { mime: 'audio/mp4; codecs="mp4a.40.2"', url: "./media/audio.mp4" }
];

// #region start
async function start() {
  // Install EME first: "encrypted" can fire as soon as the first encrypted bytes are parsed.
  await installClearKey(video, TEST_KEYS, log);

  const mediaSource = new MediaSource();
  video.src = URL.createObjectURL(mediaSource);
  await new Promise((resolve) => mediaSource.addEventListener("sourceopen", resolve, { once: true }));

  // Each file is a complete fragmented MP4 (init segment plus one fragment),
  // so appending the whole file is the same as appending init then media.
  await Promise.all(tracks.map(async (track) => {
    const sourceBuffer = mediaSource.addSourceBuffer(track.mime);
    const bytes = await (await fetch(track.url)).arrayBuffer();
    sourceBuffer.appendBuffer(bytes);
    await new Promise((resolve, reject) => {
      sourceBuffer.addEventListener("updateend", resolve, { once: true });
      sourceBuffer.addEventListener("error", () => reject(new Error(`append failed for ${track.url}`)), { once: true });
    });
    log(`appended ${track.url} (${bytes.byteLength} bytes)`);
  }));

  mediaSource.endOfStream();
  log(`ready: duration ${mediaSource.duration.toFixed(2)}s, press play`);
}
// #endregion start

video.addEventListener("error", () => log(`video error: ${video.error?.message ?? video.error?.code}`));
start().catch((error) => log(`start failed: ${error.message}`));
