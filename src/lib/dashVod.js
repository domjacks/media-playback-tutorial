export async function loadDashVod(mpdUrl, options = {}) {
  const { xml, finalUrl } = await fetchMpd(mpdUrl);
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  const parseError = doc.querySelector("parsererror");
  if (parseError) throw new Error("The MPD could not be parsed as XML.");

  const videoAdaptation = findAdaptation(doc, "video/mp4", "video");
  const audioAdaptation = findAdaptation(doc, "audio/mp4", "audio");
  if (!videoAdaptation) throw new Error("No MP4 video AdaptationSet was found in the MPD.");
  if (!audioAdaptation) throw new Error("No MP4 audio AdaptationSet was found in the MPD.");

  const videoRepresentations = parseAdaptation(videoAdaptation, doc, finalUrl);
  const audioRepresentations = parseAdaptation(audioAdaptation, doc, finalUrl);
  const video = chooseRepresentation(videoRepresentations, options);
  const audio = chooseAudioRepresentation(audioRepresentations);

  return {
    mpdUrl: finalUrl,
    video,
    audio,
    tracks: { video, audio },
    representations: {
      video: videoRepresentations,
      audio: audioRepresentations
    }
  };
}

export function chooseRepresentation(representations, { throughputBps = estimateInitialThroughput(), bufferSeconds = 0 } = {}) {
  const playable = representations
    .filter((representation) => canPlay(representation.mime))
    .sort((a, b) => a.bandwidth - b.bandwidth);
  const sorted = playable.length ? playable : [...representations].sort((a, b) => a.bandwidth - b.bandwidth);
  const safety = bufferSeconds > 12 ? 0.85 : bufferSeconds > 6 ? 0.75 : 0.6;
  const budget = throughputBps * safety;

  return sorted.filter((representation) => representation.bandwidth <= budget).at(-1) ?? sorted[0];
}

export function chooseAudioRepresentation(representations) {
  const playable = representations
    .filter((representation) => canPlay(representation.mime))
    .sort((a, b) => a.bandwidth - b.bandwidth);
  const sorted = playable.length ? playable : [...representations].sort((a, b) => a.bandwidth - b.bandwidth);
  return sorted.at(-1) ?? sorted[0];
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

function parseAdaptation(adaptation, doc, mpdUrl) {
  const representationNodes = [...adaptation.querySelectorAll("Representation")];
  const template = representationNodes[0]?.querySelector("SegmentTemplate") ?? adaptation.querySelector("SegmentTemplate");
  if (!representationNodes.length || !template) {
    throw new Error("This tutorial parser needs Representation and SegmentTemplate.");
  }

  const base = resolveBaseUrl(doc, adaptation, mpdUrl);
  const timescale = Number(template.getAttribute("timescale") ?? 1);
  const duration = Number(template.getAttribute("duration"));
  const startNumber = Number(template.getAttribute("startNumber") ?? 1);
  const presentationSeconds = parseIsoDuration(doc.documentElement.getAttribute("mediaPresentationDuration"));
  const segmentSeconds = duration / timescale;
  const segmentCount = Math.min(36, Math.ceil(presentationSeconds / segmentSeconds));
  const mimeType = adaptation.getAttribute("mimeType");

  return representationNodes.map((representation) => {
    const codecs = [adaptation.getAttribute("codecs"), representation.getAttribute("codecs")]
      .filter(Boolean)
      .join(", ");

    return {
      id: representation.id,
      mime: `${mimeType}; codecs="${codecs}"`,
      bandwidth: Number(representation.getAttribute("bandwidth") ?? 0),
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
  return new URL(mpdBase + adaptationBase, mpdUrl).href;
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

function canPlay(mime) {
  return typeof MediaSource === "undefined" || MediaSource.isTypeSupported(mime);
}

function parseIsoDuration(value) {
  const match = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?/.exec(value ?? "");
  if (!match) return 0;
  return Number(match[1] ?? 0) * 3600 + Number(match[2] ?? 0) * 60 + Number(match[3] ?? 0);
}
