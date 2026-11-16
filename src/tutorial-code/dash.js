export async function loadDashVod(mpdUrl, options = {}) {
  const { xml, finalUrl } = await fetchMpd(mpdUrl);
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  const videoAdaptation = findAdaptation(doc, "video/mp4", "video");
  const audioAdaptation = findAdaptation(doc, "audio/mp4", "audio");
  if (!videoAdaptation || !audioAdaptation) throw new Error("This tutorial needs MP4 video and audio AdaptationSets");

  const videoRepresentations = parseAdaptation(videoAdaptation, doc, finalUrl);
  const audioRepresentations = parseAdaptation(audioAdaptation, doc, finalUrl);
  const video = chooseRepresentation(videoRepresentations, options);
  const audio = chooseAudioRepresentation(audioRepresentations);

  return {
    mpdUrl: finalUrl,
    video,
    audio,
    representations: {
      video: videoRepresentations,
      audio: audioRepresentations
    }
  };
}

export function chooseRepresentation(representations, { throughputBps = estimateInitialThroughput(), bufferSeconds = 0 } = {}) {
  const playable = representations
    .filter((representation) => typeof MediaSource !== "undefined" && MediaSource.isTypeSupported(representation.mime))
    .sort((a, b) => a.bandwidth - b.bandwidth);
  const sorted = playable.length ? playable : [...representations].sort((a, b) => a.bandwidth - b.bandwidth);
  const safety = bufferSeconds > 12 ? 0.85 : bufferSeconds > 6 ? 0.75 : 0.6;
  const budget = throughputBps * safety;
  return sorted.filter((representation) => representation.bandwidth <= budget).at(-1) ?? sorted[0];
}

export function chooseAudioRepresentation(representations) {
  const playable = representations
    .filter((representation) => typeof MediaSource !== "undefined" && MediaSource.isTypeSupported(representation.mime))
    .sort((a, b) => a.bandwidth - b.bandwidth);
  const sorted = playable.length ? playable : [...representations].sort((a, b) => a.bandwidth - b.bandwidth);
  return sorted.at(-1) ?? sorted[0];
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
  const candidate = sorted.filter((rep) => rep.bandwidth <= budget).at(-1) ?? sorted[0];

  if (candidate.bandwidth < current.bandwidth) {
    return candidate; // switch down immediately
  }

  const currentIndex = sorted.findIndex((rep) => rep.id === current.id);
  const candidateIndex = sorted.findIndex((rep) => rep.id === candidate.id);
  const maxStepUp = sorted[Math.min(currentIndex + 1, sorted.length - 1)];

  return candidateIndex > currentIndex ? maxStepUp : current;
}

export function estimateInitialThroughput() {
  return navigator.connection?.downlink ? navigator.connection.downlink * 1_000_000 : 2_500_000;
}

export async function measureFetch(url) {
  const startedAt = performance.now();
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch ${url}`);
  const bytes = await response.arrayBuffer();
  const seconds = Math.max((performance.now() - startedAt) / 1000, 0.001);
  return {
    bytes,
    throughputBps: (bytes.byteLength * 8) / seconds
  };
}

async function fetchMpd(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch ${url}`);
  return {
    xml: await response.text(),
    finalUrl: response.url
  };
}

function findAdaptation(doc, mimeType, contentType) {
  return [...doc.querySelectorAll("AdaptationSet")]
    .find((node) => node.getAttribute("mimeType") === mimeType || node.getAttribute("contentType") === contentType);
}

// ~2.3 minutes of BBB (36 x 3.84 s); keeps memory bounded until buffer management is added.
const TUTORIAL_SEGMENT_LIMIT = 36;

function parseAdaptation(adaptation, doc, mpdUrl) {
  const adaptationTemplate = adaptation.querySelector(":scope > SegmentTemplate");
  const base = resolveBaseUrl(doc, adaptation, mpdUrl);
  const presentationSeconds = parseIsoDuration(doc.documentElement.getAttribute("mediaPresentationDuration"));

  return [...adaptation.querySelectorAll(":scope > Representation")].map((representation) => {
    const template = representation.querySelector(":scope > SegmentTemplate") ?? adaptationTemplate;
    if (!template) throw new Error(`Representation ${representation.id} has no SegmentTemplate`);

    const timescale = Number(template.getAttribute("timescale") ?? 1);
    const duration = Number(template.getAttribute("duration"));
    const startNumber = Number(template.getAttribute("startNumber") ?? 1);
    const segmentSeconds = duration / timescale;
    const segmentCount = Math.min(TUTORIAL_SEGMENT_LIMIT, Math.ceil(presentationSeconds / segmentSeconds));

    // A Representation attribute overrides the AdaptationSet attribute; the two are never joined.
    const mimeType = representation.getAttribute("mimeType") ?? adaptation.getAttribute("mimeType");
    const codecs = representation.getAttribute("codecs") ?? adaptation.getAttribute("codecs");

    return {
      id: representation.id,
      bandwidth: Number(representation.getAttribute("bandwidth") ?? 0),
      mimeType,
      codecs,
      mime: codecs ? `${mimeType}; codecs="${codecs}"` : mimeType,
      init: resolveUrl(formatTemplate(template.getAttribute("initialization"), representation.id), base),
      segments: Array.from({ length: segmentCount }, (_, index) => {
        const number = startNumber + index;
        return {
          number,
          start: index * segmentSeconds,
          end: (index + 1) * segmentSeconds,
          url: resolveUrl(formatTemplate(template.getAttribute("media"), representation.id, number), base)
        };
      })
    };
  });
}

function resolveBaseUrl(doc, adaptation, mpdUrl) {
  const mpdBase = doc.documentElement.querySelector(":scope > BaseURL")?.textContent?.trim() ?? "";
  const adaptationBase = adaptation.querySelector(":scope > BaseURL")?.textContent?.trim() ?? "";
  return new URL(adaptationBase, new URL(mpdBase, mpdUrl)).href;
}

function formatTemplate(pattern, id, number = "") {
  return pattern
    .replaceAll("$RepresentationID$", id)
    .replace(/\$Number%0(\d+)d\$/g, (_, width) => String(number).padStart(Number(width), "0"))
    .replaceAll("$Number$", number);
}

function resolveUrl(path, base) {
  return new URL(path, base).href;
}

function parseIsoDuration(value) {
  const match = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?/.exec(value ?? "");
  if (!match) return 0;
  return Number(match[1] ?? 0) * 3600 + Number(match[2] ?? 0) * 60 + Number(match[3] ?? 0);
}
