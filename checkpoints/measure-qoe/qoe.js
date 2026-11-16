// Client-side QoE measurement: startup, rebuffering, switching, bitrate, dropped frames, throughput.

// #region qoe-recorder
export function createQoeRecorder(video) {
  const startedAt = performance.now(); // session start: the player has been created
  const state = {
    startupMs: null,
    stalls: [], // { atMs, durationMs } for each rebuffer
    switches: [], // { atMs, from, to } bitrate in kbps
    segments: [] // { start, end, kbps }: every video segment we queued, in media time
  };
  let stallStart = null;
  let seeking = false;

  // First rendered frame: requestVideoFrameCallback fires when a frame is presented to the compositor.
  if ("requestVideoFrameCallback" in video) {
    video.requestVideoFrameCallback(() => {
      state.startupMs ??= performance.now() - startedAt;
    });
  } else {
    video.addEventListener("playing", () => { state.startupMs ??= performance.now() - startedAt; }, { once: true });
  }

  // A stall is waiting -> playing while NOT seeking. Waiting also fires after a seek and during startup.
  video.addEventListener("seeking", () => { seeking = true; stallStart = null; });
  video.addEventListener("seeked", () => { seeking = false; });
  video.addEventListener("waiting", () => {
    if (state.startupMs === null || seeking || video.seeking) return; // startup and seeks are not rebuffers
    stallStart ??= performance.now();
  });
  video.addEventListener("playing", () => {
    if (stallStart === null) return;
    state.stalls.push({ atMs: stallStart - startedAt, durationMs: performance.now() - stallStart });
    stallStart = null;
  });

  return {
    state,
    // Call once per video segment, in order, with the Representation's declared bandwidth.
    recordSegment(start, end, bandwidthBps) {
      const kbps = bandwidthBps / 1000;
      const last = state.segments.at(-1);
      if (last && last.kbps !== kbps) state.switches.push({ atMs: performance.now() - startedAt, from: last.kbps, to: kbps });
      state.segments.push({ start, end, kbps });
    },
    // Rebuffering time includes a stall that is still in progress.
    rebufferMs() {
      const done = state.stalls.reduce((sum, stall) => sum + stall.durationMs, 0);
      return done + (stallStart === null ? 0 : performance.now() - stallStart);
    },
    snapshot() {
      return snapshotMetrics(state, video, stallStart === null ? 0 : performance.now() - stallStart, performance.now() - startedAt);
    }
  };
}
// #endregion qoe-recorder

// #region qoe-metrics
// Pure derivations from the recorded state, so they can be unit tested without a browser.
export function weightedAverageKbps(segments, playhead) {
  let weighted = 0;
  let played = 0;
  for (const segment of segments) {
    const seconds = Math.max(0, Math.min(segment.end, playhead) - segment.start); // only media actually played
    weighted += segment.kbps * seconds;
    played += seconds;
  }
  return played ? weighted / played : 0;
}

// Oscillation: a switch that reverses the direction of the previous switch (up then down, or down then up).
export function countReversals(switches) {
  let reversals = 0;
  for (let i = 1; i < switches.length; i += 1) {
    const previousUp = switches[i - 1].to > switches[i - 1].from;
    const currentUp = switches[i].to > switches[i].from;
    if (previousUp !== currentUp) reversals += 1;
  }
  return reversals;
}

export function snapshotMetrics(state, video, openStallMs = 0, sessionMs = 0) {
  const quality = video.getVideoPlaybackQuality?.() ?? { droppedVideoFrames: 0, totalVideoFrames: 0 };
  const stallMs = state.stalls.reduce((sum, stall) => sum + stall.durationMs, 0) + openStallMs;
  const playedMs = Math.max(video.currentTime * 1000, 1);

  return {
    startupMs: state.startupMs,
    rebufferCount: state.stalls.length + (openStallMs ? 1 : 0),
    rebufferMs: stallMs,
    rebufferRatio: stallMs / (playedMs + stallMs), // stalled time as a share of (playing + stalled) time
    switchCount: state.switches.length,
    oscillations: countReversals(state.switches),
    averageKbps: weightedAverageKbps(state.segments, video.currentTime),
    droppedFrames: quality.droppedVideoFrames,
    totalFrames: quality.totalVideoFrames,
    sessionMs
  };
}
// #endregion qoe-metrics

// #region request-timing
// Throughput of one request from the Resource Timing API. Cross-origin responses only expose sizes
// and detailed timings when the server sends Timing-Allow-Origin; otherwise they read as 0.
export async function readResourceTiming(url) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const entry = performance.getEntriesByName(url, "resource").at(-1);
    if (entry) return entry;
    await new Promise((resolve) => setTimeout(resolve, 0)); // the entry is queued just after the body ends
  }
  return null;
}

export function describeTiming(entry, bodyBytes, wallMs) {
  const visible = entry && (entry.transferSize > 0 || entry.responseStart > 0); // TAO present (or same origin)
  if (!visible) {
    // No Timing-Allow-Origin: the browser hides sizes and phases. Fall back to the wall-clock time of fetch().
    return { source: "fetch-fallback", bytes: bodyBytes, ms: wallMs, ttfbMs: null, kbps: (bodyBytes * 8) / wallMs };
  }
  const transferMs = Math.max(entry.responseEnd - entry.responseStart, 1); // body time only: excludes DNS, TLS and waiting
  return {
    source: "resource-timing",
    bytes: entry.encodedBodySize || bodyBytes,
    ms: entry.duration,
    ttfbMs: entry.responseStart - entry.requestStart,
    kbps: ((entry.encodedBodySize || bodyBytes) * 8) / transferMs
  };
}

export async function timedFetch(url) {
  const startedAt = performance.now();
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);
  const bytes = await response.arrayBuffer();
  const wallMs = Math.max(performance.now() - startedAt, 1);
  const timing = describeTiming(await readResourceTiming(url), bytes.byteLength, wallMs);
  return { bytes, timing };
}
// #endregion request-timing
