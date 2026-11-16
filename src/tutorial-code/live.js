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
  const targetLatency = timing.suggestedPresentationDelay || timing.segmentDuration * 3;
  const targetPlaybackTime = Math.max(0, livePresentationTime - targetLatency);
  const windowDepth = timing.timeShiftBufferDepth || timing.segmentDuration * 12;

  const newest = timing.startNumber + Math.floor(targetPlaybackTime / timing.segmentDuration);
  const first = Math.max(
    timing.startNumber,
    newest - Math.floor(windowDepth / timing.segmentDuration)
  );

  return { first, newest, targetPlaybackTime, livePresentationTime };
}

export function createLiveController({ refreshManifest, appendSegment, segmentUrl, retryDelayMs = 750 }) {
  const appended = new Set();
  let timer = 0;

  return {
    async start() {
      await tick();
    },
    stop: () => clearTimeout(timer)
  };

  async function tick() {
    const { timing } = await refreshManifest();
    const range = getLiveSegmentRange(timing);

    for (let number = range.first; number <= range.newest; number += 1) {
      if (appended.has(number)) continue;

      try {
        await appendSegment(segmentUrl(number));
        appended.add(number);
      } catch (error) {
        if (isNearLiveEdge404(error, number, range.newest)) {
          await delay(retryDelayMs);
          break;
        }
        throw error;
      }
    }

    timer = setTimeout(tick, Math.max(timing.minimumUpdatePeriodMs || 1000, 500));
  }
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

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseDuration(value) {
  const match = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?/.exec(value ?? "");
  if (!match) return 0;
  return Number(match[1] ?? 0) * 3600 + Number(match[2] ?? 0) * 60 + Number(match[3] ?? 0);
}
