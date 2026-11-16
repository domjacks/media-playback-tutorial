// A small HLS playlist parser: just enough of RFC 8216 for fMP4 VOD playback.
// Pure text in, plain objects out; no DOM and no network, so it runs in Node too.

// #region parse-attributes
// Parses an attribute list such as: BANDWIDTH=2177116,CODECS="avc1.640020,mp4a.40.2",RESOLUTION=960x540
// Quoted strings may contain commas (CODECS does), so a plain split(",") is wrong.
export function parseAttributes(text) {
  const attributes = {};
  const pattern = /([A-Z0-9-]+)=("(?:[^"]*)"|[^,]*)/g;
  for (const [, key, raw] of text.matchAll(pattern)) {
    attributes[key] = raw.startsWith('"') ? raw.slice(1, -1) : raw;
  }
  return attributes;
}

// "720@0" -> { length: 720, offset: 0 }. Offset is optional in #EXT-X-BYTERANGE.
export function parseByteRange(text) {
  const [length, offset] = text.split("@");
  return { length: Number(length), offset: offset === undefined ? undefined : Number(offset) };
}
// #endregion parse-attributes

function logicalLines(text) {
  return text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
}

// #region parse-multivariant
export function parseMultivariant(text, baseUrl) {
  const lines = logicalLines(text);
  if (lines[0] !== "#EXTM3U") throw new Error("Not an HLS playlist: missing #EXTM3U");

  const variants = [];
  const renditions = [];

  for (let i = 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (line.startsWith("#EXT-X-STREAM-INF:")) {
      // The variant's URI is the next non-tag line.
      const attributes = parseAttributes(line.slice("#EXT-X-STREAM-INF:".length));
      const uri = lines[i + 1];
      i += 1;
      variants.push({
        url: new URL(uri, baseUrl).href,
        bandwidth: Number(attributes.BANDWIDTH),
        averageBandwidth: attributes["AVERAGE-BANDWIDTH"] ? Number(attributes["AVERAGE-BANDWIDTH"]) : undefined,
        codecs: (attributes.CODECS ?? "").split(",").map((codec) => codec.trim()).filter(Boolean),
        resolution: attributes.RESOLUTION,
        frameRate: attributes["FRAME-RATE"] ? Number(attributes["FRAME-RATE"]) : undefined,
        audioGroup: attributes.AUDIO,
        subtitlesGroup: attributes.SUBTITLES
      });
    } else if (line.startsWith("#EXT-X-MEDIA:")) {
      const attributes = parseAttributes(line.slice("#EXT-X-MEDIA:".length));
      renditions.push({
        type: attributes.TYPE,
        groupId: attributes["GROUP-ID"],
        name: attributes.NAME,
        language: attributes.LANGUAGE,
        default: attributes.DEFAULT === "YES",
        autoselect: attributes.AUTOSELECT === "YES",
        // URI is optional: without it the rendition is muxed into the variant itself.
        url: attributes.URI ? new URL(attributes.URI, baseUrl).href : undefined
      });
    }
  }

  return { variants, renditions };
}
// #endregion parse-multivariant

// #region parse-media
export function parseMedia(text, baseUrl) {
  const lines = logicalLines(text);
  if (lines[0] !== "#EXTM3U") throw new Error("Not an HLS playlist: missing #EXTM3U");

  const playlist = { targetDuration: 0, mediaSequence: 0, endList: false, playlistType: undefined, segments: [] };
  let map; // the init segment currently in force; #EXT-X-MAP applies to the segments after it
  let pending = { duration: undefined, byteRange: undefined, discontinuity: false };
  let nextOffset = 0; // implicit offset for a BYTERANGE without "@": continue where the last one ended
  let time = 0;

  for (const line of lines.slice(1)) {
    if (line.startsWith("#EXT-X-TARGETDURATION:")) {
      playlist.targetDuration = Number(line.split(":")[1]);
    } else if (line.startsWith("#EXT-X-MEDIA-SEQUENCE:")) {
      playlist.mediaSequence = Number(line.split(":")[1]);
    } else if (line.startsWith("#EXT-X-PLAYLIST-TYPE:")) {
      playlist.playlistType = line.split(":")[1];
    } else if (line === "#EXT-X-ENDLIST") {
      playlist.endList = true;
    } else if (line.startsWith("#EXT-X-MAP:")) {
      const attributes = parseAttributes(line.slice("#EXT-X-MAP:".length));
      map = {
        url: new URL(attributes.URI, baseUrl).href,
        byteRange: attributes.BYTERANGE ? withOffset(parseByteRange(attributes.BYTERANGE), 0) : undefined
      };
    } else if (line.startsWith("#EXTINF:")) {
      // "#EXTINF:5.99467," -> duration, then an optional title after the comma.
      pending.duration = Number(line.slice("#EXTINF:".length).split(",")[0]);
    } else if (line.startsWith("#EXT-X-BYTERANGE:")) {
      pending.byteRange = withOffset(parseByteRange(line.slice("#EXT-X-BYTERANGE:".length)), nextOffset);
    } else if (line === "#EXT-X-DISCONTINUITY") {
      pending.discontinuity = true;
    } else if (!line.startsWith("#")) {
      // A URI line completes the segment described by the tags above it.
      const segment = {
        sequence: playlist.mediaSequence + playlist.segments.length,
        url: new URL(line, baseUrl).href,
        duration: pending.duration,
        start: time,
        end: time + pending.duration,
        byteRange: pending.byteRange,
        discontinuity: pending.discontinuity,
        map
      };
      if (segment.byteRange) nextOffset = segment.byteRange.offset + segment.byteRange.length;
      time = segment.end;
      playlist.segments.push(segment);
      pending = { duration: undefined, byteRange: undefined, discontinuity: false };
    }
  }

  playlist.duration = time;
  return playlist;
}

function withOffset(byteRange, fallbackOffset) {
  return { length: byteRange.length, offset: byteRange.offset ?? fallbackOffset };
}
// #endregion parse-media
