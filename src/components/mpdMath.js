// Pure SegmentTemplate maths for the MpdExplorer lesson component.
// Mirrors formatTemplate()/segment maths in src/lib/dashVod.js, extended with
// $Bandwidth$ and $$ escaping.

export function formatTemplate(pattern, { id = "", number = "", bandwidth = "" } = {}) {
  return pattern.replace(/\$\$|\$(RepresentationID|Number|Bandwidth)(?:%0(\d+)d)?\$/g, (match, name, width) => {
    if (match === "$$") return "$";
    if (name === "RepresentationID") return width === undefined ? String(id) : match;
    const value = name === "Number" ? number : bandwidth;
    return width === undefined ? String(value) : String(value).padStart(Number(width), "0");
  });
}

export function resolveUrl(path, base) {
  try {
    return new URL(path, base || undefined).href;
  } catch {
    return `${base}${path}`;
  }
}

export function computeSegments({
  media,
  initialization,
  representationId,
  bandwidth = 0,
  baseUrl,
  timescale,
  duration,
  startNumber,
  presentationSeconds
}) {
  const segmentSeconds = timescale > 0 ? duration / timescale : 0;
  const valid = segmentSeconds > 0 && presentationSeconds > 0;
  const count = valid ? Math.ceil(presentationSeconds / segmentSeconds - 1e-9) : 0;
  const make = (index) => {
    const number = startNumber + index;
    return {
      number,
      start: index * segmentSeconds,
      end: Math.min((index + 1) * segmentSeconds, presentationSeconds),
      url: resolveUrl(formatTemplate(media, { id: representationId, number, bandwidth }), baseUrl)
    };
  };
  const indexes = count <= 7
    ? Array.from({ length: count }, (_, index) => index)
    : [0, 1, 2, 3, 4, count - 2, count - 1];
  return {
    segmentSeconds,
    count,
    init: resolveUrl(formatTemplate(initialization, { id: representationId, bandwidth }), baseUrl),
    rows: indexes.map(make),
    skipped: count > 7 ? count - 7 : 0
  };
}
