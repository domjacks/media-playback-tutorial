// #region create-media-source
const video = document.querySelector("#video");
const mediaSource = new MediaSource();
// #endregion create-media-source

// #region attach
video.src = URL.createObjectURL(mediaSource);
// #endregion attach

// #region describe-tracks
const base = "https://vod-dash-ww-rd-live.akamaized.net/bbb/2";
const tracks = [
  {
    mime: 'video/mp4; codecs="avc1.64001f"',
    files: [
      `${base}/avc1/896x504p25/IS.mp4`,
      `${base}/avc1/896x504p25/000001.m4s`,
      `${base}/avc1/896x504p25/000002.m4s`,
      `${base}/avc1/896x504p25/000003.m4s`
    ]
  },
  {
    mime: 'audio/mp4; codecs="mp4a.40.2"',
    files: [
      `${base}/audio/128kbps/IS.mp4`,
      `${base}/audio/128kbps/000001.m4s`,
      `${base}/audio/128kbps/000002.m4s`,
      `${base}/audio/128kbps/000003.m4s`
    ]
  }
];
// #endregion describe-tracks

// #region fetch-and-append
mediaSource.addEventListener("sourceopen", async () => {
  console.log("MediaSource is open");

  await Promise.all(tracks.map(async (track) => {
    // #region add-source-buffer
    const sourceBuffer = mediaSource.addSourceBuffer(track.mime);
    // #endregion add-source-buffer
    const queue = await Promise.all(track.files.map(fetchBytes));
    await appendAll(sourceBuffer, queue);
  }));

  mediaSource.endOfStream();
});

async function fetchBytes(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch ${url}`);
  return response.arrayBuffer();
}
// #endregion fetch-and-append

// #region append-queue
function appendAll(sourceBuffer, queue) {
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      sourceBuffer.removeEventListener("updateend", onUpdateEnd);
      sourceBuffer.removeEventListener("error", onError);
    };
    const onUpdateEnd = () => {
      if (!queue.length) {
        cleanup();
        return resolve();
      }
      sourceBuffer.appendBuffer(queue.shift());
    };
    const onError = () => {
      cleanup();
      reject(new Error("SourceBuffer append failed"));
    };

    sourceBuffer.addEventListener("updateend", onUpdateEnd);
    sourceBuffer.addEventListener("error", onError);
    sourceBuffer.appendBuffer(queue.shift());
  });
}
// #endregion append-queue
