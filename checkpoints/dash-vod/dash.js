// ~2.3 minutes of BBB (36 x 3.84 s); keeps memory bounded until buffer management is added.
const TUTORIAL_SEGMENT_LIMIT = 36;

export async function loadDashVod(mpdUrl) {
  const response = await fetch(mpdUrl);
  if (!response.ok) throw new Error(`Failed to fetch ${mpdUrl}`);
  const xml = await response.text();
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  const videoSet = findAdaptation(doc, "video/mp4", "video");
  const audioSet = findAdaptation(doc, "audio/mp4", "audio");
  const video = parseAdaptation(videoSet, doc, response.url);
  const audio = parseAdaptation(audioSet, doc, response.url);

  return {
    video: chooseLowest(video),
    audio: chooseHighest(audio),
    representations: { video, audio }
  };
}

function findAdaptation(doc, mimeType, contentType) {
  return [...doc.querySelectorAll("AdaptationSet")]
    .find((set) => set.getAttribute("mimeType") === mimeType || set.getAttribute("contentType") === contentType);
}

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
    const segmentCount = Math.min(TUTORIAL_SEGMENT_LIMIT, Math.ceil(totalSeconds / segmentSeconds));

    // A Representation attribute overrides the AdaptationSet attribute; never join them.
    const mimeType = representation.getAttribute("mimeType") ?? adaptation.getAttribute("mimeType");
    const codecs = representation.getAttribute("codecs") ?? adaptation.getAttribute("codecs");

    return {
      id: representation.id,
      bandwidth: Number(representation.getAttribute("bandwidth") ?? 0),
      mimeType,
      codecs,
      mime: codecs ? `${mimeType}; codecs="${codecs}"` : mimeType,
      init: new URL(format(template.getAttribute("initialization"), representation.id), baseUrl).href,
      segments: Array.from({ length: segmentCount }, (_, index) => {
        const number = startNumber + index;
        return {
          number,
          url: new URL(format(template.getAttribute("media"), representation.id, number), baseUrl).href
        };
      })
    };
  });
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

function chooseLowest(representations) {
  return [...representations].sort((a, b) => a.bandwidth - b.bandwidth)[0];
}

function chooseHighest(representations) {
  return [...representations].sort((a, b) => a.bandwidth - b.bandwidth).at(-1);
}

function parseIsoDuration(value) {
  const match = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?/.exec(value ?? "");
  if (!match) return 0;
  return Number(match[1] ?? 0) * 3600 + Number(match[2] ?? 0) * 60 + Number(match[3] ?? 0);
}
