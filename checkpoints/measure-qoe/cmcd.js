// CMCD (CTA-5004) version 1, sent as a query argument.
// Header transmission (CMCD-Object and friends) would force a CORS preflight for every segment,
// and the BBB CDN's Access-Control-Allow-Headers does not list them, so query args are the browser choice.

// #region cmcd-serialize
// Serialise a flat object of CMCD keys as an RFC 8941 dictionary: key=value pairs, comma separated.
export function serializeCmcd(data) {
  return Object.keys(data)
    .filter((key) => data[key] !== undefined && data[key] !== null && data[key] !== false)
    .sort() // alphabetical order keeps requests from fingerprinting a player by key order
    .map((key) => {
      const value = data[key];
      if (value === true) return key; // a true boolean is the bare key: su, bs
      if (typeof value === "number") return `${key}=${Math.round(value)}`;
      if (key === "ot" || key === "sf" || key === "st") return `${key}=${value}`; // tokens are unquoted
      return `${key}="${String(value).replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`; // strings are quoted
    })
    .join(",");
}
// #endregion cmcd-serialize

// #region cmcd-query
// Append CMCD=<url-encoded payload> to a URL, joining with & when it already has a query string.
export function withCmcdQuery(url, data) {
  const payload = serializeCmcd(data);
  if (!payload) return url;
  return `${url}${url.includes("?") ? "&" : "?"}CMCD=${encodeURIComponent(payload)}`;
}
// #endregion cmcd-query

// #region cmcd-session
const roundTo = (value, step) => Math.round(value / step) * step;

// One CMCD "session": the keys that stay constant (sid, cid, sf, st) plus a helper for the per-request ones.
export function createCmcdSession({ contentId, streamType = "v" } = {}) {
  const sessionId = crypto.randomUUID();
  let enabled = true;

  return {
    sessionId,
    get enabled() { return enabled; },
    set enabled(value) { enabled = Boolean(value); },
    // fields: objectType plus whatever the player knows right now; unknown values are simply left out.
    urlFor(url, { objectType, bitrateKbps, topBitrateKbps, durationMs, bufferMs, throughputKbps, startup, starved, playbackRate, next }) {
      if (!enabled) return { url, cmcd: "" };
      const data = {
        sid: sessionId,
        cid: contentId,
        sf: "d", // MPEG-DASH
        st: streamType, // v = VOD, l = live, ll = low-latency live
        ot: objectType, // m manifest, i init, a audio, v video
        br: bitrateKbps, // encoded bitrate of the requested Representation
        tb: topBitrateKbps, // highest bitrate in the ladder
        d: durationMs, // duration of the requested object
        bl: bufferMs === undefined ? undefined : roundTo(bufferMs, 100),
        dl: bufferMs === undefined ? undefined : roundTo(bufferMs, 100), // deadline ~ buffer length at rate 1
        mtp: throughputKbps === undefined ? undefined : roundTo(throughputKbps, 100),
        su: startup, // true until the buffer first reaches a stable level
        bs: starved, // true if the buffer ran dry since the last report
        pr: playbackRate && playbackRate !== 1 ? playbackRate : undefined,
        nor: next // relative path of the object we will probably ask for next
      };
      return { url: withCmcdQuery(url, data), cmcd: serializeCmcd(data) };
    }
  };
}
// #endregion cmcd-session
