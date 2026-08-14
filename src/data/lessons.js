export const bbbMpd = "https://rdmedia.bbc.co.uk/bbb/2/client_manifest-common_init.mpd";

export const lessons = [
  {
    slug: "fundamentals",
    title: "IP Media Streaming Fundamentals",
    kind: "Theory",
    visual: "packets",
    summary: "Start with what actually crosses the network and how those bytes become timed audio and video.",
    target: "You can explain packets, encoded frames, containers, segments, bitrate, codecs, ABR, and buffering.",
    checkpoint: "Trace a chunk of video from server bytes to a decoded frame on the media timeline.",
    reference: "https://developer.mozilla.org/en-US/docs/Web/Media",
    sections: [
      {
        heading: "From Files To Flows",
        body: [
          "A media file is stored as bytes, but streaming is experienced as a timed flow. TCP breaks those bytes into packets, retransmits missing data, and presents the browser with an ordered byte stream.",
          "The browser does not decode packets directly. It receives container bytes, extracts encoded samples, decodes them with a codec, and schedules decoded frames or audio samples onto a media timeline."
        ],
        points: [
          "TCP handles reliability and ordering; your player handles when and what to request.",
          "A codec such as H.264, AAC, VP9, or Opus defines how compressed samples become raw media.",
          "A container such as fragmented MP4 groups metadata and media samples into boxes the browser can parse."
        ]
      },
      {
        heading: "Segments And Quality",
        body: [
          "Adaptive streaming cuts media into short segments. Each segment covers a fixed time range, often two to six seconds, and can be encoded at multiple bitrates.",
          "ABR means adaptive bitrate. A player estimates network and buffer health, then switches to a representation that should download quickly enough without starving playback."
        ],
        points: [
          "Higher bitrate usually improves quality but costs bandwidth and buffer time.",
          "Lower bitrate is useful during congestion or when a small display does not need high detail.",
          "The buffer is a timed queue, not just a byte count."
        ]
      }
    ],
    snippets: [],
    demo: {
      title: "Think In Timed Bytes",
      mode: "packets",
      text: "Watch the network packets assemble into fMP4 boxes, then into buffered seconds on the media timeline."
    }
  },
  {
    slug: "mse-basics",
    title: "Build A Tiny MSE Player",
    kind: "Practical",
    visual: "buffer",
    summary: "Use Media Source Extensions to append initialization and media segments into a video element.",
    target: "A plain HTML page and ESM module append Big Buck Bunny bytes to a SourceBuffer.",
    checkpoint: "The video element plays media that JavaScript fetched and appended.",
    reference: "https://developer.mozilla.org/en-US/docs/Web/API/Media_Source_Extensions_API",
    sections: [
      {
        heading: "The MSE Shape",
        body: [
          "A normal video element can fetch a single URL by itself. MSE lets JavaScript provide the bytes instead. You create a MediaSource, attach it to the video, add a SourceBuffer for a codec string, then append bytes in order.",
          "The initialization segment describes tracks, timescales, and codec metadata. Media segments carry the timed samples. The browser needs the init segment before it can understand the following media fragments."
        ],
        points: [
          "Only append while the SourceBuffer is not updating.",
          "Use a precise MIME type and codec string supported by the browser.",
          "Call endOfStream when you have appended all bytes for a small VOD demo."
        ]
      }
    ],
    snippets: [
      {
        title: "index.html",
        explain: "This file keeps the user app deliberately small: one video element and one browser ESM entrypoint.",
        code: `
<video id="video" controls width="800"></video>
<script type="module" src="./player.js"></script>`
      },
      {
        title: "player.js",
        explain: "The append queue waits for updateend before appending the next chunk, which avoids InvalidStateError.",
        code: `
const video = document.querySelector("#video");
const mime = 'video/mp4; codecs="avc1.64001f, mp4a.40.2"';
const files = [
  "./bbb/init.mp4",
  "./bbb/segment-1.m4s",
  "./bbb/segment-2.m4s",
  "./bbb/segment-3.m4s"
];

const mediaSource = new MediaSource();
video.src = URL.createObjectURL(mediaSource);

mediaSource.addEventListener("sourceopen", async () => {
  const sourceBuffer = mediaSource.addSourceBuffer(mime);
  const queue = await Promise.all(files.map(fetchBytes));

  sourceBuffer.addEventListener("updateend", () => {
    if (queue.length) {
      sourceBuffer.appendBuffer(queue.shift());
    } else if (mediaSource.readyState === "open") {
      mediaSource.endOfStream();
    }
  });

  sourceBuffer.appendBuffer(queue.shift());
});

async function fetchBytes(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(\`Failed to fetch \${url}\`);
  return response.arrayBuffer();
}`
      }
    ],
    demo: {
      title: "SourceBuffer Queue",
      mode: "buffer",
      text: "Append operations are serialized. The browser parses each fragment and expands the playable timeline."
    }
  },
  {
    slug: "protocols",
    title: "DASH And HLS Theory",
    kind: "Theory",
    visual: "timeline",
    summary: "Replace hardcoded segment lists with manifests that describe time, quality, codecs, and URLs.",
    target: "You understand why DASH MPDs and HLS playlists exist and what a player reads from them.",
    checkpoint: "Given a manifest, identify representations, init segments, media segment templates, and durations.",
    reference: "https://dashif.org/docs/DASH-IF-IOP-v4.3.pdf",
    sections: [
      {
        heading: "Why Protocols Exist",
        body: [
          "The previous demo hardcoded every segment. That works for a lab, but not for real media. A streaming protocol gives the player a manifest so it can discover available qualities, languages, timing, and segment URLs.",
          "DASH uses an XML Media Presentation Description. HLS uses text playlists. The ideas are similar: a top-level description points to variant streams, and each variant points to timed media segments."
        ],
        points: [
          "DASH vocabulary: MPD, Period, AdaptationSet, Representation, SegmentTemplate.",
          "HLS vocabulary: master playlist, media playlist, rendition, variant, EXTINF.",
          "Both protocols let the player react to bandwidth, latency, and device capability."
        ]
      }
    ],
    snippets: [
      {
        title: "A Tiny MPD Mental Model",
        explain: "This is the shape your parser will walk in the next lesson.",
        code: `
MPD
  Period
    AdaptationSet mimeType="video/mp4"
      Representation bandwidth="..."
        SegmentTemplate initialization="..." media="..." duration="..."`
      }
    ],
    demo: {
      title: "Manifest To Timeline",
      mode: "timeline",
      text: "A manifest maps segment numbers to timeline ranges so the player can request just enough future media."
    }
  },
  {
    slug: "dash-vod",
    title: "Parse DASH VOD",
    kind: "Practical",
    visual: "timeline",
    summary: "Update the MSE player so it fetches an MPD and appends the segments described by the manifest.",
    target: "A browser ESM player fetches a simple Big Buck Bunny MPD and plays through listed segments.",
    checkpoint: "Playback starts from manifest-derived initialization and media URLs.",
    reference: bbbMpd,
    sections: [
      {
        heading: "Parser Boundaries",
        body: [
          "A learning player should parse the subset it needs. For this tutorial, support one Period, one video AdaptationSet, one Representation, and SegmentTemplate URLs using $Number$ replacement.",
          "The MPD tells you the base URL, codec string, initialization URL, media URL pattern, start number, duration, and total presentation duration. That is enough to request sequential VOD segments."
        ],
        points: [
          "Use DOMParser instead of string splitting XML.",
          "Resolve segment URLs with new URL(relative, manifestUrl).",
          "Keep append sequencing isolated from manifest parsing."
        ]
      }
    ],
    snippets: [
      {
        title: "dash.js",
        explain: "This parser intentionally supports a small DASH subset so every field is easy to follow.",
        code: `
export async function loadDashVod(mpdUrl) {
  const xml = await fetchText(mpdUrl);
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  const representation = doc.querySelector("AdaptationSet[mimeType='video/mp4'] Representation");
  const adaptation = representation.closest("AdaptationSet");
  const template = representation.querySelector("SegmentTemplate") ?? adaptation.querySelector("SegmentTemplate");
  const base = doc.querySelector("BaseURL")?.textContent?.trim() ?? "";

  const timescale = Number(template.getAttribute("timescale") ?? 1);
  const duration = Number(template.getAttribute("duration"));
  const startNumber = Number(template.getAttribute("startNumber") ?? 1);
  const mediaPresentationDuration = parseIsoDuration(doc.documentElement.getAttribute("mediaPresentationDuration"));
  const segmentCount = Math.ceil(mediaPresentationDuration / (duration / timescale));
  const codecs = [adaptation.getAttribute("codecs"), representation.getAttribute("codecs")]
    .filter(Boolean)
    .join(", ");

  return {
    mime: \`\${adaptation.getAttribute("mimeType")}; codecs="\${codecs}"\`,
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
  if (!response.ok) throw new Error(\`Failed to fetch \${url}\`);
  return response.text();
}

function parseIsoDuration(value) {
  const match = /PT(?:(\\d+)H)?(?:(\\d+)M)?(?:(\\d+(?:\\.\\d+)?)S)?/.exec(value ?? "");
  if (!match) return 0;
  return Number(match[1] ?? 0) * 3600 + Number(match[2] ?? 0) * 60 + Number(match[3] ?? 0);
}`
      },
      {
        title: "player.js With DASH",
        explain: "The player no longer knows segment filenames. It asks the manifest parser for appendable URLs.",
        code: `
import { loadDashVod } from "./dash.js";

const mpdUrl = "${bbbMpd}";
const video = document.querySelector("#video");
const manifest = await loadDashVod(mpdUrl);

if (!MediaSource.isTypeSupported(manifest.mime)) {
  throw new Error(\`Unsupported MIME type: \${manifest.mime}\`);
}

const mediaSource = new MediaSource();
video.src = URL.createObjectURL(mediaSource);

mediaSource.addEventListener("sourceopen", async () => {
  const sourceBuffer = mediaSource.addSourceBuffer(manifest.mime);
  const urls = [manifest.init, ...manifest.segments];
  const appendNext = async () => {
    if (!urls.length) return mediaSource.endOfStream();
    sourceBuffer.appendBuffer(await fetchBytes(urls.shift()));
  };
  sourceBuffer.addEventListener("updateend", appendNext);
  appendNext();
});

async function fetchBytes(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(\`Failed to fetch \${url}\`);
  return response.arrayBuffer();
}`
      }
    ],
    demo: {
      title: "MPD Loader",
      mode: "timeline",
      text: "Manifest fields become concrete segment requests, then each response feeds the same MSE append queue."
    }
  },
  {
    slug: "live",
    title: "Add Live Playback",
    kind: "Practical",
    visual: "buffer",
    summary: "Adapt the DASH player for dynamic manifests, live edge, latency, and buffer cleanup.",
    target: "The player refreshes a dynamic MPD and appends newly available segments near the live edge.",
    checkpoint: "You can describe live edge, availability window, target latency, and safe buffer eviction.",
    reference: "https://reference.dashif.org/dash.js/latest/samples/live-streaming/live-delay-comparison.html",
    sections: [
      {
        heading: "Live Is Moving VOD",
        body: [
          "A live manifest changes over time. Segments expire from the back of the availability window and new segments appear near the live edge.",
          "The player should not chase the newest byte exactly. It should target a small latency behind live edge so downloads and decode have room to recover."
        ],
        points: [
          "Refresh the MPD using minimumUpdatePeriod.",
          "Start a few segments behind the newest available segment.",
          "Remove old buffered ranges after playback has moved past them."
        ]
      }
    ],
    snippets: [
      {
        title: "live.js",
        explain: "This sketch shows the control loop: refresh manifest, compute available numbers, append missing segments.",
        code: `
export function createLiveController({ refreshManifest, appendSegment, targetLatencySegments = 3 }) {
  const appended = new Set();
  let timer = 0;

  async function tick() {
    const manifest = await refreshManifest();
    const newest = manifest.lastSegmentNumber;
    const firstWanted = Math.max(manifest.firstSegmentNumber, newest - targetLatencySegments);

    for (let number = firstWanted; number <= newest; number += 1) {
      if (!appended.has(number)) {
        appended.add(number);
        await appendSegment(manifest.segmentUrl(number));
      }
    }

    timer = setTimeout(tick, manifest.minimumUpdatePeriodMs);
  }

  return {
    start: tick,
    stop: () => clearTimeout(timer)
  };
}`
      }
    ],
    demo: {
      title: "Live Window",
      mode: "buffer",
      text: "The live window slides forward while playback follows a few segments behind the edge."
    }
  },
  {
    slug: "subtitle-theory",
    title: "Subtitles In Streaming",
    kind: "Theory",
    visual: "timeline",
    summary: "Learn where timed text comes from and how browsers display cues alongside media.",
    target: "You understand sidecar subtitles, embedded text tracks, WebVTT, TTML, IMSC, languages, and cue timing.",
    checkpoint: "Choose a subtitle format and explain how cues align with media time.",
    reference: "https://developer.mozilla.org/en-US/docs/Web/API/WebVTT_API",
    sections: [
      {
        heading: "Timed Text",
        body: [
          "Subtitles are media too: they have language, timing, payload, and rendering rules. Some streams carry text in separate files, while others mux subtitles into fragmented media.",
          "WebVTT is browser-friendly for sidecar captions. TTML and IMSC are common in broadcast workflows and often need conversion or custom rendering in simple web players."
        ],
        points: [
          "Sidecar text is easy to add with a track element or TextTrack API.",
          "Segmented subtitles follow the same manifest timing ideas as audio and video.",
          "Accessibility depends on correct language, labels, and caption kind."
        ]
      }
    ],
    snippets: [
      {
        title: "sample.vtt",
        explain: "WebVTT is plain text: each cue has a time range and cue text.",
        code: `
WEBVTT

00:00:01.000 --> 00:00:04.000
Big Buck Bunny starts in a quiet field.

00:00:05.500 --> 00:00:08.000
Captions are synchronized to media time.`
      }
    ],
    demo: {
      title: "Subtitle Cues",
      mode: "timeline",
      text: "Text cues occupy timed ranges just like media segments, but render as captions instead of decoded frames."
    }
  },
  {
    slug: "subtitle-practical",
    title: "Add Subtitle Support",
    kind: "Practical",
    visual: "timeline",
    summary: "Attach sidecar WebVTT captions and control active subtitle tracks from JavaScript.",
    target: "The tutorial player loads and toggles WebVTT subtitle tracks.",
    checkpoint: "A viewer can switch captions on and off while playback continues.",
    reference: "https://developer.mozilla.org/en-US/docs/Web/API/TextTrack",
    sections: [
      {
        heading: "Use The Platform First",
        body: [
          "For sidecar WebVTT, the browser already has a renderer. Create track elements, set kind, label, srclang, and src, then toggle TextTrack mode.",
          "A custom renderer is useful for advanced styling or segmented TTML, but the native track path is the simplest correct first version."
        ],
        points: [
          "Use kind=\"subtitles\" for translations and kind=\"captions\" for accessibility captions.",
          "Set one track to showing and the others to disabled.",
          "Keep subtitle state separate from SourceBuffer state."
        ]
      }
    ],
    snippets: [
      {
        title: "subtitles.js",
        explain: "Track elements let the browser fetch, parse, synchronize, and render WebVTT.",
        code: `
export function addSubtitleTrack(video, { src, label, language, defaultTrack = false }) {
  const track = document.createElement("track");
  track.kind = "subtitles";
  track.label = label;
  track.srclang = language;
  track.src = src;
  track.default = defaultTrack;
  video.append(track);
  return track;
}

export function showSubtitle(video, language) {
  for (const track of video.textTracks) {
    track.mode = track.language === language ? "showing" : "disabled";
  }
}`
      }
    ],
    demo: {
      title: "Cue Switcher",
      mode: "timeline",
      text: "The media timeline keeps running while text tracks independently switch rendering mode."
    }
  },
  {
    slug: "drm-theory",
    title: "DRM And EME",
    kind: "Theory",
    visual: "packets",
    summary: "Understand encrypted media at the browser boundary without hiding the moving parts.",
    target: "You understand init data, key systems, MediaKeys, sessions, licenses, and ClearKey limitations.",
    checkpoint: "Explain why DRM is negotiated before encrypted samples can be decoded.",
    reference: "https://developer.mozilla.org/en-US/docs/Web/API/Navigator/requestMediaKeySystemAccess",
    sections: [
      {
        heading: "Encrypted Media Extensions",
        body: [
          "EME does not decrypt media in your JavaScript. It lets JavaScript negotiate with a browser CDM, attach MediaKeys to a media element, and pass license messages between the CDM and a license service.",
          "ClearKey is useful for learning because keys can be provided directly. Production DRM systems such as Widevine, PlayReady, and FairPlay require provider-specific license services and packaging."
        ],
        points: [
          "Encrypted samples carry metadata that triggers an encrypted event.",
          "A MediaKeySession produces a license request message.",
          "Playback can continue only after the session receives usable keys."
        ]
      }
    ],
    snippets: [],
    demo: {
      title: "License Round Trip",
      mode: "packets",
      text: "Encrypted samples cause a key request, the license response unlocks decryption, then decoded frames resume."
    }
  },
  {
    slug: "drm-practical",
    title: "Add Optional ClearKey DRM",
    kind: "Practical",
    visual: "packets",
    summary: "Wire a minimal ClearKey EME flow so users can see the browser DRM lifecycle.",
    target: "The player can attach MediaKeys and update a ClearKey session for compatible encrypted samples.",
    checkpoint: "The DRM code fails gracefully when key system support, secure context, or encrypted media is unavailable.",
    reference: "https://developer.mozilla.org/en-US/docs/Web/API/MediaKeySession",
    sections: [
      {
        heading: "Keep DRM Optional",
        body: [
          "DRM support varies by browser, OS, and security context. Treat the DRM lesson as an optional branch of the player, not as a requirement for the rest of playback.",
          "ClearKey uses JSON Web Key Set data, which makes it suitable for a tutorial. The structure is not how production services should expose keys."
        ],
        points: [
          "Request key system access before attaching encrypted media.",
          "Attach MediaKeys to the video element.",
          "Listen for encrypted, create a session, generate a request, and update it with the license response."
        ]
      }
    ],
    snippets: [
      {
        title: "drm.js",
        explain: "This is the smallest useful EME shape. Production DRM replaces createClearKeyLicense with a license server fetch.",
        code: `
export async function installClearKey(video, keys) {
  if (!window.isSecureContext) {
    throw new Error("EME requires a secure context or localhost.");
  }

  const config = [{
    initDataTypes: ["cenc"],
    videoCapabilities: [{ contentType: 'video/mp4; codecs="avc1.64001f"' }]
  }];

  const access = await navigator.requestMediaKeySystemAccess("org.w3.clearkey", config);
  const mediaKeys = await access.createMediaKeys();
  await video.setMediaKeys(mediaKeys);

  video.addEventListener("encrypted", async (event) => {
    const session = mediaKeys.createSession();
    session.addEventListener("message", async () => {
      await session.update(createClearKeyLicense(keys));
    });
    await session.generateRequest(event.initDataType, event.initData);
  });
}

function createClearKeyLicense(keys) {
  return new TextEncoder().encode(JSON.stringify({ keys, type: "temporary" }));
}`
      }
    ],
    demo: {
      title: "EME Lifecycle",
      mode: "packets",
      text: "The encrypted event bridges media bytes to a key session while the video element stays the playback surface."
    }
  }
];
