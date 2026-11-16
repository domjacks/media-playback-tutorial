// Live helpers, adapted from the Live Playback checkpoint for low-latency chunked DASH.

export async function fetchBytes(url) {
  const response = await fetch(url);
  if (!response.ok) {
    const error = new Error(`HTTP ${response.status} for ${url}`);
    error.status = response.status;
    throw error;
  }
  return response.arrayBuffer();
}

// #region ll-timing
// Same fields as the live lesson, plus the two low-latency attributes of SegmentTemplate
// and the ServiceDescription the packager publishes for players.
export function parseLiveTiming(doc, template) {
  const mpd = doc.documentElement;
  const timescale = Number(template.getAttribute("timescale") ?? 1);
  const duration = Number(template.getAttribute("duration"));
  const latency = mpd.querySelector("ServiceDescription > Latency");
  const rate = mpd.querySelector("ServiceDescription > PlaybackRate");

  return {
    availabilityStartTimeMs: Date.parse(mpd.getAttribute("availabilityStartTime")),
    startNumber: Number(template.getAttribute("startNumber") ?? 1),
    segmentDuration: duration / timescale,
    // Seconds by which each segment is available BEFORE it is complete, because chunks are flushed as produced.
    availabilityTimeOffset: Number(template.getAttribute("availabilityTimeOffset") ?? 0),
    availabilityTimeComplete: template.getAttribute("availabilityTimeComplete") !== "false",
    // ServiceDescription is in milliseconds; fall back to 3 s and a +-4 % rate range if the MPD has none.
    targetLatency: latency ? Number(latency.getAttribute("target")) / 1000 : 3,
    minRate: rate ? Number(rate.getAttribute("min")) : 0.96,
    maxRate: rate ? Number(rate.getAttribute("max")) : 1.04
  };
}
// #endregion ll-timing

// #region ll-edge
// Segment N covers [N*d, (N+1)*d) of presentation time. A normal segment can be requested once it is
// complete, at (N+1)*d. With availabilityTimeOffset it can be requested ato seconds earlier.
export function segmentAvailableAt(timing, number) {
  const endSeconds = (number - timing.startNumber + 1) * timing.segmentDuration;
  return timing.availabilityStartTimeMs + (endSeconds - timing.availabilityTimeOffset) * 1000;
}

export function getLowLatencyEdge(timing, nowMs) {
  const livePresentationTime = Math.max(0, (nowMs - timing.availabilityStartTimeMs) / 1000);
  // Newest segment whose first chunk exists: the one still being produced.
  const newest = timing.startNumber +
    Math.floor((livePresentationTime + timing.availabilityTimeOffset) / timing.segmentDuration) - 1;
  const targetPlaybackTime = Math.max(0, livePresentationTime - timing.targetLatency);
  const startNumber = timing.startNumber + Math.floor(targetPlaybackTime / timing.segmentDuration);
  return { livePresentationTime, newest, targetPlaybackTime, startNumber };
}
// #endregion ll-edge

// #region seek-to-live-start
// Call once the first media is appended: expose the live window and move the playhead near the target latency.
export function seekToTarget(video, mediaSource, targetPlaybackTime) {
  if (!video.buffered.length) return;
  const start = video.buffered.start(0);
  const end = video.buffered.end(video.buffered.length - 1);

  if (mediaSource.readyState === "open") {
    mediaSource.duration = Infinity; // live: there is no known end
    mediaSource.setLiveSeekableRange?.(start, end);
  }
  video.currentTime = Math.min(Math.max(targetPlaybackTime, start), end - 0.1);
}
// #endregion seek-to-live-start

// #region ll-catchup
// Steer latency back to the target by nudging playbackRate within the MPD's PlaybackRate range.
// Latency above target speeds up, below target slows down (which rebuilds a thin buffer).
export function chooseCatchupRate({ latency, bufferAhead }, { targetLatency, minRate, maxRate }) {
  if (bufferAhead < 0.4) return minRate; // about to stall: slow down whatever the latency says
  const error = latency - targetLatency;
  if (Math.abs(error) < 0.15) return 1; // dead band so the rate does not flutter
  return Math.min(maxRate, Math.max(minRate, 1 + error * 0.08));
}
// #endregion ll-catchup

// #region prune-buffer
export async function removeOldBuffer(sourceBuffer, currentTime, keepBehind = 10) {
  const removeEnd = currentTime - keepBehind;
  if (removeEnd <= 0 || sourceBuffer.updating) return;
  if (!sourceBuffer.buffered.length || sourceBuffer.buffered.start(0) >= removeEnd) return;

  await new Promise((resolve, reject) => {
    sourceBuffer.addEventListener("updateend", resolve, { once: true });
    sourceBuffer.addEventListener("error", reject, { once: true });
    sourceBuffer.remove(0, removeEnd);
  });
}
// #endregion prune-buffer
