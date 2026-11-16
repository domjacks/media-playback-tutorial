export function parseLiveTiming(doc, template) {
  const mpd = doc.documentElement;
  const timescale = Number(template.getAttribute("timescale") ?? 1);
  const duration = Number(template.getAttribute("duration"));

  return {
    type: mpd.getAttribute("type"),
    availabilityStartTimeMs: Date.parse(mpd.getAttribute("availabilityStartTime")),
    publishTimeMs: Date.parse(mpd.getAttribute("publishTime") ?? ""),
    minimumUpdatePeriodMs: parseDuration(mpd.getAttribute("minimumUpdatePeriod")) * 1000,
    timeShiftBufferDepth: parseDuration(mpd.getAttribute("timeShiftBufferDepth")),
    suggestedPresentationDelay: parseDuration(mpd.getAttribute("suggestedPresentationDelay")),
    startNumber: Number(template.getAttribute("startNumber") ?? 1),
    segmentDuration: duration / timescale
  };
}

export function getLiveSegmentRange(timing, nowMs = Date.now()) {
  const livePresentationTime = Math.max(0, (nowMs - timing.availabilityStartTimeMs) / 1000);
  // A segment only becomes available at its END time, so latency must be at least one segment.
  const targetLatency = Math.max(timing.suggestedPresentationDelay || timing.segmentDuration * 3, timing.segmentDuration);
  const targetPlaybackTime = Math.max(0, livePresentationTime - targetLatency);
  const windowDepth = timing.timeShiftBufferDepth || timing.segmentDuration * 12;

  const newest = timing.startNumber + Math.floor(targetPlaybackTime / timing.segmentDuration);
  const first = Math.max(
    timing.startNumber,
    newest - Math.floor(windowDepth / timing.segmentDuration)
  );

  return { first, newest, targetPlaybackTime, livePresentationTime };
}

export async function fetchBytes(url) {
  const response = await fetch(url);
  if (!response.ok) {
    const error = new Error(`HTTP ${response.status} for ${url}`);
    error.status = response.status;
    throw error;
  }
  return response.arrayBuffer();
}

export function createLiveController({ refreshManifest, appendSegment, segmentUrl, onStarted, onError = console.error, retryDelayMs = 750 }) {
  let nextNumber = null; // the next segment number to append
  let started = false;
  let stopped = false;
  let timer = 0;

  return {
    async start() {
      await tick();
    },
    stop() {
      stopped = true;
      clearTimeout(timer);
    }
  };

  async function tick() {
    if (stopped) return;
    const { timing } = await refreshManifest();
    const range = getLiveSegmentRange(timing);
    let nextDelayMs = Math.max(timing.minimumUpdatePeriodMs || 1000, 500);

    // First tick: start at the live edge. Later: if we fell out of the window, jump back to the edge.
    if (nextNumber === null || nextNumber < range.first) nextNumber = range.newest;

    while (nextNumber <= range.newest) {
      try {
        await appendSegment(segmentUrl(nextNumber));
      } catch (error) {
        if (isNearLiveEdge404(error, nextNumber, range.newest)) {
          nextDelayMs = retryDelayMs; // do not advance; try this segment again next tick
          break;
        }
        throw error;
      }

      nextNumber += 1;
      if (!started) {
        started = true;
        await onStarted?.();
      }
    }

    if (!stopped) timer = setTimeout(() => tick().catch(onError), nextDelayMs);
  }
}

// Call once the first media is appended: expose the live window and move the playhead onto it.
export function seekToLiveStart(video, mediaSource) {
  if (!video.buffered.length) return;
  const start = video.buffered.start(0);
  const end = video.buffered.end(video.buffered.length - 1);

  if (mediaSource.readyState === "open") {
    mediaSource.duration = Infinity; // live: there is no known end
    mediaSource.setLiveSeekableRange?.(start, end);
  }
  video.currentTime = start;
}

export function updateLiveCatchup(video, { livePresentationTime, targetLatency }) {
  const currentLatency = livePresentationTime - video.currentTime;
  const drift = currentLatency - targetLatency;

  if (drift > 6) {
    video.playbackRate = 1.06;
  } else if (drift < 1) {
    video.playbackRate = 1;
  }
}

export async function removeOldBuffer(sourceBuffer, currentTime, keepBehind = 30) {
  const removeEnd = currentTime - keepBehind;
  if (removeEnd <= 0 || sourceBuffer.updating) return;

  await new Promise((resolve, reject) => {
    sourceBuffer.addEventListener("updateend", resolve, { once: true });
    sourceBuffer.addEventListener("error", reject, { once: true });
    sourceBuffer.remove(0, removeEnd);
  });
}

function isNearLiveEdge404(error, number, newest) {
  return error.status === 404 && number >= newest - 1;
}

function parseDuration(value) {
  const match = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?/.exec(value ?? "");
  if (!match) return 0;
  return Number(match[1] ?? 0) * 3600 + Number(match[2] ?? 0) * 60 + Number(match[3] ?? 0);
}
