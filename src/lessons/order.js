export const lessonSections = [
  {
    title: "Getting Started",
    slugs: ["introduction"]
  },
  {
    title: "Media Fundamentals",
    slugs: ["video-fundamentals", "audio-fundamentals", "inspect-av-with-ffmpeg"]
  },
  {
    title: "Codecs And Containers",
    slugs: [
      "codecs-compression",
      "inspect-codecs-compression",
      "media-files-containers",
      "inspect-mp4-containers",
      "fragmented-mp4-cmaf",
      "create-fragmented-mp4"
    ]
  },
  {
    title: "Playback In The Browser",
    slugs: ["players-timelines-buffers", "progressive-download", "streaming-segments", "mse-basics", "mse-debugging", "mse-in-depth"]
  },
  {
    title: "DASH And Adaptive Streaming",
    slugs: ["protocols", "dash-theory", "dash-vod", "adaptive-bitrate", "buffer-management", "seeking-and-eviction"]
  },
  {
    title: "HLS",
    slugs: ["hls-theory", "hls-vod"]
  },
  {
    title: "Decoding With WebCodecs",
    slugs: ["demuxing-samples", "webcodecs-playback"]
  },
  {
    title: "Live Streaming",
    slugs: ["live-theory", "dash-live-timing", "live"]
  },
  {
    title: "Subtitles",
    slugs: ["subtitle-theory", "subtitle-practical", "imsc-practical"]
  },
  {
    title: "Encrypted Media",
    slugs: ["drm-theory", "drm-practical"]
  },
  {
    title: "Wrap Up",
    slugs: ["putting-it-all-together"]
  }
];

export const lessonOrder = lessonSections.flatMap((section) => section.slugs);
