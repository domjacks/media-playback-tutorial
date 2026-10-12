const textDecoder = new TextDecoder();

export function parseInitSegment(buffer) {
  const bytes = new Uint8Array(buffer);
  const root = boxes(bytes, 0, bytes.length);
  const moov = root.find((box) => box.type === "moov");
  if (!moov) throw new Error("The initialization segment has no moov box");

  const tracks = children(bytes, moov).filter((box) => box.type === "trak").map((trak) => parseTrack(bytes, trak));
  const mvex = children(bytes, moov).find((box) => box.type === "mvex");
  if (mvex) {
    for (const trex of children(bytes, mvex).filter((box) => box.type === "trex")) {
      const trackId = readU32(bytes, trex.dataStart + 4);
      const track = tracks.find((item) => item.id === trackId);
      if (track) {
        track.defaults = {
          duration: readU32(bytes, trex.dataStart + 12),
          size: readU32(bytes, trex.dataStart + 16),
          flags: readU32(bytes, trex.dataStart + 20)
        };
      }
    }
  }
  const usable = tracks.filter((track) => track.config && ["video", "audio"].includes(track.kind));
  if (!usable.length) throw new Error("The initialization segment has no supported H.264 or AAC track");
  return usable;
}

function parseTrack(bytes, trak) {
  const trakChildren = children(bytes, trak);
  const tkhd = trakChildren.find((box) => box.type === "tkhd");
  const mdia = trakChildren.find((box) => box.type === "mdia");
  if (!tkhd || !mdia) throw new Error("A track is missing tkhd or mdia metadata");

  const mdiaChildren = children(bytes, mdia);
  const mdhd = mdiaChildren.find((box) => box.type === "mdhd");
  const hdlr = mdiaChildren.find((box) => box.type === "hdlr");
  const minf = mdiaChildren.find((box) => box.type === "minf");
  const stbl = minf && children(bytes, minf).find((box) => box.type === "stbl");
  const stsd = stbl && children(bytes, stbl).find((box) => box.type === "stsd");
  const entry = stsd && boxes(bytes, stsd.dataStart + 8, stsd.end)[0];
  if (!mdhd || !hdlr || !entry) throw new Error("A track is missing its media description");

  const version = bytes[tkhd.dataStart];
  const idOffset = tkhd.dataStart + (version === 1 ? 20 : 12);
  const id = readU32(bytes, idOffset);
  const mdhdVersion = bytes[mdhd.dataStart];
  const timescale = readU32(bytes, mdhd.dataStart + (mdhdVersion === 1 ? 20 : 12));
  const handler = readType(bytes, hdlr.dataStart + 8);
  const kind = handler === "vide" ? "video" : handler === "soun" ? "audio" : "other";
  const sampleEntry = kind === "video" ? parseVideoEntry(bytes, entry) : kind === "audio" ? parseAudioEntry(bytes, entry) : null;

  return { id, kind, timescale, ...sampleEntry };
}

function parseVideoEntry(bytes, entry) {
  if (entry.type !== "avc1" && entry.type !== "avc3") throw new Error(`Unsupported video sample entry: ${entry.type}`);
  const childrenStart = entry.dataStart + 78;
  const avcC = boxes(bytes, childrenStart, entry.end).find((box) => box.type === "avcC");
  if (!avcC) throw new Error("The H.264 sample entry has no avcC configuration");
  const profile = bytes[avcC.dataStart + 1].toString(16).padStart(2, "0");
  const compatibility = bytes[avcC.dataStart + 2].toString(16).padStart(2, "0");
  const level = bytes[avcC.dataStart + 3].toString(16).padStart(2, "0");
  return {
    config: {
      codec: `avc1.${profile}${compatibility}${level}`,
      description: bytes.slice(avcC.dataStart, avcC.end)
    }
  };
}

function parseAudioEntry(bytes, entry) {
  if (entry.type !== "mp4a") throw new Error(`Unsupported audio sample entry: ${entry.type}`);
  const channels = readU16(bytes, entry.dataStart + 16);
  const sampleRate = readU32(bytes, entry.dataStart + 24) >>> 16;
  const esds = boxes(bytes, entry.dataStart + 28, entry.end).find((box) => box.type === "esds");
  if (!esds) throw new Error("The AAC sample entry has no esds configuration");
  const configBytes = findDescriptor(bytes, esds.dataStart + 4, esds.end, 0x05);
  if (!configBytes) throw new Error("The AAC esds box has no decoder-specific configuration");
  const audioObjectType = configBytes[0] >> 3;
  return {
    config: {
      codec: `mp4a.40.${audioObjectType}`,
      sampleRate,
      numberOfChannels: channels,
      description: configBytes
    }
  };
}

function findDescriptor(bytes, start, end, wantedTag) {
  for (let offset = start; offset < end;) {
    const tag = bytes[offset++];
    let length = 0;
    let value;
    do {
      if (offset >= end) return null;
      value = bytes[offset++];
      length = (length << 7) | (value & 0x7f);
    } while (value & 0x80);
    const contentStart = offset;
    const contentEnd = Math.min(end, contentStart + length);
    if (tag === wantedTag) return bytes.slice(contentStart, contentEnd);
    if ([0x03, 0x04, 0x06].includes(tag)) {
      const nestedStart = contentStart + (tag === 0x03 ? 3 : tag === 0x04 ? 13 : 0);
      const nested = findDescriptor(bytes, nestedStart, contentEnd, wantedTag);
      if (nested) return nested;
    }
    offset = contentEnd;
  }
  return null;
}

export function demuxFragment(buffer, tracks) {
  const bytes = new Uint8Array(buffer);
  const root = boxes(bytes, 0, bytes.length);
  const moof = root.find((box) => box.type === "moof");
  const mdat = root.find((box) => box.type === "mdat");
  if (!moof || !mdat) throw new Error("Expected one moof and one mdat box in each media segment");

  const samples = [];
  for (const traf of children(bytes, moof).filter((box) => box.type === "traf")) {
    const parts = children(bytes, traf);
    const tfhd = parts.find((box) => box.type === "tfhd");
    const tfdt = parts.find((box) => box.type === "tfdt");
    const truns = parts.filter((box) => box.type === "trun");
    if (!tfhd || !tfdt || !truns.length) throw new Error("A media fragment is missing tfhd, tfdt, or trun");
    const tfhdDefaults = parseTfhd(bytes, tfhd);
    const track = tracks.find((item) => item.id === tfhdDefaults.trackId);
    if (!track || track.kind === "other") continue;
    const defaults = { duration: 0, size: 0, flags: null, ...track.defaults, ...tfhdDefaults };
    let decodeTime = parseTfdt(bytes, tfdt);
    let implicitDataOffset = mdat.dataStart;

    for (const trun of truns) {
      const run = parseTrun(bytes, trun, moof.start, defaults, decodeTime, implicitDataOffset);
      decodeTime = run.decodeTime;
      implicitDataOffset = run.dataEnd;
      samples.push(...run.samples.map((sample) => ({ ...sample, track })));
    }
  }
  return samples;
}

function parseTfhd(bytes, box) {
  const flags = readU24(bytes, box.dataStart + 1);
  let offset = box.dataStart + 4;
  const trackId = readU32(bytes, offset);
  offset += 4;
  const result = { trackId };
  if (flags & 0x000001) offset += 8;
  if (flags & 0x000002) offset += 4;
  if (flags & 0x000008) { result.duration = readU32(bytes, offset); offset += 4; }
  if (flags & 0x000010) { result.size = readU32(bytes, offset); offset += 4; }
  if (flags & 0x000020) result.flags = readU32(bytes, offset);
  return result;
}

function parseTfdt(bytes, box) {
  return bytes[box.dataStart] === 1 ? readU64(bytes, box.dataStart + 4) : readU32(bytes, box.dataStart + 4);
}

function parseTrun(bytes, box, moofStart, defaults, initialDecodeTime, implicitDataOffset) {
  const version = bytes[box.dataStart];
  const flags = readU24(bytes, box.dataStart + 1);
  const count = readU32(bytes, box.dataStart + 4);
  let offset = box.dataStart + 8;
  let dataOffset = implicitDataOffset;
  let firstSampleFlags = null;
  if (flags & 0x000001) { dataOffset = moofStart + readI32(bytes, offset); offset += 4; }
  if (flags & 0x000004) { firstSampleFlags = readU32(bytes, offset); offset += 4; }
  const samples = [];
  let decodeTime = initialDecodeTime;
  let cursor = dataOffset;

  for (let index = 0; index < count; index += 1) {
    const duration = flags & 0x000100 ? readU32(bytes, offset) : defaults.duration;
    if (flags & 0x000100) offset += 4;
    const size = flags & 0x000200 ? readU32(bytes, offset) : defaults.size;
    if (flags & 0x000200) offset += 4;
    let sampleFlags = index === 0 && firstSampleFlags !== null ? firstSampleFlags : defaults.flags;
    if (flags & 0x000400) { sampleFlags = readU32(bytes, offset); offset += 4; }
    const compositionOffset = flags & 0x000800 ? (version === 1 ? readI32(bytes, offset) : readU32(bytes, offset)) : 0;
    if (flags & 0x000800) offset += 4;
    if (!duration || !size || cursor + size > bytes.byteLength) throw new Error("Sample run has invalid size or duration data");
    samples.push({
      data: bytes.slice(cursor, cursor + size),
      timestamp: decodeTime + compositionOffset,
      decodeTime,
      duration,
      key: sampleFlags === null ? index === 0 : (sampleFlags & 0x00010000) === 0
    });
    cursor += size;
    decodeTime += duration;
  }
  return { samples, decodeTime, dataEnd: cursor };
}

function boxes(bytes, start, end) {
  const result = [];
  for (let offset = start; offset + 8 <= end;) {
    const size32 = readU32(bytes, offset);
    const type = readType(bytes, offset + 4);
    let headerSize = 8;
    let size = size32;
    if (size32 === 1) { size = readU64(bytes, offset + 8); headerSize = 16; }
    else if (size32 === 0) size = end - offset;
    if (size < headerSize || offset + size > end) throw new Error(`Invalid ${type} box size`);
    result.push({ type, start: offset, dataStart: offset + headerSize, end: offset + size });
    offset += size;
  }
  return result;
}

function children(bytes, box) { return boxes(bytes, box.dataStart, box.end); }
function readType(bytes, offset) { return textDecoder.decode(bytes.subarray(offset, offset + 4)); }
function readU16(bytes, offset) { return new DataView(bytes.buffer, bytes.byteOffset + offset, 2).getUint16(0); }
function readU24(bytes, offset) { return (bytes[offset] << 16) | (bytes[offset + 1] << 8) | bytes[offset + 2]; }
function readU32(bytes, offset) { return new DataView(bytes.buffer, bytes.byteOffset + offset, 4).getUint32(0); }
function readI32(bytes, offset) { return new DataView(bytes.buffer, bytes.byteOffset + offset, 4).getInt32(0); }
function readU64(bytes, offset) {
  const value = new DataView(bytes.buffer, bytes.byteOffset + offset, 8).getBigUint64(0);
  if (value > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error("A media timestamp exceeds JavaScript's safe integer range");
  return Number(value);
}
