// #region expose-representations
function parseAdaptation(adaptation, doc, mpdUrl) {
  const adaptationTemplate = adaptation.querySelector(":scope > SegmentTemplate");
  const baseUrl = resolveBaseUrl(doc, adaptation, mpdUrl);
  const totalSeconds = parseIsoDuration(doc.documentElement.getAttribute("mediaPresentationDuration"));

  return [...adaptation.querySelectorAll(":scope > Representation")].map((representation) => {
    const template = representation.querySelector(":scope > SegmentTemplate") ?? adaptationTemplate;
    const timescale = Number(template.getAttribute("timescale") ?? 1);
    const duration = Number(template.getAttribute("duration"));
    const startNumber = Number(template.getAttribute("startNumber") ?? 1);
    const segmentSeconds = duration / timescale;
    const segmentCount = Math.ceil(totalSeconds / segmentSeconds); // BBB: 150, the last one short

    const mimeType = representation.getAttribute("mimeType") ?? adaptation.getAttribute("mimeType");
    const codecs = representation.getAttribute("codecs") ?? adaptation.getAttribute("codecs");

    return {
      id: representation.id,
      bandwidth: Number(representation.getAttribute("bandwidth") ?? 0),
      mimeType,
      codecs,
      segmentSeconds,
      mime: codecs ? `${mimeType}; codecs="${codecs}"` : mimeType,
      init: new URL(format(template.getAttribute("initialization"), representation.id), baseUrl).href,
      segments: Array.from({ length: segmentCount }, (_, index) => {
        const number = startNumber + index;
        return {
          number,
          start: index * segmentSeconds,
          end: Math.min((index + 1) * segmentSeconds, totalSeconds),
          url: new URL(format(template.getAttribute("media"), representation.id, number), baseUrl).href
        };
      })
    };
  });
}

export async function loadDashVod(mpdUrl, options = {}) {
  const response = await fetch(mpdUrl);
  if (!response.ok) throw new Error(`Failed to fetch ${mpdUrl}`);
  const doc = new DOMParser().parseFromString(await response.text(), "application/xml");
  const video = parseAdaptation(findAdaptation(doc, "video/mp4", "video"), doc, response.url);
  const audio = parseAdaptation(findAdaptation(doc, "audio/mp4", "audio"), doc, response.url);

  return {
    duration: parseIsoDuration(doc.documentElement.getAttribute("mediaPresentationDuration")),
    video: chooseRepresentation(video, options), // startup choice, defined below
    audio: chooseHighest(audio),
    representations: { video, audio }
  };
}
// #endregion expose-representations

function findAdaptation(doc, mimeType, contentType) {
  return [...doc.querySelectorAll("AdaptationSet")]
    .find((set) => set.getAttribute("mimeType") === mimeType || set.getAttribute("contentType") === contentType);
}

// BaseURL is optional at both the MPD and AdaptationSet level.
function resolveBaseUrl(doc, adaptation, mpdUrl) {
  const mpdBase = doc.documentElement.querySelector(":scope > BaseURL")?.textContent.trim() ?? "";
  const adaptationBase = adaptation.querySelector(":scope > BaseURL")?.textContent.trim() ?? "";
  return new URL(adaptationBase, new URL(mpdBase, mpdUrl)).href;
}

function format(pattern, id, number = "") {
  return pattern
    .replaceAll("$RepresentationID$", id)
    .replace(/\$Number%0(\d+)d\$/g, (_, width) => String(number).padStart(Number(width), "0"))
    .replaceAll("$Number$", number);
}

function chooseHighest(representations) {
  return [...representations].sort((a, b) => a.bandwidth - b.bandwidth).at(-1);
}

function parseIsoDuration(value) {
  const match = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?/.exec(value ?? "");
  if (!match) return 0;
  return Number(match[1] ?? 0) * 3600 + Number(match[2] ?? 0) * 60 + Number(match[3] ?? 0);
}

export function estimateInitialThroughput() {
  const downlinkMbps = navigator.connection?.downlink;
  return downlinkMbps ? downlinkMbps * 1_000_000 : 2_500_000;
}

export function chooseRepresentation(representations, { throughputBps = estimateInitialThroughput(), bufferSeconds = 0 } = {}) {
  const playable = representations.filter((rep) => MediaSource.isTypeSupported(rep.mime));
  const sorted = [...(playable.length ? playable : representations)].sort((a, b) => a.bandwidth - b.bandwidth);
  const safety = bufferSeconds > 12 ? 0.85 : bufferSeconds > 6 ? 0.75 : 0.6;
  const budget = throughputBps * safety;

  return sorted.filter((rep) => rep.bandwidth <= budget).at(-1) ?? sorted[0];
}

export async function measureFetch(url, { signal } = {}) {
  const startedAt = performance.now();
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error(`Failed to fetch ${url}`);
  const bytes = await response.arrayBuffer();
  const seconds = Math.max((performance.now() - startedAt) / 1000, 0.001);

  return {
    bytes,
    throughputBps: (bytes.byteLength * 8) / seconds
  };
}

export function createEwma(initialEstimate, weight = 0.35) {
  let estimate = initialEstimate;

  return {
    sample(value) {
      estimate = estimate * (1 - weight) + value * weight;
      return estimate;
    },
    value() {
      return estimate;
    }
  };
}

// A switch is safe when the container type matches and either the codec strings are
// identical or the browser can reconfigure the SourceBuffer with changeType().
export function canSwitchTo(current, next) {
  return current.mimeType === next.mimeType && (
    current.codecs === next.codecs ||
    (typeof SourceBuffer !== "undefined" && "changeType" in SourceBuffer.prototype)
  );
}

export function chooseRuntimeRepresentation(representations, current, state) {
  const sorted = representations
    .filter((rep) => rep.id === current.id || canSwitchTo(current, rep))
    .sort((a, b) => a.bandwidth - b.bandwidth);
  const bufferSeconds = state.bufferSeconds;
  const budget = state.throughputBps * (bufferSeconds < 6 ? 0.55 : bufferSeconds < 14 ? 0.7 : 0.85);
  const affordable = sorted.filter((rep) => rep.bandwidth <= budget);
  const candidate = affordable.at(-1) ?? sorted[0];

  if (candidate.bandwidth < current.bandwidth) {
    return candidate; // switch down immediately
  }

  const currentIndex = sorted.findIndex((rep) => rep.id === current.id);
  const candidateIndex = sorted.findIndex((rep) => rep.id === candidate.id);
  const maxStepUp = sorted[Math.min(currentIndex + 1, sorted.length - 1)];

  return candidateIndex > currentIndex ? maxStepUp : current;
}
