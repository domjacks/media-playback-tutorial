export async function loadDashVod(mpdUrl) {
  const xml = await fetchText(mpdUrl);
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  const adaptation = [...doc.querySelectorAll("AdaptationSet")]
    .find((node) => node.getAttribute("mimeType") === "video/mp4" || node.getAttribute("contentType") === "video");
  if (!adaptation) throw new Error("No video AdaptationSet found");

  const representation = adaptation.querySelector("Representation");
  const template = representation.querySelector("SegmentTemplate") ?? adaptation.querySelector("SegmentTemplate");
  if (!representation || !template) throw new Error("This tutorial parser needs Representation + SegmentTemplate");

  const base = doc.querySelector("BaseURL")?.textContent?.trim() ?? "";
  const timescale = Number(template.getAttribute("timescale") ?? 1);
  const duration = Number(template.getAttribute("duration"));
  const startNumber = Number(template.getAttribute("startNumber") ?? 1);
  const presentationSeconds = parseIsoDuration(doc.documentElement.getAttribute("mediaPresentationDuration"));
  const segmentSeconds = duration / timescale;
  const segmentCount = Math.ceil(presentationSeconds / segmentSeconds);
  const codecs = [adaptation.getAttribute("codecs"), representation.getAttribute("codecs")]
    .filter(Boolean)
    .join(", ");

  return {
    mime: `${adaptation.getAttribute("mimeType")}; codecs="${codecs}"`,
    init: resolve(template.getAttribute("initialization"), mpdUrl, base, representation.id),
    segments: Array.from({ length: segmentCount }, (_, index) => {
      const number = startNumber + index;
      return resolve(template.getAttribute("media"), mpdUrl, base, representation.id, number);
    })
  };
}

function resolve(pattern, mpdUrl, base, id, number = "") {
  const path = pattern.replace("$RepresentationID$", id).replace("$Number$", number);
  return new URL(base + path, mpdUrl).href;
}

async function fetchText(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch ${url}`);
  return response.text();
}

function parseIsoDuration(value) {
  const match = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?/.exec(value ?? "");
  if (!match) return 0;
  return Number(match[1] ?? 0) * 3600 + Number(match[2] ?? 0) * 60 + Number(match[3] ?? 0);
}
