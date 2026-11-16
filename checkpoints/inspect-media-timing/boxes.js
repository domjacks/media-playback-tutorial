#!/usr/bin/env node
// Tiny MP4 box walker: prints the box tree plus the fields that matter for timing.
// Usage: node boxes.js file.mp4
import { readFileSync } from "node:fs";

const file = process.argv[2];
if (!file) {
  console.error("usage: node boxes.js file.mp4");
  process.exit(1);
}
const buf = readFileSync(file);
const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);

// #region box-containers
// Boxes whose payload is simply more boxes.
const CONTAINERS = new Set(["moov", "trak", "edts", "mdia", "minf", "stbl", "mvex", "moof", "traf"]);
// #endregion box-containers

const u32 = (o) => view.getUint32(o);
const i32 = (o) => view.getInt32(o);
const u64 = (o) => Number(view.getBigUint64(o));
const i64 = (o) => Number(view.getBigInt64(o));
const fourcc = (o) => String.fromCharCode(...buf.subarray(o, o + 4));

// #region box-fields
// Decode the timing-relevant fields of one box. `p` is the start of the
// payload (just after size + type).
function describe(type, p) {
  const version = buf[p];
  const flags = u32(p) & 0xffffff;
  switch (type) {
    case "mvhd":
    case "mdhd": {
      const o = p + 4 + (version === 1 ? 16 : 8); // skip creation + modification time
      const timescale = u32(o);
      const duration = version === 1 ? u64(o + 4) : u32(o + 4);
      return `timescale=${timescale} duration=${duration} (${(duration / timescale).toFixed(3)} s)`;
    }
    case "hdlr":
      return `handler=${fourcc(p + 8)}`;
    case "elst": {
      const count = u32(p + 4);
      const wide = version === 1;
      const out = [];
      for (let i = 0, o = p + 8; i < count; i += 1) {
        const segment = wide ? u64(o) : u32(o);
        const mediaTime = wide ? i64(o + 8) : i32(o + 4);
        o += wide ? 20 : 12;
        out.push(`[segment_duration=${segment} media_time=${mediaTime}]`);
      }
      return `entries=${count} ${out.join(" ")}`;
    }
    case "stts": {
      const count = u32(p + 4);
      const out = [];
      for (let i = 0; i < Math.min(count, 3); i += 1) {
        out.push(`${u32(p + 8 + i * 8)}x${u32(p + 12 + i * 8)}`);
      }
      return `entries=${count} first(sample_count x delta)=${out.join(", ")}`;
    }
    case "ctts": {
      const count = u32(p + 4);
      const out = [];
      for (let i = 0; i < Math.min(count, 3); i += 1) {
        const offset = version === 1 ? i32(p + 12 + i * 8) : u32(p + 12 + i * 8);
        out.push(`${u32(p + 8 + i * 8)}x${offset}`);
      }
      return `version=${version} entries=${count} first(sample_count x offset)=${out.join(", ")}`;
    }
    case "mfhd":
      return `sequence_number=${u32(p + 4)}`;
    case "tfhd":
      return `track_id=${u32(p + 4)}`;
    case "tfdt":
      return `baseMediaDecodeTime=${version === 1 ? u64(p + 4) : u32(p + 4)}`;
    case "trun": {
      const count = u32(p + 4);
      let o = p + 8;
      if (flags & 0x1) o += 4; // data_offset
      if (flags & 0x4) o += 4; // first_sample_flags
      if (flags & 0x100) o += 4; // sample_duration
      if (flags & 0x200) o += 4; // sample_size
      if (flags & 0x400) o += 4; // sample_flags
      const hasCts = Boolean(flags & 0x800);
      return `version=${version} sample_count=${count} first_sample_composition_time_offset=${
        hasCts ? (version === 1 ? i32(o) : u32(o)) : "n/a"
      }`;
    }
    default:
      return "";
  }
}
// #endregion box-fields

// #region box-walk
function walk(start, end, depth) {
  let o = start;
  while (o + 8 <= end) {
    let size = u32(o);
    const type = fourcc(o + 4);
    let header = 8;
    if (size === 1) {
      size = u64(o + 8); // 64-bit largesize
      header = 16;
    } else if (size === 0) {
      size = end - o; // box runs to the end of the file
    }
    const detail = CONTAINERS.has(type) ? "" : describe(type, o + header);
    console.log(`${"  ".repeat(depth)}${type} (${size} bytes) ${detail}`.trimEnd());
    if (CONTAINERS.has(type)) walk(o + header, o + size, depth + 1);
    o += size;
  }
}

walk(0, buf.length, 0);
// #endregion box-walk
