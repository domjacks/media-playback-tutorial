export function addSubtitleTrack(video, { src, label, language, defaultTrack = false }) {
  const track = document.createElement("track");
  track.kind = "subtitles";
  track.label = label;
  track.srclang = language;
  track.src = src;
  track.default = defaultTrack;
  video.append(track);
  return track;
}

export function showSubtitle(video, language) {
  for (const track of video.textTracks) {
    track.mode = track.language === language ? "showing" : "disabled";
  }
}
