// Pure helpers for region markers. Used by both the browser and node scripts.
// Markers: `// #region x`, `/* #region x */`, `<!-- #region x -->`, `# #region x`,
// and the matching `#endregion` forms. Region names match [a-z0-9-]+.

const markerPattern = /^(?:\/\/|#|<!--|\/\*)\s*#(region|endregion)(?:\s+([a-z0-9-]+))?\s*(?:-->|\*\/)?$/;

function parseMarker(line) {
  const match = markerPattern.exec(line.trim());
  if (!match) return null;
  return { kind: match[1], name: match[2] ?? null };
}

export function isMarkerLine(line) {
  return parseMarker(line) !== null;
}

function splitLines(source) {
  return source.replace(/\r\n?/g, "\n").split("\n");
}

function dedent(lines) {
  let min = Infinity;
  for (const line of lines) {
    if (!line.trim()) continue;
    const indent = /^[ \t]*/.exec(line)[0].length;
    if (indent < min) min = indent;
  }
  if (!Number.isFinite(min) || min === 0) return lines;
  return lines.map((line) => line.slice(Math.min(min, /^[ \t]*/.exec(line)[0].length)));
}

function trimBlank(lines) {
  let start = 0;
  let end = lines.length;
  while (start < end && !lines[start].trim()) start += 1;
  while (end > start && !lines[end - 1].trim()) end -= 1;
  return lines.slice(start, end);
}

function finish(lines) {
  return trimBlank(dedent(lines.filter((line) => !isMarkerLine(line)))).join("\n");
}

export function stripMarkers(source) {
  return trimBlank(splitLines(source).filter((line) => !isMarkerLine(line))).join("\n");
}

export function listRegions(source) {
  const names = [];
  for (const line of splitLines(source)) {
    const marker = parseMarker(line);
    if (marker?.kind === "region" && marker.name && !names.includes(marker.name)) names.push(marker.name);
  }
  return names;
}

export function extractRegion(source, region) {
  const lines = splitLines(source);
  const start = lines.findIndex((line) => {
    const marker = parseMarker(line);
    return marker?.kind === "region" && marker.name === region;
  });
  if (start === -1) throw new Error(`Region "${region}" not found`);

  let depth = 1;
  for (let i = start + 1; i < lines.length; i += 1) {
    const marker = parseMarker(lines[i]);
    if (!marker) continue;
    if (marker.kind === "region") depth += 1;
    else depth -= 1;
    if (depth === 0) return finish(lines.slice(start + 1, i));
  }
  throw new Error(`Region "${region}" has no matching #endregion`);
}
