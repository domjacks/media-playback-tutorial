// Progressive delivery of one CMAF segment: read the response body as it arrives and hand out
// complete moof+mdat fragments, however the network happened to slice the bytes.

// #region box-splitter
// Feed arbitrary byte chunks in; get back complete ISO-BMFF "units" out.
// A unit is [any leading boxes such as styp or prft] + moof + mdat, which is one CMAF chunk.
export function createBoxSplitter() {
  let pending = new Uint8Array(0); // bytes received but not yet part of a complete box
  let unitParts = []; // complete boxes waiting for their mdat
  let unitTypes = [];

  return {
    push(chunk) {
      pending = concat(pending, chunk);
      const units = [];

      for (;;) {
        const box = readBoxHeader(pending);
        if (!box || pending.length < box.size) break; // header or body still incomplete: wait for more bytes

        unitParts.push(pending.subarray(0, box.size));
        unitTypes.push(box.type);
        pending = pending.subarray(box.size);

        if (box.type === "mdat") { // mdat closes a CMAF chunk
          units.push({ bytes: concat(...unitParts), boxes: unitTypes });
          unitParts = [];
          unitTypes = [];
        }
      }
      return units;
    },
    // Call when the response ends: leftovers mean the segment was truncated.
    finish() {
      if (pending.length || unitParts.length) {
        throw new Error(`Truncated segment: ${pending.length} stray bytes, boxes waiting for mdat: ${unitTypes.join(",") || "none"}`);
      }
    }
  };
}

// Returns { type, size } once the 8 (or 16) header bytes are present, otherwise null.
export function readBoxHeader(bytes) {
  if (bytes.length < 8) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let size = view.getUint32(0);
  const type = String.fromCharCode(...bytes.subarray(4, 8));

  if (size === 1) { // 64-bit "largesize" follows the type
    if (bytes.length < 16) return null;
    size = Number(view.getBigUint64(8));
  } else if (size === 0) {
    throw new Error(`Box ${type} extends to end of file, which a live chunk cannot do`);
  }
  if (size < 8) throw new Error(`Invalid box size ${size} for ${type}`);
  return { type, size };
}

function concat(...parts) {
  if (parts.length === 1) return parts[0];
  const out = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}
// #endregion box-splitter

// #region stream-segment
// Fetch one (possibly still being produced) segment. onUnit is awaited for each complete chunk,
// so a slow SourceBuffer applies back-pressure to the network read. Returns null when the
// segment is not available yet (404, or 425 Too Early from livesim2) so the caller can retry.
export async function streamSegment(url, onUnit, { signal } = {}) {
  const requestedAt = performance.now();
  const response = await fetch(url, { signal });
  if (response.status === 404 || response.status === 425) return null;
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);

  const splitter = createBoxSplitter();
  const reader = response.body.getReader(); // delivers bytes as the server flushes them, not at the end
  const arrivals = []; // one entry per complete moof+mdat: when it was complete, and how big

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    for (const unit of splitter.push(value)) {
      arrivals.push({ atMs: performance.now() - requestedAt, bytes: unit.bytes.length, boxes: unit.boxes });
      await onUnit(unit.bytes, arrivals.at(-1));
    }
  }
  splitter.finish();
  return { arrivals, totalMs: performance.now() - requestedAt };
}
// #endregion stream-segment
