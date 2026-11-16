import { parseLiveTiming } from "./live.js";

// Minimal live MPD reader: one Period, one audio and one video AdaptationSet,
// SegmentTemplate with $Number$ addressing, no SegmentTimeline.
export async function loadLiveMpd(mpdUrl) {
  const response = await fetch(mpdUrl, { cache: "no-store" });
  if (!response.ok) throw new Error(`Failed to fetch ${mpdUrl}`);
  const doc = new DOMParser().parseFromString(await response.text(), "application/xml");
  if (doc.documentElement.getAttribute("type") !== "dynamic") throw new Error("Expected a live (type=dynamic) MPD");

  const baseUrl = response.url;
  const parsed = ["audio", "video"].map((kind) => parseTrack(doc, kind, baseUrl));
  const timing = parseLiveTiming(doc, parsed[0].template);
  const utcTiming = doc.querySelector("UTCTiming");

  return {
    timing,
    tracks: parsed.map((entry) => entry.track),
    utcTimingUrl: /utc:http-(xsdate|iso)/.test(utcTiming?.getAttribute("schemeIdUri") ?? "")
      ? utcTiming.getAttribute("value")
      : null
  };
}

function parseTrack(doc, kind, baseUrl) {
  const adaptation = [...doc.querySelectorAll("AdaptationSet")]
    .find((set) => set.getAttribute("contentType") === kind || set.getAttribute("mimeType")?.startsWith(`${kind}/`));
  if (!adaptation) throw new Error(`No ${kind} AdaptationSet`);

  const representation = adaptation.querySelector(":scope > Representation"); // first Representation only
  const template = representation.querySelector(":scope > SegmentTemplate") ?? adaptation.querySelector(":scope > SegmentTemplate");
  const mimeType = representation.getAttribute("mimeType") ?? adaptation.getAttribute("mimeType");
  const codecs = representation.getAttribute("codecs") ?? adaptation.getAttribute("codecs");

  return {
    template,
    track: {
      kind,
      mime: `${mimeType}; codecs="${codecs}"`,
      initUrl: new URL(format(template.getAttribute("initialization"), representation.id), baseUrl).href,
      segmentUrl: (number) => new URL(format(template.getAttribute("media"), representation.id, number), baseUrl).href
    }
  };
}

function format(pattern, id, number = "") {
  return pattern
    .replaceAll("$RepresentationID$", id)
    .replace(/\$Number%0(\d+)d\$/g, (_, width) => String(number).padStart(Number(width), "0"))
    .replaceAll("$Number$", number);
}
