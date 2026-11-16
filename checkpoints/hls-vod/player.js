import { parseMultivariant, parseMedia } from "./m3u8.js";

const masterUrl = "https://devstreaming-cdn.apple.com/videos/streaming/examples/img_bipbop_adv_example_fmp4/master.m3u8";
const START_BANDWIDTH = 1_000_000; // bits per second; a real player measures this. Low on purpose: nothing is evicted yet
const BUFFER_GOAL_SECONDS = 30;
const AUDIO_CODEC = "mp4a.40.2"; // keep the tutorial on stereo AAC; the stream also offers AC-3 and E-AC-3

const video = document.querySelector("#video");
const log = (message) => {
  console.log(message);
  document.querySelector("#log").textContent += `${message}\n`;
};

const master = parseMultivariant(await fetchText(masterUrl), masterUrl);

// #region choose-variant
const mimeFor = (codec) => `${codec.startsWith("avc1") || codec.startsWith("hvc1") ? "video" : "audio"}/mp4; codecs="${codec}"`;

// A variant is playable only if every codec it lists is supported, and we only take stereo AAC here.
const playable = master.variants.filter((variant) =>
  variant.codecs.every((codec) => MediaSource.isTypeSupported(mimeFor(codec))) &&
  variant.codecs.some((codec) => codec.startsWith("avc1")) &&
  variant.codecs.includes(AUDIO_CODEC)
);
if (playable.length === 0) throw new Error("No playable variant in this multivariant playlist");

// Highest BANDWIDTH that fits the budget, else the lowest one. BANDWIDTH is the peak rate, so be conservative.
const byBandwidth = [...playable].sort((a, b) => a.bandwidth - b.bandwidth);
const variant = byBandwidth.filter((v) => v.bandwidth <= START_BANDWIDTH).at(-1) ?? byBandwidth[0];
log(`variant ${variant.resolution} bandwidth=${variant.bandwidth} codecs=${variant.codecs.join(",")} audio group=${variant.audioGroup ?? "(muxed)"}`);
// #endregion choose-variant

// #region plan-tracks
const videoCodec = variant.codecs.find((codec) => codec.startsWith("avc1"));
const audioRendition = variant.audioGroup
  ? pickRendition(master.renditions, "AUDIO", variant.audioGroup)
  : undefined;

// With an AUDIO group the audio lives in its own media playlist and needs its own SourceBuffer.
// Without one, the variant's playlist carries muxed audio+video: one SourceBuffer, both codecs.
const plans = audioRendition?.url
  ? [
      { name: "video", mime: `video/mp4; codecs="${videoCodec}"`, playlistUrl: variant.url },
      { name: "audio", mime: `audio/mp4; codecs="${AUDIO_CODEC}"`, playlistUrl: audioRendition.url }
    ]
  : [{ name: "muxed", mime: `video/mp4; codecs="${variant.codecs.join(",")}"`, playlistUrl: variant.url }];

function pickRendition(renditions, type, groupId) {
  const group = renditions.filter((r) => r.type === type && r.groupId === groupId);
  return group.find((r) => r.default) ?? group[0];
}
// #endregion plan-tracks

const playlists = await Promise.all(plans.map(async (plan) => parseMedia(await fetchText(plan.playlistUrl), plan.playlistUrl)));
const totalSeconds = Math.max(...playlists.map((playlist) => playlist.duration));
log(`${plans.map((plan, i) => `${plan.name}: ${playlists[i].segments.length} segments`).join(", ")}; ${totalSeconds.toFixed(1)}s`);

const mediaSource = new MediaSource();
video.src = URL.createObjectURL(mediaSource);
await new Promise((resolve) => mediaSource.addEventListener("sourceopen", resolve, { once: true }));

const tracks = plans.map((plan, i) => ({
  ...plan,
  buffer: mediaSource.addSourceBuffer(plan.mime),
  segments: playlists[i].segments,
  timelineOffset: 0
}));

// #region append-loop
// Phase 1: append each track's init segment (#EXT-X-MAP) and its first media segment.
await Promise.all(tracks.map(async (track) => {
  const first = track.segments[0];
  await appendSegment(track.buffer, first.map);
  await appendSegment(track.buffer, first);
  // HLS does not require timestamps to start at zero. This stream's first sample is near 10 s,
  // so remember how far the buffered timeline sits from the playlist timeline.
  track.timelineOffset = track.buffer.buffered.start(0) - first.start;
}));
video.currentTime = Math.max(...tracks.map((track) => track.buffer.buffered.start(0)));
mediaSource.duration = video.currentTime + totalSeconds; // the timeline starts at ~10 s, so it ends at ~610 s
log(`first sample at ${video.currentTime.toFixed(3)}s, so playback starts there`);

// Phase 2: keep appending until the buffer goal is met, then wait for playback to catch up.
await Promise.all(tracks.map(async (track) => {
  for (const segment of track.segments.slice(1)) {
    while (segment.start + track.timelineOffset - video.currentTime > BUFFER_GOAL_SECONDS) {
      await sleep(500);
    }
    await appendSegment(track.buffer, segment);
  }
}));

mediaSource.endOfStream();
log("endOfStream");
// #endregion append-loop

// #region fetch-segment
// A resource is either a whole file or a byte range of one file (#EXT-X-BYTERANGE, or BYTERANGE on #EXT-X-MAP).
async function appendSegment(sourceBuffer, resource) {
  const headers = {};
  if (resource.byteRange) {
    const { offset, length } = resource.byteRange;
    headers.Range = `bytes=${offset}-${offset + length - 1}`; // HTTP ranges are inclusive
  }
  const response = await fetch(resource.url, { headers });
  if (!response.ok) throw new Error(`Failed to fetch ${resource.url} (${response.status})`);
  if (resource.byteRange && response.status !== 206) throw new Error("Server ignored the Range header");
  await appendBuffer(sourceBuffer, await response.arrayBuffer());
}
// #endregion fetch-segment

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

async function fetchText(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch ${url} (${response.status})`);
  return response.text();
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
