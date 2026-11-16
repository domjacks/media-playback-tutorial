const video = document.querySelector("#video");

video.addEventListener("loadedmetadata", () => {
  console.log("duration", video.duration);
  console.log("size", video.videoWidth, video.videoHeight);
  logRanges("seekable", video.seekable);
});

video.addEventListener("progress", () => {
  logRanges("buffered", video.buffered);
});

video.addEventListener("canplay", () => {
  console.log("ready to play", video.readyState);
});

function logRanges(label, ranges) {
  for (let i = 0; i < ranges.length; i += 1) {
    console.log(label, ranges.start(i), ranges.end(i));
  }
}
