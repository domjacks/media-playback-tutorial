export const bbbMpd = "https://rdmedia.bbc.co.uk/bbb/2/client_manifest-avc1-high_profile.mpd";

export const lessons = [
  {
    slug: "introduction",
    title: "What You Will Build",
    kind: "Theory",
    summary: "A guided map of the tutorial, from media fundamentals to a working browser DASH player.",
    target: "You understand the learning path and how each theory topic supports the player you will build.",
    checkpoint: "Describe the route from media bytes to a browser player with DASH, live, subtitles, and optional DRM.",
    reference: "https://developer.mozilla.org/en-US/docs/Web/Media",
    blocks: [
      {
        type: "text",
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
        type: "diagram",
        visual: "timeline"
      },
      {
        type: "text",
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
      },
      {
        type: "demo",
        title: "Learning Path",
        mode: "timeline",
        text: "The tutorial moves from media concepts to browser APIs, then from hardcoded segments to manifest-driven streaming."
      }
    ]
  },
  {
    slug: "video-fundamentals",
    title: "Video Fundamentals",
    kind: "Theory",
    summary: "Understand the properties that define what a viewer sees before you think about files or streaming.",
    target: "You can explain resolution, aspect ratio, frame rate, colour gamut, and dynamic range in player terms.",
    checkpoint: "Given a video rendition, identify the viewing qualities that affect display, bandwidth, and compatibility.",
    reference: "https://developer.mozilla.org/en-US/docs/Web/Media/Formats/Video_codecs",
    blocks: [
      {
        type: "text",
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
        type: "diagram",
        visual: "video"
      },
      {
        type: "code",
        title: "Reading Video Metadata",
        explain: "The video element exposes decoded presentation dimensions after metadata loads.",
        code: `
const video = document.querySelector("video");

video.addEventListener("loadedmetadata", () => {
  console.log(video.videoWidth, video.videoHeight);
  console.log(video.duration);
});`
      },
      {
        type: "text",
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
        type: "text",
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
      },
      {
        type: "demo",
        title: "Picture Properties",
        mode: "timeline",
        text: "Resolution, frame rate, colour, and dynamic range shape the media experience before the first network request happens."
      }
    ]
  },
  {
    slug: "media-files-containers",
    title: "Media Files And Containers",
    kind: "Theory",
    summary: "Learn what a media file contains and how containers organize tracks, timing, metadata, and media data.",
    target: "You can separate file structure, container metadata, tracks, samples, and codec identifiers.",
    checkpoint: "Explain why a player needs container parsing before it can feed encoded samples to a decoder.",
    reference: "https://developer.mozilla.org/en-US/docs/Web/Media/Formats/Containers",
    blocks: [
      {
        type: "text",
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
        type: "diagram",
        visual: "file"
      },
      {
        type: "code",
        title: "Container Versus Codec",
        explain: "A browser support check needs both the container MIME type and codec identifiers.",
        code: `
const h264Aac = 'video/mp4; codecs="avc1.64001f, mp4a.40.2"';
const vp9Opus = 'video/webm; codecs="vp09.00.10.08, opus"';

console.log(MediaSource.isTypeSupported(h264Aac));
console.log(MediaSource.isTypeSupported(vp9Opus));`
      },
      {
        type: "text",
        heading: "Containers, Formats, And Bitrate",
        body: [
          "A container answers questions like: where is the audio track, where is the video track, what timestamps do samples use, and how should samples be grouped. A codec answers a different question: how do compressed samples become raw audio or video again.",
          "Bitrate is the amount of data used per second of media. The container records enough timing information for the browser to place those encoded samples onto a media timeline."
        ],
        points: [
          "MP4 with H.264 video and AAC audio is broadly compatible on the web.",
          "WebM with VP9 or AV1 can be efficient but support varies by device.",
          "For streaming, average bitrate helps predict download time and ABR decisions."
        ]
      },
      {
        type: "demo",
        title: "File Anatomy",
        mode: "packets",
        text: "A playable file combines container structure, metadata, track timing, and encoded audio/video samples."
      }
    ]
  },
  {
    slug: "codecs-compression",
    title: "Codecs And Compression",
    kind: "Theory",
    summary: "See why raw camera video is enormous and how codecs reduce it with sampling, prediction, and frame dependencies.",
    target: "You can calculate raw video data rate and explain why I-frames, P-frames, B-frames, and audio codecs exist.",
    checkpoint: "Work through the 1920x1080, 10-bit, 25 fps example and explain why a compressed bitrate is necessary.",
    reference: "https://developer.mozilla.org/en-US/docs/Web/Media/Formats/Video_codecs",
    blocks: [
      {
        type: "text",
        heading: "Raw Video Is Huge",
        body: [
          "A camera does not start with H.264 or AV1. It starts with samples that describe light. In this example, each frame has a Y plane at 1920 by 1080, a Cb plane at 960 by 1080, and a Cr plane at 960 by 1080.",
          "Y is luma, the brightness detail. Cb and Cr are chroma difference samples. They are 960 pixels wide here because each chroma sample is shared across a pair of horizontal luma samples, so the colour information is sampled at half the horizontal resolution."
        ],
        points: [
          "Y samples per frame: 1920 x 1080 = 2,073,600.",
          "Cb samples per frame: 960 x 1080 = 1,036,800.",
          "Cr samples per frame: 960 x 1080 = 1,036,800."
        ]
      },
      {
        type: "diagram",
        visual: "codec"
      },
      {
        type: "code",
        title: "Raw Video Data Rate",
        explain: "This calculation shows the uncompressed byte rate for the example camera signal.",
        code: `
const y = 1920 * 1080;
const cb = 960 * 1080;
const cr = 960 * 1080;
const bitsPerSample = 10;
const framesPerSecond = 25;
const bitsPerByte = 8;

const samplesPerFrame = y + cb + cr;
const bitsPerFrame = samplesPerFrame * bitsPerSample;
const bytesPerSecond = (bitsPerFrame * framesPerSecond) / bitsPerByte;

console.log(samplesPerFrame); // 4147200
console.log(bytesPerSecond);  // 129600000`
      },
      {
        type: "text",
        heading: "The Maths",
        body: [
          "Add the three planes together and one frame contains 4,147,200 component samples. At 10 bits per sample, that is 41,472,000 bits for one frame.",
          "At 25 frames per second, the stream is 1,036,800,000 bits per second. Divide by 8 bits in a byte and you get 129,600,000 bytes per second, before audio, headers, metadata, or transport overhead."
        ],
        points: [
          "That is about 129.6 MB/s, or about 123.6 MiB/s.",
          "It is also about 1.04 Gbit/s.",
          "This is why web video is compressed before it is stored, streamed, or played."
        ]
      },
      {
        type: "text",
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
        type: "text",
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
      },
      {
        type: "code",
        title: "Codec Support Check",
        explain: "A browser support check needs both the container MIME type and codec identifiers.",
        code: `
const h264Aac = 'video/mp4; codecs="avc1.64001f, mp4a.40.2"';
const vp9Opus = 'video/webm; codecs="vp09.00.10.08, opus"';

console.log(MediaSource.isTypeSupported(h264Aac));
console.log(MediaSource.isTypeSupported(vp9Opus));`
      },
      {
        type: "demo",
        title: "Compression Pressure",
        mode: "packets",
        text: "Raw samples quickly become hundreds of megabytes per second, so codecs reduce the signal before streaming."
      }
    ]
  },
  {
    slug: "fragmented-mp4-cmaf",
    title: "Fragmented MP4 And CMAF",
    kind: "Theory",
    summary: "Bridge the gap between encoded samples and the small appendable media pieces used by MSE, DASH, HLS, and CMAF.",
    target: "You understand init segments, media segments, MP4 boxes, timestamps, and why CMAF exists.",
    checkpoint: "Explain why MSE needs initialization data before media fragments and how a segment maps onto media time.",
    reference: "https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Formats/Containers",
    blocks: [
      {
        type: "text",
        heading: "Why Fragment MP4",
        body: [
          "A normal MP4 file is usually designed as one complete object. That is fine when the browser can fetch the file directly, but streaming players need smaller timed pieces that can be requested, appended, cached, and switched between.",
          "Fragmented MP4, usually written as fMP4, keeps MP4 container structure but splits media into an initialization segment followed by media fragments. This is the shape that MSE commonly expects for DASH and modern HLS."
        ],
        points: [
          "The initialization segment describes tracks, timescales, codec configuration, dimensions, and other setup data.",
          "Media segments carry timed encoded samples for a short range of playback.",
          "The browser needs the init segment first so it can interpret later media fragments."
        ]
      },
      {
        type: "diagram",
        visual: "fmp4"
      },
      {
        type: "code",
        title: "fMP4 Mental Model",
        explain: "You will append this order repeatedly when using MSE: setup first, then timed fragments.",
        code: `
Initialization segment
  ftyp
  moov
    tracks
    timescales
    codec configuration

Media segment
  moof
    fragment decode time
    sample timing and sizes
  mdat
    encoded audio or video samples`
      },
      {
        type: "text",
        heading: "Boxes You Will See",
        body: [
          "MP4 is made of boxes. Each box has a type and a payload. You do not need to hand-parse every box for this tutorial, but knowing the common names makes MSE errors easier to reason about.",
          "An init segment normally includes ftyp and moov. A media segment normally includes moof and mdat. The moof box describes the fragment timing and sample layout. The mdat box carries the encoded sample bytes."
        ],
        points: [
          "ftyp identifies the MP4 brand and compatibility.",
          "moov contains movie and track metadata, including codec setup.",
          "moof contains fragment metadata such as decode time and sample runs.",
          "mdat contains the encoded audio or video samples."
        ]
      },
      {
        type: "text",
        heading: "Timestamps And Timeline Mapping",
        body: [
          "A media fragment is not just bytes; it is bytes for a time range. The container tells the browser how sample decode times and presentation times map onto the media element timeline.",
          "This is why append order and timestamp continuity matter. If two fragments have a timing gap or overlap, the video element can expose disjoint buffered ranges or stall when the playhead reaches the gap."
        ],
        points: [
          "Track timescales convert integer timestamps into seconds.",
          "Decode time is when the decoder needs a sample; presentation time is when the viewer should see or hear it.",
          "B-frames can make decode order differ from presentation order."
        ]
      },
      {
        type: "text",
        heading: "Where CMAF Fits",
        body: [
          "CMAF, the Common Media Application Format, standardizes a constrained fMP4 style for streaming. Its goal is to let DASH and HLS reuse the same encoded media segments instead of requiring completely separate packaging.",
          "CMAF also defines chunks, which are smaller pieces inside a fragment. Low-latency streaming can send chunks before the whole segment is complete, reducing the time between capture and playback."
        ],
        points: [
          "CMAF is not a player API; it is a media packaging format.",
          "DASH and HLS can both reference CMAF media.",
          "For this tutorial, CMAF explains why the same fMP4 fragments can appear in multiple streaming protocols."
        ]
      },
      {
        type: "code",
        title: "Buffered Ranges Depend On Timestamps",
        explain: "After appending bytes, inspect buffered time rather than assuming downloaded bytes equal playable media.",
        code: `
function logBuffered(video) {
  for (let i = 0; i < video.buffered.length; i += 1) {
    console.log(video.buffered.start(i), video.buffered.end(i));
  }
}`
      },
      {
        type: "demo",
        title: "Appendable Fragments",
        mode: "timeline",
        text: "fMP4 turns encoded samples into timed fragments that MSE can append and expose as buffered media ranges."
      }
    ]
  },
  {
    slug: "players-timelines-buffers",
    title: "Players, Timelines, And Buffers",
    kind: "Theory",
    summary: "Build the mental model for playback state before using Media Source Extensions.",
    target: "You understand media timelines, playheads, buffered ranges, seekable ranges, ready state, and stalls.",
    checkpoint: "Use browser media properties to explain why playback can start, seek, continue, or stall.",
    reference: "https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement",
    blocks: [
      {
        type: "text",
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
        type: "diagram",
        visual: "buffer"
      },
      {
        type: "diagram",
        visual: "av-sync"
      },
      {
        type: "code",
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
      },
      {
        type: "text",
        heading: "One Timeline, Multiple Buffers",
        body: [
          "A media element has one currentTime even when audio and video arrive through separate SourceBuffers. The browser synchronizes decoded audio samples and video frames against that shared media timeline.",
          "That means the player must keep both tracks fed. If video is buffered to 20 seconds but audio is only buffered to 8 seconds, playback can still stall around 8 seconds because the media element cannot present complete synchronized output."
        ],
        points: [
          "Separate SourceBuffers do not create separate playheads.",
          "Audio and video timestamps must describe the same media timeline.",
          "A healthy buffer means the playhead has enough audio and video ahead of it."
        ]
      },
      {
        type: "text",
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
        type: "text",
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
      },
      {
        type: "demo",
        title: "Timed Queues",
        mode: "buffer",
        text: "A player succeeds when the playhead stays inside buffered, seekable, decodable media time."
      }
    ]
  },
  {
    slug: "progressive-download",
    title: "Progressive Download Playback",
    kind: "Practical",
    summary: "Play a normal MP4 with the video element before taking control of media bytes with MSE.",
    target: "A plain HTML page plays a progressively downloaded MP4 using video.src and browser-native fetching.",
    checkpoint: "The video element loads metadata, exposes buffered/seekable ranges, and plays without custom fetch or SourceBuffer code.",
    reference: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/video",
    blocks: [
      {
        type: "text",
        heading: "Let The Browser Be The Player",
        body: [
          "The simplest web media player is a video element with a src. You give the browser a URL to a media resource, and the browser handles fetching, buffering, demuxing, decoding, A/V sync, seeking, and controls.",
          "This is called progressive download. The browser can start playback before the whole file has downloaded, but the resource is still one media file rather than a manifest plus many short segments."
        ],
        points: [
          "The browser decides when to request data and may use HTTP Range requests.",
          "Your JavaScript observes state instead of supplying media bytes.",
          "This is ideal for simple VOD files and not enough for adaptive streaming."
        ]
      },
      {
        type: "diagram",
        visual: "buffer"
      },
      {
        type: "code",
        title: "index.html",
        explain: "A progressive player can be this small: the browser sees src and starts its own load algorithm.",
        code: `
<video
  id="video"
  controls
  preload="metadata"
  width="800"
  src="https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4">
</video>

<script type="module" src="./player.js"></script>`
      },
      {
        type: "text",
        heading: "What The Browser Expects",
        body: [
          "The URL should point to a browser-supported media file, such as MP4 with H.264/AAC or WebM with VP9/Opus. The server should send the correct Content-Type and ideally support byte ranges so seeking does not require downloading the entire file.",
          "For MP4, metadata placement matters. If the important movie metadata is near the beginning of the file, the browser can discover duration, tracks, and dimensions quickly. If metadata is only at the end, startup can be slower."
        ],
        points: [
          "A single src works when the browser can handle the container and codecs by itself.",
          "The video element populates properties like duration, videoWidth, buffered, seekable, and readyState.",
          "You do not get to choose individual qualities, segments, or append order."
        ]
      },
      {
        type: "code",
        title: "player.js",
        explain: "This code observes what the browser is doing instead of fetching media bytes itself.",
        code: `
const video = document.querySelector("#video");

video.addEventListener("loadedmetadata", () => {
  console.log("duration", video.duration);
  console.log("size", video.videoWidth, video.videoHeight);
  logRanges("seekable", video.seekable);
});

video.addEventListener("progress", () => {
  logRanges("buffered", video.buffered);
});

video.addEventListener("canplay", () => {
  console.log("ready to play", video.readyState);
});

function logRanges(label, ranges) {
  for (let i = 0; i < ranges.length; i += 1) {
    console.log(label, ranges.start(i), ranges.end(i));
  }
}`
      },
      {
        type: "text",
        heading: "Why This Comes Before MSE",
        body: [
          "Progressive playback teaches the baseline media element lifecycle. MSE keeps the same video element and media timeline, but replaces browser-managed file fetching with JavaScript-managed byte appends.",
          "If progressive download is enough for your product, use it. Reach for MSE when you need manifest-driven streaming, adaptive bitrate, custom buffering strategy, live playback, or tighter integration with timed side data."
        ],
        points: [
          "Progressive: one URL, browser-managed bytes.",
          "MSE: one media element, JavaScript-managed bytes.",
          "DASH/HLS: manifests describe which bytes should be fetched."
        ]
      },
      {
        type: "code",
        title: "What src Triggers",
        explain: "Setting src starts a browser-owned pipeline. Later MSE lessons replace only the fetch/demux input side.",
        code: `
video.src = url
  -> browser fetches bytes
  -> browser parses the container
  -> browser detects tracks and codecs
  -> browser decodes audio/video samples
  -> video.currentTime advances on one shared timeline`
      },
      {
        type: "demo",
        title: "Browser-Managed Playback",
        mode: "buffer",
        text: "With progressive download, the browser owns network loading and buffering while JavaScript observes media state."
      }
    ]
  },
  {
    slug: "streaming-segments",
    title: "Streaming And Segments",
    kind: "Theory",
    summary: "Move from complete files to short timed chunks that a player can request and buffer.",
    target: "You can explain HTTP delivery, segments, renditions, initialization data, and timed media chunks.",
    checkpoint: "Trace one segment from an HTTP request to a buffered time range.",
    reference: "https://developer.mozilla.org/en-US/docs/Web/Media/Audio_and_video_delivery",
    blocks: [
      {
        type: "text",
        heading: "From Files To Flows",
        body: [
          "On the network, media is delivered as bytes over HTTP, usually carried by TCP or by HTTP/3 over QUIC depending on the browser and server. The transport handles packetization, ordering, loss recovery, and congestion control.",
          "In progressive download, the browser decides when to request bytes from one file. In segmented streaming, the player or streaming engine requests explicit timed chunks."
        ],
        points: [
          "Network packets are transport details; media segments are player-level units.",
          "HTTP caching and CDNs work well when media is split into addressable segment files.",
          "Segment duration affects latency, request overhead, cacheability, and recovery time."
        ]
      },
      {
        type: "diagram",
        visual: "packets"
      },
      {
        type: "code",
        title: "Segment Request Loop",
        explain: "Before ABR, the core streaming loop is simply request a segment, append it, then move to the next segment.",
        code: `
async function appendSegments(sourceBuffer, segments) {
  const queue = [...segments];

  sourceBuffer.addEventListener("updateend", async () => {
    if (!queue.length) return;
    const segment = queue.shift();
    sourceBuffer.appendBuffer(await fetchBytes(segment.url));
  });
}`
      },
      {
        type: "text",
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
        type: "text",
        heading: "Renditions",
        body: [
          "Streaming media is commonly encoded into multiple renditions. Each rendition represents the same content at a particular resolution, bitrate, codec profile, frame rate, or channel layout.",
          "For now, think of those renditions as available choices. The player will learn how to choose between them after the DASH lesson, once it has a manifest parser that can actually see every Representation."
        ],
        points: [
          "A rendition is useful only if its codec and container are supported by the browser.",
          "Representations need aligned segment timing before a player can switch cleanly.",
          "The manifest is where the player discovers these choices."
        ]
      },
      {
        type: "demo",
        title: "Segment Delivery",
        mode: "packets",
        text: "Streaming players request timed chunks and append enough future media to keep playback moving."
      }
    ]
  },
  {
    slug: "mse-basics",
    title: "Build A Tiny MSE Player",
    kind: "Practical",
    summary: "Use Media Source Extensions to append initialization and media segments into a video element.",
    target: "A plain HTML page and ESM module append remote Big Buck Bunny audio/video bytes to SourceBuffers.",
    checkpoint: "The video element plays audio and video that JavaScript fetched and appended.",
    reference: "https://rdmedia.bbc.co.uk/bbb/",
    blocks: [
      {
        type: "text",
        heading: "Start With The Same Video Element",
        body: [
          "A progressive player gives the video element a src that points directly at a media file. An MSE player still uses the video element for playback, decoding, controls, timing, and A/V sync, but JavaScript supplies the media bytes.",
          "That means this lab keeps the HTML small. The interesting work moves into player.js, where you create a MediaSource and feed it initialization plus media segments."
        ],
        points: [
          "There is no src URL in the HTML.",
          "The video element still owns the playhead and controls.",
          "Your JavaScript owns the network requests."
        ]
      },
      {
        type: "diagram",
        visual: "buffer"
      },
      {
        type: "diagram",
        visual: "av-sync"
      },
      {
        type: "code",
        title: "index.html",
        explain: "This file keeps the user app deliberately small: one video element and one browser ESM entrypoint.",
        code: `
<video id="video" controls width="800"></video>
<script type="module" src="./player.js"></script>`
      },
      {
        type: "code",
        title: "Create MediaSource",
        explain: "MediaSource is the browser object that will receive media bytes from your JavaScript.",
        code: `
const video = document.querySelector("#video");
const mediaSource = new MediaSource();`
      },
      {
        type: "text",
        heading: "Create And Attach A MediaSource",
        body: [
          "MediaSource is the object that represents a JavaScript-fed media stream. You attach it to the video element by creating an object URL and assigning that URL to video.src.",
          "When the MediaSource opens, the browser is ready for you to add SourceBuffers. A SourceBuffer accepts bytes for one kind of track, such as video/mp4 or audio/mp4."
        ],
        points: [
          "Create MediaSource in JavaScript.",
          "Attach it with URL.createObjectURL(mediaSource).",
          "Wait for sourceopen before adding SourceBuffers."
        ]
      },
      {
        type: "code",
        title: "Attach It To The Video Element",
        explain: "The object URL lets the video element treat your MediaSource as its media resource.",
        code: `
video.src = URL.createObjectURL(mediaSource);

mediaSource.addEventListener("sourceopen", async () => {
  console.log("MediaSource is open");
});`
      },
      {
        type: "code",
        title: "Describe The Tracks",
        explain: "This lab uses one video track and one audio track from the BBC Big Buck Bunny DASH stream. The first file for each track is the initialization segment.",
        code: `
const base = "https://vod-dash-ww-rd-live.akamaized.net/bbb/2";
const tracks = [
  {
    mime: 'video/mp4; codecs="avc1.64001f"',
    files: [
      \`\${base}/avc1/896x504p25/IS.mp4\`,
      \`\${base}/avc1/896x504p25/000001.m4s\`,
      \`\${base}/avc1/896x504p25/000002.m4s\`,
      \`\${base}/avc1/896x504p25/000003.m4s\`
    ]
  },
  {
    mime: 'audio/mp4; codecs="mp4a.40.2"',
    files: [
      \`\${base}/audio/160kbps/IS.mp4\`,
      \`\${base}/audio/128kbps/000001.m4s\`,
      \`\${base}/audio/128kbps/000002.m4s\`,
      \`\${base}/audio/128kbps/000003.m4s\`
    ]
  }
];`
      },
      {
        type: "text",
        heading: "Append Init Before Media",
        body: [
          "Fragmented MP4 separates track setup from timed media data. The initialization segment describes codec setup, timescale, and track metadata. The media segments then carry timed samples.",
          "The browser needs the initialization segment first. After that, each media segment extends the buffered time range for its track."
        ],
        points: [
          "Init segments usually have names such as IS.mp4 or init.mp4.",
          "Media segments often have names such as 000001.m4s.",
          "Audio and video segments must describe the same media timeline."
        ]
      },
      {
        type: "code",
        title: "Add SourceBuffers",
        explain: "Create one SourceBuffer for each MIME type. The browser uses the codec string to decide whether it can decode the bytes you append.",
        code: `
const sourceBuffers = tracks.map((track) => ({
  ...track,
  sourceBuffer: mediaSource.addSourceBuffer(track.mime)
}));`
      },
      {
        type: "code",
        title: "Append A Queue",
        explain: "appendBuffer is asynchronous. This helper waits for updateend before feeding the next chunk to the same SourceBuffer.",
        code: `
function appendAll(sourceBuffer, queue) {
  return new Promise((resolve) => {
    sourceBuffer.addEventListener("updateend", () => {
      if (!queue.length) return resolve();
      sourceBuffer.appendBuffer(queue.shift());
    });
    sourceBuffer.appendBuffer(queue.shift());
  });
}`
      },
      {
        type: "text",
        heading: "Respect The Append Queue",
        body: [
          "A SourceBuffer can process only one append at a time. While sourceBuffer.updating is true, another appendBuffer call will fail. The simplest beginner-safe pattern is to append one chunk, wait for updateend, then append the next chunk.",
          "In this first MSE player, the segment list is hardcoded. The DASH lesson replaces those hardcoded URLs with a manifest parser."
        ],
        points: [
          "Only append while the SourceBuffer is not updating.",
          "Use precise MIME types and codec strings supported by the browser.",
          "Call endOfStream when all audio and video bytes have been appended."
        ]
      },
      {
        type: "code",
        title: "Fetch And Append Bytes",
        explain: "Once the MediaSource is open, create the SourceBuffers, fetch each init/media segment, append each track queue, then close the stream.",
        code: `
mediaSource.addEventListener("sourceopen", async () => {
  await Promise.all(tracks.map(async (track) => {
    const sourceBuffer = mediaSource.addSourceBuffer(track.mime);
    const queue = await Promise.all(track.files.map(fetchBytes));
    await appendAll(sourceBuffer, queue);
  }));

  mediaSource.endOfStream();
});

async function fetchBytes(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(\`Failed to fetch \${url}\`);
  return response.arrayBuffer();
}`
      },
      {
        type: "code",
        title: "Complete player.js",
        explain: "This complete file is runnable as-is beside the index.html from the first snippet.",
        code: `
const video = document.querySelector("#video");
const base = "https://vod-dash-ww-rd-live.akamaized.net/bbb/2";

const tracks = [
  {
    mime: 'video/mp4; codecs="avc1.64001f"',
    files: [
      \`\${base}/avc1/896x504p25/IS.mp4\`,
      \`\${base}/avc1/896x504p25/000001.m4s\`,
      \`\${base}/avc1/896x504p25/000002.m4s\`,
      \`\${base}/avc1/896x504p25/000003.m4s\`
    ]
  },
  {
    mime: 'audio/mp4; codecs="mp4a.40.2"',
    files: [
      \`\${base}/audio/160kbps/IS.mp4\`,
      \`\${base}/audio/128kbps/000001.m4s\`,
      \`\${base}/audio/128kbps/000002.m4s\`,
      \`\${base}/audio/128kbps/000003.m4s\`
    ]
  }
];

const mediaSource = new MediaSource();
video.src = URL.createObjectURL(mediaSource);

mediaSource.addEventListener("sourceopen", async () => {
  await Promise.all(tracks.map(async (track) => {
    const sourceBuffer = mediaSource.addSourceBuffer(track.mime);
    const queue = await Promise.all(track.files.map(fetchBytes));
    await appendAll(sourceBuffer, queue);
  }));

  mediaSource.endOfStream();
});

function appendAll(sourceBuffer, queue) {
  return new Promise((resolve) => {
    sourceBuffer.addEventListener("updateend", () => {
      if (!queue.length) return resolve();
      sourceBuffer.appendBuffer(queue.shift());
    });
    sourceBuffer.appendBuffer(queue.shift());
  });
}

async function fetchBytes(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(\`Failed to fetch \${url}\`);
  return response.arrayBuffer();
}`
      },
      {
        type: "demo",
        title: "SourceBuffer Queue",
        mode: "buffer",
        text: "Append operations are serialized. The browser parses each fragment and expands the playable timeline."
      }
    ]
  },
  {
    slug: "protocols",
    title: "DASH And HLS Theory",
    kind: "Theory",
    summary: "Replace hardcoded segment lists with manifests that describe time, quality, codecs, and URLs.",
    target: "You understand why DASH MPDs and HLS playlists exist and what a player reads from them.",
    checkpoint: "Given a manifest, identify representations, init segments, media segment templates, and durations.",
    reference: "https://dashif.org/docs/DASH-IF-IOP-v4.3.pdf",
    blocks: [
      {
        type: "text",
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
      },
      {
        type: "diagram",
        visual: "timeline"
      },
      {
        type: "code",
        title: "A Tiny MPD Mental Model",
        explain: "This is the shape your parser will walk in the next lesson.",
        code: `
MPD
  Period
    AdaptationSet mimeType="video/mp4"
      Representation bandwidth="..."
        SegmentTemplate initialization="..." media="..." duration="..."`
      },
      {
        type: "demo",
        title: "Manifest To Timeline",
        mode: "timeline",
        text: "A manifest maps segment numbers to timeline ranges so the player can request just enough future media."
      }
    ]
  },
  {
    slug: "dash-vod",
    title: "Parse DASH VOD",
    kind: "Practical",
    summary: "Update the MSE player so it fetches an MPD and appends the audio/video segments described by the manifest.",
    target: "A browser ESM player fetches the BBC Big Buck Bunny MPD and plays audio plus video from manifest-derived segments.",
    checkpoint: "Playback starts from manifest-derived video and audio initialization/media URLs.",
    reference: "https://rdmedia.bbc.co.uk/bbb/2/client_manifest-avc1-high_profile.mpd",
    blocks: [
      {
        type: "text",
        heading: "Parser Boundaries",
        body: [
          "A learning player should parse the subset it needs. For this tutorial, support one Period, one video AdaptationSet, one audio AdaptationSet, Representations, BaseURL, and SegmentTemplate URLs using $Number$ replacement.",
          "The MPD tells you the base URL, codec string, initialization URL, media URL pattern, start number, duration, and total presentation duration. That is enough to request sequential VOD audio and video segments."
        ],
        points: [
          "Use DOMParser instead of string splitting XML.",
          "Resolve segment URLs with new URL(relative, manifestUrl).",
          "Keep append sequencing isolated from manifest parsing."
        ]
      },
      {
        type: "diagram",
        visual: "timeline"
      },
      {
        type: "diagram",
        visual: "av-sync"
      },
      {
        type: "code",
        title: "dash.js",
        explain: "This parser intentionally supports the small BBC DASH subset used by the tutorial: one Period, audio/video AdaptationSets, BaseURL, and SegmentTemplate.",
        code: `
export async function loadDashVod(mpdUrl) {
  const response = await fetch(mpdUrl);
  if (!response.ok) throw new Error(\`Failed to fetch \${mpdUrl}\`);
  const xml = await response.text();
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  const videoSet = findAdaptation(doc, "video/mp4");
  const audioSet = findAdaptation(doc, "audio/mp4");
  const video = parseAdaptation(videoSet, doc, response.url);
  const audio = parseAdaptation(audioSet, doc, response.url);

  return {
    video: chooseLowest(video),
    audio: chooseHighest(audio),
    representations: { video, audio }
  };
}

function findAdaptation(doc, mimeType) {
  return [...doc.querySelectorAll("AdaptationSet")]
    .find((set) => set.getAttribute("mimeType") === mimeType);
}

function parseAdaptation(adaptation, doc, mpdUrl) {
  const template = adaptation.querySelector("SegmentTemplate");
  const baseUrl = new URL(adaptation.querySelector("BaseURL").textContent.trim(), mpdUrl).href;
  const timescale = Number(template.getAttribute("timescale") ?? 1);
  const duration = Number(template.getAttribute("duration"));
  const startNumber = Number(template.getAttribute("startNumber") ?? 1);
  const segmentSeconds = duration / timescale;
  const totalSeconds = parseIsoDuration(doc.documentElement.getAttribute("mediaPresentationDuration"));
  const segmentCount = Math.min(36, Math.ceil(totalSeconds / segmentSeconds));

  return [...adaptation.querySelectorAll("Representation")].map((representation) => {
    const codecs = [adaptation.getAttribute("codecs"), representation.getAttribute("codecs")]
      .filter(Boolean)
      .join(", ");

    return {
      id: representation.id,
      bandwidth: Number(representation.getAttribute("bandwidth") ?? 0),
      mime: \`\${adaptation.getAttribute("mimeType")}; codecs="\${codecs}"\`,
      init: new URL(format(template.getAttribute("initialization"), representation.id), baseUrl).href,
      segments: Array.from({ length: segmentCount }, (_, index) => {
        const number = startNumber + index;
        return {
          number,
          url: new URL(format(template.getAttribute("media"), representation.id, number), baseUrl).href
        };
      })
    };
  });
}

function format(pattern, id, number = "") {
  return pattern
    .replaceAll("$RepresentationID$", id)
    .replace(/\\$Number%0(\\d+)d\\$/g, (_, width) => String(number).padStart(Number(width), "0"))
    .replaceAll("$Number$", number);
}

function chooseLowest(representations) {
  return [...representations].sort((a, b) => a.bandwidth - b.bandwidth)[0];
}

function chooseHighest(representations) {
  return [...representations].sort((a, b) => a.bandwidth - b.bandwidth).at(-1);
}

function parseIsoDuration(value) {
  const match = /PT(?:(\\d+)H)?(?:(\\d+)M)?(?:(\\d+(?:\\.\\d+)?)S)?/.exec(value ?? "");
  if (!match) return 0;
  return Number(match[1] ?? 0) * 3600 + Number(match[2] ?? 0) * 60 + Number(match[3] ?? 0);
}`
      },
      {
        type: "code",
        title: "player.js With DASH",
        explain: "The player no longer knows segment filenames. It asks the manifest parser for selected audio and video representations.",
        code: `
import { loadDashVod } from "./dash.js";

const mpdUrl = "https://rdmedia.bbc.co.uk/bbb/2/client_manifest-avc1-high_profile.mpd";
const video = document.querySelector("#video");
const dash = await loadDashVod(mpdUrl);

if (!MediaSource.isTypeSupported(dash.video.mime)) {
  throw new Error(\`Unsupported video type: \${dash.video.mime}\`);
}
if (!MediaSource.isTypeSupported(dash.audio.mime)) {
  throw new Error(\`Unsupported audio type: \${dash.audio.mime}\`);
}

const mediaSource = new MediaSource();
video.src = URL.createObjectURL(mediaSource);

mediaSource.addEventListener("sourceopen", async () => {
  const videoBuffer = mediaSource.addSourceBuffer(dash.video.mime);
  const audioBuffer = mediaSource.addSourceBuffer(dash.audio.mime);

  await Promise.all([
    appendTrack(videoBuffer, [dash.video.init, ...dash.video.segments.map((segment) => segment.url)]),
    appendTrack(audioBuffer, [dash.audio.init, ...dash.audio.segments.map((segment) => segment.url)])
  ]);

  mediaSource.endOfStream();
});

function appendTrack(sourceBuffer, urls) {
  const queue = [...urls];
  return new Promise((resolve) => {
    sourceBuffer.addEventListener("updateend", () => {
      if (!queue.length) return resolve();
      appendUrl(sourceBuffer, queue.shift());
    });
    appendUrl(sourceBuffer, queue.shift());
  });
}

async function appendUrl(sourceBuffer, url) {
  sourceBuffer.appendBuffer(await fetchBytes(url));
}

async function fetchBytes(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(\`Failed to fetch \${url}\`);
  return response.arrayBuffer();
}`
      },
      {
        type: "demo",
        title: "MPD Loader",
        mode: "timeline",
        text: "Manifest fields become concrete segment requests, then each response feeds the same MSE append queue."
      }
    ]
  },
  {
    slug: "adaptive-bitrate",
    title: "Adaptive Bitrate",
    kind: "Practical",
    summary: "Use the DASH representations you parsed to choose a quality level from network and buffer signals.",
    target: "The DASH player selects the initial video representation with a small ABR algorithm instead of always hardcoding one quality.",
    checkpoint: "The player can explain why it picked a startup representation and can choose a safer one when conditions are poor.",
    reference: "https://developer.mozilla.org/en-US/docs/Web/API/Network_Information_API",
    blocks: [
      {
        type: "text",
        heading: "What ABR Decides",
        body: [
          "Adaptive bitrate is the player logic that decides which representation to request. DASH gives the player a ladder of representations; ABR chooses a rung based on current conditions.",
          "The main tradeoff is simple: higher bitrate can look better, but it takes longer to download. A player should prefer smooth playback over visual quality because a stall is more disruptive than a temporary quality drop."
        ],
        points: [
          "Throughput says how quickly recent media requests downloaded.",
          "Buffer depth says how much time the player has before it stalls.",
          "Representation bandwidth says roughly how many bits per second that quality needs."
        ]
      },
      {
        type: "diagram",
        visual: "timeline"
      },
      {
        type: "code",
        title: "Expose Representations From The Parser",
        explain: "Instead of returning one Representation, return a list the ABR selector can choose from.",
        code: `
function parseRepresentations(adaptation, template, mpdUrl, base, segmentCount, segmentSeconds, startNumber) {
  return [...adaptation.querySelectorAll("Representation")].map((representation) => ({
    id: representation.id,
    bandwidth: Number(representation.getAttribute("bandwidth") ?? 0),
    mime: \`\${adaptation.getAttribute("mimeType")}; codecs="\${representation.getAttribute("codecs")}"\`,
    init: resolve(template.getAttribute("initialization"), mpdUrl, base, representation.id),
    segments: Array.from({ length: segmentCount }, (_, index) => {
      const number = startNumber + index;
      return {
        number,
        start: index * segmentSeconds,
        end: (index + 1) * segmentSeconds,
        url: resolve(template.getAttribute("media"), mpdUrl, base, representation.id, number)
      };
    })
  }));
}`
      },
      {
        type: "text",
        heading: "A Basic Algorithm",
        body: [
          "A useful first algorithm chooses the highest representation whose declared bandwidth fits inside a conservative throughput budget. The safety margin protects against network variation and request overhead.",
          "Buffer depth changes how aggressive the player can be. If there is a large buffer, the player can use more of the measured throughput. If the buffer is shallow, it should be more cautious."
        ],
        points: [
          "Sort representations by bandwidth from low to high.",
          "Estimate throughput from downloaded segment bytes divided by download time.",
          "Pick the highest representation below throughput multiplied by a safety factor."
        ]
      },
      {
        type: "code",
        title: "ABR Helpers In dash.js",
        explain: "The parser module also exports the small startup ABR helper used by the player.",
        code: `
export function estimateInitialThroughput() {
  const downlinkMbps = navigator.connection?.downlink;
  return downlinkMbps ? downlinkMbps * 1_000_000 : 2_500_000;
}

export function chooseRepresentation(representations, { throughputBps, bufferSeconds }) {
  const sorted = [...representations].sort((a, b) => a.bandwidth - b.bandwidth);
  const safety = bufferSeconds > 12 ? 0.85 : bufferSeconds > 6 ? 0.75 : 0.6;
  const budget = throughputBps * safety;

  return sorted.filter((rep) => rep.bandwidth <= budget).at(-1) ?? sorted[0];
}

export async function measureFetch(url) {
  const startedAt = performance.now();
  const response = await fetch(url);
  if (!response.ok) throw new Error(\`Failed to fetch \${url}\`);
  const bytes = await response.arrayBuffer();
  const seconds = Math.max((performance.now() - startedAt) / 1000, 0.001);

  return {
    bytes,
    throughputBps: (bytes.byteLength * 8) / seconds
  };
}`
      },
      {
        type: "text",
        heading: "Startup ABR Versus Switching",
        body: [
          "This tutorial updates the player with startup ABR: it chooses the video representation before playback begins, then uses that selected representation to build the segment queue. That avoids the extra complexity of switching SourceBuffer streams mid-playback.",
          "A full player repeats the decision throughout playback. It can switch at aligned segment boundaries, but it must handle codec compatibility, buffered ranges, quality oscillation, and audio/video coordination."
        ],
        points: [
          "Startup ABR is simple and still useful.",
          "Mid-stream ABR needs aligned segments and careful append scheduling.",
          "Avoid switching up too quickly and switch down before the buffer becomes dangerous."
        ]
      },
      {
        type: "code",
        title: "Update The Player",
        explain: "Choose the startup video representation before creating SourceBuffers, then append that selected video plus the selected audio representation.",
        code: `
import { estimateInitialThroughput, loadDashVod, measureFetch } from "./dash.js";

const throughputBps = estimateInitialThroughput();
const dash = await loadDashVod(mpdUrl, { throughputBps, bufferSeconds: 0 });

const videoBuffer = mediaSource.addSourceBuffer(dash.video.mime);
const audioBuffer = mediaSource.addSourceBuffer(dash.audio.mime);

const videoQueue = [dash.video.init, ...dash.video.segments.map((segment) => segment.url)];
const audioQueue = [dash.audio.init, ...dash.audio.segments.map((segment) => segment.url)];

await Promise.all([
  appendTrack(videoBuffer, videoQueue),
  appendTrack(audioBuffer, audioQueue)
]);`
      },
      {
        type: "demo",
        title: "ABR Decision Loop",
        mode: "timeline",
        text: "The player compares representation bandwidth with measured throughput and buffer depth before choosing quality."
      }
    ]
  },
  {
    slug: "live",
    title: "Add Live Playback",
    kind: "Practical",
    summary: "Adapt the DASH player for dynamic manifests, live edge, latency, and buffer cleanup.",
    target: "The player refreshes a dynamic MPD and appends newly available segments near the live edge.",
    checkpoint: "You can describe live edge, availability window, target latency, and safe buffer eviction.",
    reference: "https://reference.dashif.org/dash.js/latest/samples/live-streaming/live-delay-comparison.html",
    blocks: [
      {
        type: "text",
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
      },
      {
        type: "diagram",
        visual: "buffer"
      },
      {
        type: "code",
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
      },
      {
        type: "demo",
        title: "Live Window",
        mode: "buffer",
        text: "The live window slides forward while playback follows a few segments behind the edge."
      }
    ]
  },
  {
    slug: "subtitle-theory",
    title: "Subtitles In Streaming",
    kind: "Theory",
    summary: "Learn where timed text comes from and how browsers display cues alongside media.",
    target: "You understand sidecar subtitles, embedded text tracks, WebVTT, TTML, IMSC, languages, and cue timing.",
    checkpoint: "Choose a subtitle format and explain how cues align with media time.",
    reference: "https://developer.mozilla.org/en-US/docs/Web/API/WebVTT_API",
    blocks: [
      {
        type: "text",
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
        type: "diagram",
        visual: "timeline"
      },
      {
        type: "code",
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
        type: "text",
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
        type: "text",
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
        type: "text",
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
      },
      {
        type: "code",
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
      },
      {
        type: "demo",
        title: "Subtitle Cues",
        mode: "timeline",
        text: "Text cues occupy timed ranges just like media segments, but render as captions instead of decoded frames."
      }
    ]
  },
  {
    slug: "subtitle-practical",
    title: "Add Subtitle Support",
    kind: "Practical",
    summary: "Attach sidecar WebVTT captions and control active subtitle tracks from JavaScript.",
    target: "The tutorial player loads and toggles WebVTT subtitle tracks.",
    checkpoint: "A viewer can switch captions on and off while playback continues.",
    reference: "https://developer.mozilla.org/en-US/docs/Web/API/TextTrack",
    blocks: [
      {
        type: "text",
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
      },
      {
        type: "diagram",
        visual: "timeline"
      },
      {
        type: "code",
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
      },
      {
        type: "demo",
        title: "Cue Switcher",
        mode: "timeline",
        text: "The media timeline keeps running while text tracks independently switch rendering mode."
      }
    ]
  },
  {
    slug: "imsc-practical",
    title: "Render IMSC Subtitles",
    kind: "Practical",
    summary: "Replace native WebVTT rendering with a small custom IMSC renderer layered over the video.",
    target: "The tutorial player fetches a simple IMSC document, parses timed paragraphs, and paints active cues.",
    checkpoint: "A viewer sees IMSC subtitle text rendered by your JavaScript instead of the browser TextTrack renderer.",
    reference: "https://www.w3.org/TR/ttml-imsc1.2/",
    blocks: [
      {
        type: "text",
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
        type: "diagram",
        visual: "timeline"
      },
      {
        type: "code",
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
        type: "code",
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
        type: "text",
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
      },
      {
        type: "code",
        title: "Using The Renderer",
        explain: "Remove the WebVTT track setup and install the custom IMSC overlay instead.",
        code: `
import { installImscRenderer } from "./imsc-renderer.js";

const video = document.querySelector("#video");
await installImscRenderer(video, "./sample.ttml");`
      },
      {
        type: "demo",
        title: "Custom Subtitle Overlay",
        mode: "timeline",
        text: "The renderer maps active IMSC paragraphs onto HTML above the video instead of using native WebVTT tracks."
      }
    ]
  },
  {
    slug: "drm-theory",
    title: "DRM And EME",
    kind: "Theory",
    summary: "Understand encrypted media at the browser boundary without hiding the moving parts.",
    target: "You understand init data, key systems, MediaKeys, sessions, licenses, and ClearKey limitations.",
    checkpoint: "Explain why DRM is negotiated before encrypted samples can be decoded.",
    reference: "https://developer.mozilla.org/en-US/docs/Web/API/Navigator/requestMediaKeySystemAccess",
    blocks: [
      {
        type: "text",
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
      },
      {
        type: "diagram",
        visual: "packets"
      },
      {
        type: "demo",
        title: "License Round Trip",
        mode: "packets",
        text: "Encrypted samples cause a key request, the license response unlocks decryption, then decoded frames resume."
      }
    ]
  },
  {
    slug: "drm-practical",
    title: "Add Optional ClearKey DRM",
    kind: "Practical",
    summary: "Wire a minimal ClearKey EME flow so users can see the browser DRM lifecycle.",
    target: "The player can attach MediaKeys and update a ClearKey session for compatible encrypted samples.",
    checkpoint: "The DRM code fails gracefully when key system support, secure context, or encrypted media is unavailable.",
    reference: "https://developer.mozilla.org/en-US/docs/Web/API/MediaKeySession",
    blocks: [
      {
        type: "text",
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
      },
      {
        type: "diagram",
        visual: "packets"
      },
      {
        type: "code",
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
      },
      {
        type: "demo",
        title: "EME Lifecycle",
        mode: "packets",
        text: "The encrypted event bridges media bytes to a key session while the video element stays the playback surface."
      }
    ]
  },
  {
    slug: "putting-it-all-together",
    title: "Putting It All Together",
    kind: "Practical",
    summary: "Run the finished in-app player: DASH manifest parsing, audio/video MSE appends, playback controls, ABR startup selection, and custom subtitles.",
    target: "A working browser player loads a Big Buck Bunny DASH stream with audio, video, and subtitle cues.",
    checkpoint: "The stream loads through Media Source Extensions and the subtitle overlay updates as playback time changes.",
    reference: "https://rdmedia.bbc.co.uk/bbb/2/client_manifest-avc1-high_profile.mpd",
    blocks: [
      {
        type: "text",
        heading: "The Final Shape",
        body: [
          "This page brings the main pieces together inside the tutorial app. The player fetches a DASH MPD, chooses a conservative startup video representation, resolves the audio/video initialization and media segment URLs, and appends them to separate SourceBuffers.",
          "The subtitle layer uses the same timing idea as the IMSC lab. It watches the media playhead and renders the active cue into an overlay above the video."
        ],
        points: [
          "The audio and video bytes come from DASH and MSE, not from assigning a single MP4 URL to video.src.",
          "The subtitle renderer is custom HTML layered over the video.",
          "The player reports manifest, codec, CORS, and fetch errors in the page so failures are inspectable."
        ]
      },
      {
        type: "diagram",
        visual: "timeline"
      },
      {
        type: "code",
        title: "Final Player Responsibilities",
        explain: "The in-app demo below is the same architecture the tutorial has built up in small pieces.",
        code: `
1. Fetch the DASH MPD.
2. Parse audio/video representations, codec strings, init segments, and media segment URLs.
3. Create MediaSource plus audio and video SourceBuffers.
4. Append init and media segments for both tracks in updateend order.
5. Watch video.currentTime and render active subtitle cues.
6. Surface unsupported codec, CORS, and network failures in the UI.`
      },
      {
        type: "text",
        heading: "What To Build Next",
        body: [
          "This final version is still intentionally small. A production player would add mid-stream audio/video adaptation coordination, gap handling, retry logic, live edge management, full subtitle styling, and real DRM license integration.",
          "The important thing is that the architecture now has clear boundaries: manifest parsing, segment loading, append scheduling, timeline observation, subtitle rendering, and UI state are separate enough to improve one at a time."
        ],
        points: [
          "Add mid-stream representation switching at aligned segment boundaries.",
          "Use buffer depth and measured throughput to keep updating the ABR choice while playback continues.",
          "Expand the IMSC subset only for features your content actually uses."
        ]
      },
      {
        type: "demo",
        title: "Complete Playback Loop",
        mode: "timeline",
        text: "Manifest parsing feeds segment loading, segment loading feeds MSE, and the media timeline drives subtitles."
      },
      {
        type: "showcase",
        showcase: "player"
      }
    ]
  }
];
