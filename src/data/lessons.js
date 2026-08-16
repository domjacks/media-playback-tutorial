export const bbbMpd = "https://rdmedia.bbc.co.uk/bbb/2/client_manifest-common_init.mpd";

export const lessons = [
  {
    slug: "introduction",
    title: "What You Will Build",
    kind: "Theory",
    visual: "timeline",
    summary: "A guided map of the tutorial, from media fundamentals to a working browser DASH player.",
    target: "You understand the learning path and how each theory topic supports the player you will build.",
    checkpoint: "Describe the route from media bytes to a browser player with DASH, live, subtitles, and optional DRM.",
    reference: "https://developer.mozilla.org/en-US/docs/Web/Media",
    sections: [
      {
        heading: "The Destination",
        body: [
          "By the end of the tutorial you will have built a small browser media player from scratch. It will use the video element for presentation, Media Source Extensions for feeding media bytes, and a minimal DASH parser for discovering segments.",
          "The goal is not to recreate dash.js or a production player. The goal is to learn the browser APIs and the media concepts that those libraries normally hide."
        ],
        points: [
          "First you will learn what video and audio actually describe.",
          "Then you will learn how media files package encoded samples.",
          "After that you will connect files, segments, manifests, buffers, and playback APIs."
        ]
      },
      {
        heading: "The Tutorial Arc",
        body: [
          "The early lessons are intentionally theory-heavy. MSE is easier to understand when you already know what a frame, codec, container, segment, timeline, and buffer mean.",
          "The practical lessons build one browser ESM project step by step: first fixed MSE appends, then DASH VOD, then live refresh, subtitles, and an optional ClearKey DRM flow."
        ],
        points: [
          "Theory lessons explain the vocabulary before it appears in code.",
          "Practical lessons keep the implementation small enough to inspect.",
          "Each code sample is plain HTML and JavaScript modules that can run directly in a browser dev server."
        ]
      }
    ],
    snippets: [],
    demo: {
      title: "Learning Path",
      mode: "timeline",
      text: "The tutorial moves from media concepts to browser APIs, then from hardcoded segments to manifest-driven streaming."
    }
  },
  {
    slug: "video-fundamentals",
    title: "Video Fundamentals",
    kind: "Theory",
    visual: "video",
    summary: "Understand the properties that define what a viewer sees before you think about files or streaming.",
    target: "You can explain resolution, aspect ratio, frame rate, colour gamut, and dynamic range in player terms.",
    checkpoint: "Given a video rendition, identify the viewing qualities that affect display, bandwidth, and compatibility.",
    reference: "https://developer.mozilla.org/en-US/docs/Web/Media/Formats/Video_codecs",
    sections: [
      {
        heading: "Spatial Detail",
        body: [
          "Resolution is the number of pixels in each frame. A 1920 by 1080 video has more samples of the image than a 1280 by 720 video, so it can preserve more detail when displayed at the same size.",
          "Aspect ratio is the shape of the picture, such as 16:9 or 4:3. Player layout should respect the encoded display shape so the image is not stretched or cropped by accident."
        ],
        points: [
          "Resolution affects sharpness, decode cost, and bandwidth.",
          "Display size and device pixel density decide whether extra resolution is visible.",
          "Aspect ratio belongs to presentation; it is not the same thing as file size or bitrate."
        ]
      },
      {
        heading: "Time And Motion",
        body: [
          "Frame rate is how many pictures are shown per second. Common values include 24 fps for film-like motion, 25 or 30 fps for broadcast and web video, and 50 or 60 fps for sport, games, and very smooth motion.",
          "Higher frame rates usually need more encoded samples per second. That can improve motion clarity, but it also raises decode work and often requires more bitrate for the same visual quality."
        ],
        points: [
          "A 60 fps stream has twice as many frame times as a 30 fps stream.",
          "The media timeline is continuous even though video frames are discrete.",
          "Audio is usually sampled much more frequently than video and must stay synchronized with it."
        ]
      },
      {
        heading: "Colour And Brightness",
        body: [
          "Colour gamut describes the range of colours a video can represent. SDR web video often uses Rec.709, while wider-gamut HDR content may use Rec.2020 signalling with colours that many older displays cannot fully show.",
          "Dynamic range describes the difference between dark and bright image detail. SDR targets a narrower range. HDR formats carry extra signalling so compatible displays can render brighter highlights and more shadow detail."
        ],
        points: [
          "Colour metadata helps the browser and display map encoded values to visible colours.",
          "HDR playback depends on the codec, container metadata, browser, OS, and display.",
          "A player should surface compatibility failures clearly instead of pretending every rendition is equivalent."
        ]
      }
    ],
    snippets: [
      {
        title: "Reading Video Metadata",
        explain: "The video element exposes decoded presentation dimensions after metadata loads.",
        code: `
const video = document.querySelector("video");

video.addEventListener("loadedmetadata", () => {
  console.log(video.videoWidth, video.videoHeight);
  console.log(video.duration);
});`
      }
    ],
    demo: {
      title: "Picture Properties",
      mode: "timeline",
      text: "Resolution, frame rate, colour, and dynamic range shape the media experience before the first network request happens."
    }
  },
  {
    slug: "media-files-codecs",
    title: "Media Files And Codecs",
    kind: "Theory",
    visual: "file",
    summary: "Learn what a media file contains and how codecs turn large raw signals into compressed samples.",
    target: "You can separate containers, metadata, encoded samples, bitrates, codecs, and frame dependencies.",
    checkpoint: "Explain why a player needs both container parsing and codec support.",
    reference: "https://developer.mozilla.org/en-US/docs/Web/Media/Formats/Containers",
    sections: [
      {
        heading: "What Makes Up A Media File",
        body: [
          "A media file is more than raw video and audio bytes. It normally contains structural headers, track metadata, timing information, codec configuration, and chunks of encoded media data.",
          "The container is the file format that organizes those parts. MP4, WebM, MPEG-TS, and Matroska are containers. They can carry different codec payloads, which is why saying a file is MP4 does not fully describe whether a browser can play it."
        ],
        points: [
          "Headers describe the container structure and where important information lives.",
          "Metadata describes tracks, durations, timescales, language, dimensions, and codec setup.",
          "Media data contains encoded audio and video samples ordered by decoding and presentation rules."
        ]
      },
      {
        heading: "Containers, Formats, And Bitrate",
        body: [
          "A container answers questions like: where is the audio track, where is the video track, what timestamps do samples use, and how should samples be grouped. A codec answers a different question: how do compressed samples become raw audio or video again.",
          "Bitrate is the amount of data used per second of media. A higher bitrate gives the encoder more room to preserve detail, but bitrate alone does not guarantee quality. Codec efficiency, source complexity, resolution, frame rate, and encoder settings all matter."
        ],
        points: [
          "MP4 with H.264 video and AAC audio is broadly compatible on the web.",
          "WebM with VP9 or AV1 can be efficient but support varies by device.",
          "For streaming, average bitrate helps predict download time and ABR decisions."
        ]
      },
      {
        heading: "Video Codecs And Frame Dependencies",
        body: [
          "Video codecs exploit the fact that nearby frames are often similar. Instead of storing every frame independently, they store some complete reference frames and many predicted frames that describe changes from other frames.",
          "A Group of Pictures, or GOP, is a run of frames built around these dependencies. I-frames are self-contained. P-frames predict from earlier frames. B-frames can predict from frames before and after their presentation time."
        ],
        points: [
          "I-frames are larger but useful for startup, seeking, and recovery.",
          "P-frames are smaller because they reuse previous reference information.",
          "B-frames improve compression but can make decode order differ from presentation order."
        ]
      },
      {
        heading: "Audio Codecs",
        body: [
          "Audio codecs compress a continuous sampled signal rather than a sequence of pictures. AAC, Opus, and MP3 use psychoacoustic models to spend bits where human hearing is most sensitive.",
          "Audio still has timing, frames, sample rates, channel layouts, and codec configuration. A player must keep audio and video clocks aligned even though their encoded structures are different."
        ],
        points: [
          "Sample rate describes audio samples per second, commonly 44.1 kHz or 48 kHz.",
          "Channel layout describes mono, stereo, surround, or object-based arrangements.",
          "Audio buffer underruns are often more noticeable than small video quality drops."
        ]
      }
    ],
    snippets: [
      {
        title: "Container Versus Codec",
        explain: "A browser support check needs both the container MIME type and codec identifiers.",
        code: `
const h264Aac = 'video/mp4; codecs="avc1.64001f, mp4a.40.2"';
const vp9Opus = 'video/webm; codecs="vp09.00.10.08, opus"';

console.log(MediaSource.isTypeSupported(h264Aac));
console.log(MediaSource.isTypeSupported(vp9Opus));`
      }
    ],
    demo: {
      title: "File Anatomy",
      mode: "packets",
      text: "A playable file combines container structure, metadata, codec setup, and encoded audio/video samples."
    }
  },
  {
    slug: "streaming-abr",
    title: "Streaming, Segments, And ABR",
    kind: "Theory",
    visual: "packets",
    summary: "Move from complete files to short timed chunks that a player can request, buffer, and switch between.",
    target: "You can explain TCP delivery, segments, renditions, throughput, bitrate ladders, and ABR tradeoffs.",
    checkpoint: "Trace one segment from an HTTP request to a buffered time range and an ABR decision.",
    reference: "https://developer.mozilla.org/en-US/docs/Web/Media/Audio_and_video_delivery",
    sections: [
      {
        heading: "From Files To Flows",
        body: [
          "On the network, media is delivered as bytes over HTTP, usually carried by TCP or by HTTP/3 over QUIC depending on the browser and server. The transport handles packetization, ordering, loss recovery, and congestion control.",
          "Your player usually does not see IP packets directly. It sees fetch responses. The important player question is when to request the next byte range or segment, and which quality level to request."
        ],
        points: [
          "Network packets are transport details; media segments are player-level units.",
          "HTTP caching and CDNs work well when media is split into addressable segment files.",
          "Segment duration affects latency, request overhead, and how quickly quality can switch."
        ]
      },
      {
        heading: "Segments",
        body: [
          "A segment covers a timed slice of media, often two to six seconds. It may be a standalone file or a byte range inside a larger file. For fragmented MP4, an initialization segment describes the track setup and media segments carry timed samples.",
          "Segments should begin at useful random access points so playback can start or switch quality without decoding a long chain of missing dependencies."
        ],
        points: [
          "Shorter segments can reduce live latency but increase request overhead.",
          "Longer segments are efficient but make switching and recovery slower.",
          "Aligned segment boundaries let a player switch representations at the same media time."
        ]
      },
      {
        heading: "Adaptive Bitrate",
        body: [
          "ABR is the player logic that chooses between multiple encoded representations. A representation is the same content encoded at a particular resolution, bitrate, codec profile, frame rate, or channel layout.",
          "A simple ABR algorithm compares estimated throughput, current buffer depth, and representation bitrate. If the buffer is healthy and downloads are fast, it can move up. If downloads slow down or the buffer shrinks, it should move down before playback stalls."
        ],
        points: [
          "The safest quality is the one that downloads comfortably faster than real time.",
          "Buffer-based ABR protects playback smoothness; throughput-based ABR reacts to network capacity.",
          "Good players avoid switching too often because visible quality oscillation is distracting."
        ]
      }
    ],
    snippets: [
      {
        title: "A Tiny ABR Heuristic",
        explain: "This intentionally simple selector picks the highest representation below a conservative bandwidth budget.",
        code: `
function chooseRepresentation(representations, throughputBps, bufferSeconds) {
  const safety = bufferSeconds > 12 ? 0.85 : 0.65;
  const budget = throughputBps * safety;

  return representations
    .filter((rep) => rep.bandwidth <= budget)
    .sort((a, b) => b.bandwidth - a.bandwidth)[0] ?? representations[0];
}`
      }
    ],
    demo: {
      title: "Segment Delivery",
      mode: "packets",
      text: "Streaming players request timed chunks, watch download speed, and choose the next representation before the buffer runs dry."
    }
  },
  {
    slug: "players-timelines-buffers",
    title: "Players, Timelines, And Buffers",
    kind: "Theory",
    visual: "buffer",
    summary: "Build the mental model for playback state before using Media Source Extensions.",
    target: "You understand media timelines, playheads, buffered ranges, seekable ranges, ready state, and stalls.",
    checkpoint: "Use browser media properties to explain why playback can start, seek, continue, or stall.",
    reference: "https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement",
    sections: [
      {
        heading: "The Media Timeline",
        body: [
          "A media element presents audio and video on a timeline measured in seconds. The playhead is the current playback position, exposed as currentTime. Duration is the known length for VOD, while live content may have a moving timeline instead of a fixed end.",
          "Decoded output must be scheduled against this timeline. Video frames have presentation times. Audio samples fill precise intervals. Synchronization means the browser advances both tracks using the same media clock."
        ],
        points: [
          "currentTime is the playhead position.",
          "duration is stable for VOD but can be Infinity or shifting for live.",
          "PlaybackRate changes how quickly the playhead advances through media time."
        ]
      },
      {
        heading: "Buffered Ranges",
        body: [
          "The buffered property is a TimeRanges object. It does not say how many bytes are downloaded; it says which time intervals the media element can play without more network data.",
          "Buffers can contain gaps. A player may have 0-10 seconds and 20-30 seconds buffered, but it will still stall when the playhead reaches 10 seconds unless the missing range is filled or the user seeks."
        ],
        points: [
          "Buffer depth usually means buffered end minus currentTime.",
          "Appending bytes does not guarantee a continuous range if timestamps do not line up.",
          "Eviction removes old data so memory does not grow forever."
        ]
      },
      {
        heading: "Seekable Ranges And Live Windows",
        body: [
          "Seekable ranges describe where the browser or player believes seeking is allowed. For a normal MP4 file, that may be most of the file once metadata is known. For live streams, it is usually a sliding window of recent media.",
          "A live player tracks the live edge, which is the newest available media time. It usually plays behind that edge by a target latency so downloads, decode, and small network delays have room to recover."
        ],
        points: [
          "Seekable is about what can be requested or reached, not only what is already buffered.",
          "Live windows move forward as old segments expire and new segments appear.",
          "A stall happens when the playhead reaches a time that is not buffered and cannot be decoded yet."
        ]
      }
    ],
    snippets: [
      {
        title: "Inspecting Timeline State",
        explain: "These properties are the foundation for the player decisions used later in the tutorial.",
        code: `
function describeRanges(label, ranges) {
  for (let i = 0; i < ranges.length; i += 1) {
    console.log(label, ranges.start(i), ranges.end(i));
  }
}

const video = document.querySelector("video");
console.log("playhead", video.currentTime);
describeRanges("buffered", video.buffered);
describeRanges("seekable", video.seekable);`
      }
    ],
    demo: {
      title: "Timed Queues",
      mode: "buffer",
      text: "A player succeeds when the playhead stays inside buffered, seekable, decodable media time."
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
          "A subtitle renderer does the same high-level job as an audio/video renderer: it watches media time, finds active cues, and paints the right output for that moment."
        ],
        points: [
          "Sidecar text is stored outside the audio/video container.",
          "Embedded or segmented subtitles can be carried through the same manifest and segment model as media.",
          "Accessibility depends on correct language, labels, timing, and caption kind."
        ]
      },
      {
        heading: "WebVTT",
        body: [
          "WebVTT is the most browser-friendly subtitle format for simple web players. It is plain text, starts with a WEBVTT header, and then lists cues with start time, end time, and cue text.",
          "The browser can fetch, parse, synchronize, and render WebVTT for you through a track element or the TextTrack API. That makes it the right first practical subtitle step."
        ],
        points: [
          "WebVTT is easy to hand-author and inspect.",
          "It supports cue settings for placement and alignment, but browser styling is intentionally constrained.",
          "It works well for sidecar subtitles and captions when you do not need complex layout."
        ]
      },
      {
        heading: "TTML",
        body: [
          "TTML, the Timed Text Markup Language, is XML-based and more expressive than WebVTT. It can describe regions, styles, timing, layout, nested spans, and richer broadcast-style subtitle behavior.",
          "That expressiveness comes with cost. A simple browser player cannot hand TTML to a native track element and expect the browser to render it. You either convert it to WebVTT, use a library, or implement the subset your content needs."
        ],
        points: [
          "TTML separates timing, styling, layout, and text content in XML.",
          "It is useful when subtitles need precise placement, styling, or broadcast workflow compatibility.",
          "A learning player should parse a small subset rather than trying to implement the whole specification."
        ]
      },
      {
        heading: "IMSC",
        body: [
          "IMSC is a constrained profile of TTML designed for interoperable subtitles and captions. It narrows the large TTML feature space into profiles that streaming, broadcast, and online services can implement more predictably.",
          "For this tutorial, treat IMSC as TTML with rules. The practical lab will parse a small text-profile subset: timed paragraphs, basic regions, simple styling, and text content. That is enough to understand the renderer loop without pulling in IMSC.js."
        ],
        points: [
          "IMSC documents are XML and commonly use TTML namespaces.",
          "IMSC text profile focuses on subtitle text; image profile can carry pre-rendered subtitle images.",
          "A custom renderer maps active timed elements onto absolutely positioned HTML over the video."
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
      },
      {
        title: "A Small IMSC Shape",
        explain: "IMSC is XML. This subset has one region and two timed paragraphs that a small renderer can understand.",
        code: `
<tt xmlns="http://www.w3.org/ns/ttml">
  <head>
    <layout>
      <region xml:id="bottom" />
    </layout>
  </head>
  <body>
    <div>
      <p begin="00:00:01.000" end="00:00:04.000" region="bottom">
        Big Buck Bunny starts in a quiet field.
      </p>
      <p begin="00:00:05.500" end="00:00:08.000" region="bottom">
        IMSC cues can carry richer layout information than WebVTT.
      </p>
    </div>
  </body>
</tt>`
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
    slug: "imsc-practical",
    title: "Render IMSC Subtitles",
    kind: "Practical",
    visual: "timeline",
    summary: "Replace native WebVTT rendering with a small custom IMSC renderer layered over the video.",
    target: "The tutorial player fetches a simple IMSC document, parses timed paragraphs, and paints active cues.",
    checkpoint: "A viewer sees IMSC subtitle text rendered by your JavaScript instead of the browser TextTrack renderer.",
    reference: "https://www.w3.org/TR/ttml-imsc1.2/",
    sections: [
      {
        heading: "Render A Useful Subset",
        body: [
          "IMSC is large enough that a full implementation should use a dedicated renderer. This lab deliberately does not do that. It parses only the subset needed to understand the moving parts: paragraph timing, region assignment, text content, and a simple overlay.",
          "The renderer listens to timeupdate and seeking events, checks which cues are active at video.currentTime, and updates an absolutely positioned layer above the video."
        ],
        points: [
          "Use DOMParser to parse the XML document.",
          "Convert begin and end attributes into seconds.",
          "Render active p elements into an overlay instead of creating native TextTrack cues."
        ]
      },
      {
        heading: "What This Does Not Implement",
        body: [
          "This lab ignores most of IMSC: complex styling inheritance, writing modes, ruby text, images, animation, frame-based timing, and full region layout. Those are important in production, but they would hide the core player idea.",
          "The useful pattern is the same as the DASH lesson: parse a standard format conservatively, represent the small subset you need, then wire that representation to playback time."
        ],
        points: [
          "Unsupported styling should fail harmlessly.",
          "Parsing and rendering stay separate so you can expand the subset later.",
          "The overlay should not block video controls or pointer interactions."
        ]
      }
    ],
    snippets: [
      {
        title: "imsc-renderer.js",
        explain: "This parser walks TTML/IMSC p elements, extracts timing, and renders active cues into a video overlay.",
        code: `
export async function installImscRenderer(video, url) {
  const cues = await loadImscCues(url);
  const overlay = createOverlay(video);

  function render() {
    const now = video.currentTime;
    const active = cues.filter((cue) => cue.begin <= now && now < cue.end);
    overlay.replaceChildren(...active.map(renderCue));
  }

  video.addEventListener("timeupdate", render);
  video.addEventListener("seeking", render);
  video.addEventListener("emptied", () => overlay.replaceChildren());
  render();
}

async function loadImscCues(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(\`Failed to fetch \${url}\`);

  const xml = await response.text();
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  return [...doc.getElementsByTagNameNS("*", "p")].map((node) => ({
    begin: parseClock(node.getAttribute("begin")),
    end: parseClock(node.getAttribute("end")),
    region: node.getAttribute("region") ?? "default",
    text: node.textContent.trim().replace(/\\s+/g, " ")
  }));
}

function createOverlay(video) {
  let stage = video.parentElement;
  if (!stage?.classList.contains("video-stage")) {
    stage = document.createElement("div");
    video.before(stage);
    stage.append(video);
  }
  stage.classList.add("video-stage");

  const overlay = document.createElement("div");
  overlay.className = "imsc-overlay";
  stage.append(overlay);
  return overlay;
}

function renderCue(cue) {
  const element = document.createElement("div");
  element.className = \`imsc-cue imsc-region-\${cue.region}\`;
  element.textContent = cue.text;
  return element;
}

function parseClock(value) {
  const match = /^(\\d+):(\\d{2}):(\\d{2}(?:\\.\\d+)?)$/.exec(value ?? "");
  if (!match) return 0;
  return Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]);
}`
      },
      {
        title: "imsc.css",
        explain: "The custom renderer needs a stage around the video and an overlay that does not intercept controls.",
        code: `
.video-stage {
  position: relative;
  width: fit-content;
}

.imsc-overlay {
  position: absolute;
  inset: 0;
  display: grid;
  align-items: end;
  justify-items: center;
  padding: 5%;
  pointer-events: none;
}

.imsc-cue {
  max-width: 80%;
  padding: 0.35rem 0.6rem;
  border-radius: 0.25rem;
  background: rgba(0, 0, 0, 0.78);
  color: white;
  font: 600 1.1rem/1.35 system-ui, sans-serif;
  text-align: center;
}`
      },
      {
        title: "Using The Renderer",
        explain: "Remove the WebVTT track setup and install the custom IMSC overlay instead.",
        code: `
import { installImscRenderer } from "./imsc-renderer.js";

const video = document.querySelector("#video");
await installImscRenderer(video, "./sample.ttml");`
      }
    ],
    demo: {
      title: "Custom Subtitle Overlay",
      mode: "timeline",
      text: "The renderer maps active IMSC paragraphs onto HTML above the video instead of using native WebVTT tracks."
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
