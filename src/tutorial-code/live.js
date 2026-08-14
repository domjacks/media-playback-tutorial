export function createLiveController({ refreshManifest, appendSegment, targetLatencySegments = 3 }) {
  const appended = new Set();
  let timer = 0;

  async function tick() {
    const manifest = await refreshManifest();
    const newest = manifest.lastSegmentNumber;
    const firstWanted = Math.max(manifest.firstSegmentNumber, newest - targetLatencySegments);

    for (let number = firstWanted; number <= newest; number += 1) {
      if (!appended.has(number)) {
        appended.add(number);
        await appendSegment(manifest.segmentUrl(number));
      }
    }

    timer = setTimeout(tick, manifest.minimumUpdatePeriodMs);
  }

  return {
    start: tick,
    stop: () => clearTimeout(timer)
  };
}
