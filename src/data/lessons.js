export const bbbMpd = "https://rdmedia.bbc.co.uk/bbb/2/client_manifest-avc1-high_profile.mpd";

export const lessons = [
  {
    slug: "introduction",
    title: "What You Will Build",
    kind: "Theory",
    summary: "An interactive tutorial to help learn the fundamentals of media playback. Follow the theory and and then implement a basic MSE-based DASH player.",
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
    ],
    outcome: "You understand the learning path and how each theory topic supports the player you will build."
  },
  {
    slug: "video-fundamentals",
    title: "Video Fundamentals",
    kind: "Theory",
    summary: "Understand the properties that define what a viewer sees before you think about files or streaming.",
    reference: "https://developer.mozilla.org/en-US/docs/Web/Media/Formats/Video_codecs",
    blocks: [
      {
        type: "text",
        heading: "Pixels And Raster Images",
        body: [
          "Digital video is a sequence of raster images shown over time. A raster image is a grid of picture elements, or pixels. Each pixel stores values that describe the colour and brightness at one point in the picture.",
          "A single video frame is one raster image. Playback works by presenting many frames on a timeline quickly enough that the viewer perceives motion."
        ],
        points: [
          "Pixels are spatial samples of a picture.",
          "Frames are raster images placed at times on the media timeline.",
          "Video quality starts with how many samples exist and how accurately each sample describes light."
        ]
      },
      {
        type: "diagram",
        visual: "video"
      },
      {
        type: "text",
        heading: "Resolution And Aspect Ratio",
        body: [
          "Resolution is the number of pixels in each frame. A 1920 by 1080 video has 2,073,600 luma sample positions per frame, while a 1280 by 720 video has 921,600. More samples can preserve more spatial detail, but they also increase decode work and usually need more bitrate.",
          "Aspect ratio is the shape of the picture, such as 16:9 or 4:3. Player layout should respect the encoded display shape so the image is not stretched, squeezed, or cropped by accident."
        ],
        points: [
          "Resolution affects sharpness, decode cost, and bandwidth.",
          "Display size and device pixel density decide whether extra resolution is visible.",
          "Aspect ratio belongs to presentation; it is not the same thing as file size or bitrate."
        ]
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
        heading: "RGB And YCbCr",
        body: [
          "Screens often display colour as RGB: red, green, and blue light values. Video systems commonly store colour as YCbCr instead. Y carries luma, which is brightness detail. Cb and Cr carry chroma difference information, which describes colour relative to luma.",
          "YCbCr is useful because human vision is more sensitive to brightness detail than colour detail. Video can keep full luma resolution while storing less chroma detail, saving data with less visible damage than reducing every component equally."
        ],
        points: [
          "RGB is convenient for displays and canvas-style pixel work.",
          "YCbCr is common in encoded video and broadcast workflows.",
          "Colour conversion and metadata help the browser map encoded values to the display."
        ]
      },
      {
        type: "text",
        heading: "Bit Depth",
        body: [
          "Bit depth is the number of bits used for each component sample. 8-bit video gives each component 256 possible values. 10-bit video gives each component 1,024 possible values, which allows smoother gradients and gives HDR workflows more precision.",
          "Higher bit depth increases raw data size before compression. A 10-bit stream is not automatically better than an 8-bit stream, but it gives the codec and display pipeline more precision to work with."
        ],
        points: [
          "8-bit SDR video is common and broadly compatible.",
          "10-bit video is common for HDR and higher-quality distribution.",
          "Browser support depends on codec, profile, operating system, GPU, and display."
        ]
      },
      {
        type: "text",
        heading: "Chroma Subsampling",
        body: [
          "Chroma subsampling stores colour at a lower resolution than luma. The notation describes how chroma samples are shared across nearby pixels. 4:4:4 keeps full chroma detail. 4:2:2 halves chroma horizontally. 4:2:0 halves chroma horizontally and vertically across a two-line area.",
          "Most web video is 4:2:0 because it compresses well and usually looks good for natural images. Text, graphics, and sharp colour edges can suffer more because their chroma detail matters."
        ],
        points: [
          "4:4:4 keeps one Cb and one Cr sample for every luma sample.",
          "4:2:2 keeps full luma but shares chroma across pairs of horizontal samples.",
          "4:2:0 keeps full luma but shares chroma across a small block of neighbouring samples."
        ]
      },
      {
        type: "text",
        heading: "Frame Rate And Scan Type",
        body: [
          "Frame rate is how many pictures are shown per second. Common values include 24 fps for film-like motion, 25 or 30 fps for broadcast and web video, and 50 or 60 fps for sport, games, and very smooth motion.",
          "Progressive video stores each frame as a complete picture. Interlaced video stores each picture as alternating fields, traditionally one field for odd lines and one for even lines. Interlacing helped older broadcast systems reduce bandwidth, but modern web playback usually prefers progressive video."
        ],
        points: [
          "A 60 fps stream has twice as many frame times as a 30 fps stream.",
          "The media timeline is continuous even though video frames are discrete.",
          "Interlaced sources usually need deinterlacing before clean progressive display."
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
    ],
    outcome: "You can explain pixels, raster frames, resolution, RGB versus YCbCr, bit depth, chroma subsampling, frame rate, scan type, colour gamut, and dynamic range in player terms."
  },
  {
    slug: "audio-fundamentals",
    title: "Audio Fundamentals",
    kind: "Theory",
    summary: "Understand how sound becomes timed samples before those samples are packaged, compressed, and synchronized with video.",
    reference: "https://developer.mozilla.org/en-US/docs/Web/Media/Formats/Audio_codecs",
    blocks: [
      {
        type: "text",
        heading: "PCM Audio",
        body: [
          "Sound is pressure changing over time. PCM, or Pulse-Code Modulation, represents that changing signal as a sequence of numeric sample values taken at regular intervals.",
          "Uncompressed PCM is the simple mental model behind most digital audio: each channel has a stream of samples, each sample stores an amplitude value, and playback sends those values to the audio device at the correct rate. Codecs such as AAC and Opus compress audio, but they ultimately decode back to PCM-like samples for output."
        ],
        points: [
          "PCM is usually uncompressed audio sample data.",
          "Compressed audio codecs decode into samples that the output device can play.",
          "The media timeline uses seconds, even though audio is made from many tiny samples."
        ]
      },
      {
        type: "diagram",
        visual: "audio"
      },
      {
        type: "text",
        heading: "Sample Rate And Bit Depth",
        body: [
          "Sample rate controls how often the waveform is measured. A 48 kHz track has 48,000 samples per second for each channel. Higher sample rates can represent higher frequencies, but they also create more data before compression.",
          "Bit depth controls how much precision each PCM sample has. A 16-bit sample can represent 65,536 possible amplitude values. A 24-bit sample has much finer precision and is useful during capture, mixing, and mastering, though final streaming audio is usually compressed."
        ],
        points: [
          "Raw stereo 48 kHz, 16-bit PCM is 48,000 x 2 channels x 16 bits = 1,536,000 bits/s.",
          "That is about 192 KB/s before container overhead.",
          "AAC or Opus can deliver understandable stereo audio at far lower bitrates."
        ]
      },
      {
        type: "code",
        title: "Reading Audio State",
        explain: "The media element does not expose sample rate directly, but it does expose audio track presence and playback state.",
        code: `
const video = document.querySelector("video");

video.addEventListener("loadedmetadata", () => {
  console.log("duration", video.duration);
  console.log("audio tracks", video.audioTracks?.length ?? "not exposed");
});

video.addEventListener("volumechange", () => {
  console.log("muted", video.muted, "volume", video.volume);
});`
      },
      {
        type: "text",
        heading: "Channels And Layout",
        body: [
          "Channels describe how many independent audio signals are present and how they should be presented. Mono has one channel. Stereo has left and right. Surround formats add more speaker positions, and object-based formats can describe sounds that are rendered into a listening layout.",
          "Channel layout matters because two tracks with the same codec can still require different handling. A stereo AAC track, a 5.1 AAC track, and an alternate-language stereo track may all appear as different choices in a streaming manifest."
        ],
        points: [
          "A DASH audio Representation may advertise channel layout and sampling rate.",
          "The browser handles decoding and output routing, but the player still chooses which audio track to fetch.",
          "Language, accessibility, channel count, codec support, and bitrate can all affect audio track selection."
        ]
      },
      {
        type: "text",
        heading: "Loudness",
        body: [
          "Loudness is perceived volume, not just sample value. Two audio tracks can use the same sample rate, bit depth, codec, and bitrate but still sound different in loudness because of mixing and mastering choices.",
          "Streaming services often normalize loudness so switching programmes, languages, commentary tracks, or adverts is less jarring. The player usually does not solve loudness by itself, but it should preserve the metadata and track choices provided by the media workflow."
        ],
        points: [
          "Sample rate describes time resolution.",
          "Bit depth describes sample precision.",
          "Loudness describes how loud the track feels to the listener."
        ]
      },
      {
        type: "text",
        heading: "Audio And Sync",
        body: [
          "Audio is usually the track viewers notice first when playback goes wrong. If audio underruns, playback commonly stalls or produces silence. If audio and video timestamps drift apart, speech no longer matches the picture.",
          "Later, when you append separate audio and video SourceBuffers, both tracks must land on one shared media timeline. The player needs enough audio and enough video buffered around the playhead for smooth synchronized playback."
        ],
        points: [
          "Audio samples have timestamps just like video frames.",
          "The media element advances one currentTime for both audio and video.",
          "Streaming players often treat audio continuity as critical when deciding whether playback can continue."
        ]
      },
      {
        type: "demo",
        title: "Samples To Timeline",
        mode: "timeline",
        text: "Audio playback is a continuous timed sample stream that must stay aligned with video on the same media clock."
      }
    ],
    outcome: "You can explain PCM audio, sample rate, bit depth, channels, loudness, and why audio continuity matters for synchronized playback."
  },
  {
    slug: "inspect-av-with-ffmpeg",
    title: "Inspect Video And Audio With FFmpeg",
    kind: "Practical",
    summary: "Use FFmpeg and FFprobe to generate a small test asset and inspect the video and audio fundamentals you just learned.",
    reference: "https://ffmpeg.org/ffprobe.html",
    blocks: [
      {
        type: "text",
        heading: "What This Lab Uses",
        body: [
          "This lab uses FFmpeg to generate a short synthetic media file and FFprobe to inspect it. The point is not to create beautiful content; it is to produce a controlled file where you know the expected resolution, frame rate, sample rate, channel count, codecs, and duration.",
          "Run these commands from a working directory where you are happy to create a lab folder. The generated file is small and can be deleted afterwards."
        ],
        points: [
          "ffmpeg creates or transforms media.",
          "ffprobe reads media metadata, streams, packets, and frames.",
          "Synthetic sources avoid depending on external downloads."
        ]
      },
      {
        type: "code",
        title: "Check The Tools",
        explain: "Confirm both tools are installed before starting the lab.",
        code: `
ffmpeg -version
ffprobe -version`
      },
      {
        type: "code",
        title: "Generate A Test MP4",
        explain: "Create a five-second MP4 with a 1280x720, 25 fps video test pattern and a 48 kHz sine-wave audio track.",
        code: `
mkdir -p lab

ffmpeg -y \\
  -f lavfi -i testsrc2=size=1280x720:rate=25:duration=5 \\
  -f lavfi -i sine=frequency=1000:sample_rate=48000:duration=5 \\
  -c:v libx264 -pix_fmt yuv420p -g 50 -crf 23 \\
  -c:a aac -b:a 128k -ac 2 \\
  -movflags +faststart \\
  lab/fundamentals.mp4`
      },
      {
        type: "code",
        title: "Inspect Streams",
        explain: "The stream output connects directly to resolution, frame rate, pixel format, sample rate, channels, codec names, and duration.",
        code: `
ffprobe -hide_banner \\
  -show_streams \\
  -select_streams v:0 \\
  lab/fundamentals.mp4

ffprobe -hide_banner \\
  -show_streams \\
  -select_streams a:0 \\
  lab/fundamentals.mp4`
      },
      {
        type: "text",
        heading: "What To Look For",
        body: [
          "On the video stream, look for width, height, r_frame_rate, avg_frame_rate, pix_fmt, codec_name, profile, and duration. The pix_fmt value yuv420p means YCbCr-style planar video with 4:2:0 chroma subsampling.",
          "On the audio stream, look for codec_name, sample_rate, channels, channel_layout, and duration. The encoded audio is AAC, but it represents a 48 kHz stereo signal when decoded for playback."
        ],
        points: [
          "width and height confirm resolution.",
          "r_frame_rate and avg_frame_rate expose frame-rate information.",
          "sample_rate and channels expose the audio fundamentals.",
          "codec_name confirms the encoded format carried by the file."
        ]
      },
      {
        type: "code",
        title: "Compact Field View",
        explain: "This version prints only the fields that matter for the early fundamentals lessons.",
        code: `
ffprobe -v error \\
  -select_streams v:0 \\
  -show_entries stream=codec_name,profile,width,height,pix_fmt,r_frame_rate,avg_frame_rate,duration \\
  -of default=noprint_wrappers=1 \\
  lab/fundamentals.mp4

ffprobe -v error \\
  -select_streams a:0 \\
  -show_entries stream=codec_name,sample_rate,channels,channel_layout,duration \\
  -of default=noprint_wrappers=1 \\
  lab/fundamentals.mp4`
      },
      {
        type: "demo",
        title: "Metadata As Evidence",
        mode: "timeline",
        text: "FFprobe turns theory terms such as resolution, frame rate, sample rate, channels, codec, and duration into observable fields."
      }
    ],
    outcome: "You can generate a controlled MP4 and use FFprobe to inspect core video and audio properties."
  },
  {
    slug: "codecs-compression",
    title: "Codecs And Compression",
    kind: "Theory",
    summary: "See why raw camera video is enormous and how H.264-style codecs reduce it with spatial compression, temporal prediction, and bitrate control.",
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
        heading: "H.264 As The Main Model",
        body: [
          "This tutorial uses H.264 as the main codec model because it is widely supported by browsers, devices, and streaming workflows. H.264 is also old enough that its core ideas are well understood: divide pictures into blocks, predict what can be predicted, transform what remains, quantize detail, and code the result efficiently.",
          "HEVC, VP9, and AV1 use many of the same broad ideas with more advanced tools. They can deliver better compression efficiency, but support, licensing, encoding cost, and device decode capability vary."
        ],
        points: [
          "H.264 is the practical baseline for broad MP4 playback.",
          "HEVC can be efficient but browser/device support is uneven.",
          "VP9 and AV1 are common web alternatives, especially in WebM or modern streaming workflows."
        ]
      },
      {
        type: "text",
        heading: "Spatial Compression",
        body: [
          "Spatial compression reduces detail within a single frame. H.264 first predicts blocks from neighbouring pixels in the same picture where it can. The remaining difference, called the residual, is transformed so visible image energy is concentrated into values that are easier to compress.",
          "A common way to explain this family of techniques is DCT, quantisation, then entropy coding. A transform such as the Discrete Cosine Transform expresses image detail as frequency-like coefficients. Quantisation reduces precision, often throwing away fine detail that viewers are less likely to notice. Entropy coding then stores the resulting values with fewer bits."
        ],
        points: [
          "Transform coding turns pixel differences into coefficients.",
          "Quantisation is where much of the visible loss is introduced.",
          "Entropy coding removes statistical redundancy without changing the decoded values further."
        ]
      },
      {
        type: "text",
        heading: "Temporal Compression",
        body: [
          "Temporal compression reduces repeated information between frames. Instead of encoding every frame independently, H.264 can encode some frames by referencing other frames. The encoder searches for similar blocks in reference frames, describes motion with motion vectors, and stores only the prediction error that remains.",
          "Motion estimation is the encoder's search for matching image areas. Motion compensation is the decoder's use of those motion vectors and reference frames to rebuild the predicted picture. This is why compressed video can be much smaller than raw frames when motion is predictable."
        ],
        points: [
          "Reference frames are previously decoded pictures kept so later pictures can predict from them.",
          "Motion vectors describe where matching image detail moved.",
          "The residual stores what prediction could not explain."
        ]
      },
      {
        type: "text",
        heading: "I-Frames, P-Frames, B-Frames, And GOPs",
        body: [
          "A Group of Pictures, or GOP, is a run of frames built around prediction dependencies. I-frames are intra-coded: they can be decoded without other frames. P-frames predict from earlier reference frames. B-frames can predict from frames before and after their presentation time.",
          "I-frames are important for startup, seeking, quality switching, and recovery after errors, but they are larger. P-frames and B-frames usually compress better, but they create dependencies. With B-frames, decode order can differ from presentation order because the decoder may need a future reference before it can display the current frame."
        ],
        points: [
          "Shorter GOPs improve random access but usually increase bitrate.",
          "Longer GOPs improve compression but make seeking and switching less immediate.",
          "Streaming representations should align GOP boundaries so quality switches can happen cleanly."
        ]
      },
      {
        type: "text",
        heading: "Bitrate Control",
        body: [
          "Bitrate is how many bits are spent per second of encoded media. CBR, or constant bitrate, tries to keep the rate steady. VBR, or variable bitrate, spends more bits on complex scenes and fewer bits on easy scenes. Streaming ladders often describe each Representation with an average or target bitrate so the ABR algorithm has something to compare against network throughput.",
          "CRF, or Constant Rate Factor, is a quality-targeted encoding mode used by tools such as x264. Lower CRF values generally mean higher quality and larger files. CRF is useful when producing files where consistent visual quality matters more than hitting an exact bitrate, while ABR streaming packaging often needs bitrate-controlled outputs for predictable delivery."
        ],
        points: [
          "CBR is predictable for networks but may waste bits on easy content.",
          "VBR usually gives better quality for a given average size.",
          "CRF targets quality rather than a fixed output bitrate."
        ]
      },
      {
        type: "text",
        heading: "Measuring Quality",
        body: [
          "Video quality is not only a bitrate number. Objective metrics compare an encoded result with a reference source. PSNR measures signal error mathematically, but it often disagrees with human perception. SSIM compares structural similarity and usually tracks perceived quality better than PSNR.",
          "VMAF combines several measurements using a perceptual model and is widely used when building encoding ladders. None of these metrics is perfect, but they help compare codec settings, bitrates, resolutions, and alternative codecs systematically."
        ],
        points: [
          "PSNR is simple but not very perceptual.",
          "SSIM focuses on structural similarity.",
          "VMAF is commonly used to tune streaming ladders and compare encodes."
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
          "AAC is common with H.264 in MP4 and DASH streams.",
          "Opus is efficient and common in WebM and real-time workflows.",
          "Audio buffer underruns are often more noticeable than small video quality drops."
        ]
      },
      {
        type: "code",
        title: "Codec Support Check",
        explain: "A browser support check needs both the container MIME type and codec identifiers.",
        code: `
const h264Aac = 'video/mp4; codecs="avc1.64001f, mp4a.40.2"';
const hevcAac = 'video/mp4; codecs="hvc1.1.6.L93.B0, mp4a.40.2"';
const vp9Opus = 'video/webm; codecs="vp09.00.10.08, opus"';
const av1Opus = 'video/webm; codecs="av01.0.05M.08, opus"';

console.log(MediaSource.isTypeSupported(h264Aac));
console.log(MediaSource.isTypeSupported(hevcAac));
console.log(MediaSource.isTypeSupported(vp9Opus));
console.log(MediaSource.isTypeSupported(av1Opus));`
      },
      {
        type: "demo",
        title: "Compression Pressure",
        mode: "packets",
        text: "Raw samples quickly become hundreds of megabytes per second, so codecs reduce spatial detail, temporal repetition, and statistical redundancy before streaming."
      }
    ],
    outcome: "You can calculate raw video data rate and explain H.264 spatial compression, temporal prediction, GOP structure, bitrate control, and quality metrics."
  },
  {
    slug: "inspect-codecs-compression",
    title: "Inspect Codecs And Compression",
    kind: "Practical",
    summary: "Encode the same source with different H.264 settings and inspect how CRF, bitrate, GOP size, and frame types change the output.",
    reference: "https://ffmpeg.org/ffmpeg-codecs.html#libx264",
    blocks: [
      {
        type: "text",
        heading: "One Source, Several Encodes",
        body: [
          "Codec concepts are easiest to reason about when the source stays fixed. This lab uses FFmpeg's test pattern source and encodes it several ways with libx264 so you can compare file size, bitrate, GOP structure, and frame types.",
          "The commands deliberately use H.264 because that is the main codec model in this tutorial. The same inspection habits apply when you later compare HEVC, VP9, or AV1."
        ],
        points: [
          "CRF targets quality rather than an exact bitrate.",
          "Bitrate settings target delivery size or rate.",
          "GOP and B-frame settings affect prediction dependencies."
        ]
      },
      {
        type: "code",
        title: "Create A Reusable Source",
        explain: "Use a lossless-ish intermediate source for comparisons so each encode starts from the same frames.",
        code: `
mkdir -p lab

ffmpeg -y \\
  -f lavfi -i testsrc2=size=1280x720:rate=25:duration=8 \\
  -f lavfi -i sine=frequency=880:sample_rate=48000:duration=8 \\
  -c:v ffv1 \\
  -c:a pcm_s16le \\
  lab/source.mkv`
      },
      {
        type: "code",
        title: "Compare CRF Values",
        explain: "Lower CRF generally means higher quality and larger output. The codec is still H.264 in both files.",
        code: `
ffmpeg -y -i lab/source.mkv \\
  -c:v libx264 -pix_fmt yuv420p -crf 18 -g 50 \\
  -c:a aac -b:a 128k \\
  lab/h264-crf18.mp4

ffmpeg -y -i lab/source.mkv \\
  -c:v libx264 -pix_fmt yuv420p -crf 32 -g 50 \\
  -c:a aac -b:a 128k \\
  lab/h264-crf32.mp4

ls -lh lab/h264-crf18.mp4 lab/h264-crf32.mp4`
      },
      {
        type: "code",
        title: "Inspect Codec And Bitrate",
        explain: "Use FFprobe to compare codec name, profile, pixel format, and reported bitrate.",
        code: `
ffprobe -v error \\
  -select_streams v:0 \\
  -show_entries stream=codec_name,profile,pix_fmt,bit_rate,avg_frame_rate \\
  -of default=noprint_wrappers=1 \\
  lab/h264-crf18.mp4

ffprobe -v error \\
  -select_streams v:0 \\
  -show_entries stream=codec_name,profile,pix_fmt,bit_rate,avg_frame_rate \\
  -of default=noprint_wrappers=1 \\
  lab/h264-crf32.mp4`
      },
      {
        type: "code",
        title: "Force A Bitrate Target",
        explain: "This creates a more delivery-oriented encode. The maxrate and bufsize options constrain bitrate variation.",
        code: `
ffmpeg -y -i lab/source.mkv \\
  -c:v libx264 -pix_fmt yuv420p \\
  -b:v 1200k -maxrate 1200k -bufsize 2400k \\
  -g 50 \\
  -c:a aac -b:a 128k \\
  lab/h264-1200k.mp4`
      },
      {
        type: "code",
        title: "Inspect Frame Types",
        explain: "The pict_type values show I, P, and B frames. Key frames are the random access points used for startup and seeking.",
        code: `
ffprobe -v error \\
  -select_streams v:0 \\
  -show_entries frame=pict_type,key_frame,pkt_pts_time,best_effort_timestamp_time \\
  -of csv=p=0 \\
  lab/h264-crf18.mp4 | head -40`
      },
      {
        type: "code",
        title: "Change GOP And B-Frames",
        explain: "This encode uses a shorter GOP and disables B-frames. It is easier to decode and reason about, but usually less efficient.",
        code: `
ffmpeg -y -i lab/source.mkv \\
  -c:v libx264 -pix_fmt yuv420p -crf 23 \\
  -g 25 -bf 0 \\
  -c:a aac -b:a 128k \\
  lab/h264-gop25-no-bframes.mp4

ffprobe -v error \\
  -select_streams v:0 \\
  -show_entries frame=pict_type,key_frame \\
  -of csv=p=0 \\
  lab/h264-gop25-no-bframes.mp4 | head -40`
      },
      {
        type: "text",
        heading: "Quality Metrics In Practice",
        body: [
          "PSNR, SSIM, and VMAF are normally used by comparing an encoded file against a reference source. FFmpeg can calculate PSNR and SSIM with built-in filters. VMAF support depends on whether your FFmpeg build includes libvmaf.",
          "Treat these metrics as engineering signals, not truth. They are useful for comparing encodes, but visual inspection and product constraints still matter."
        ],
        points: [
          "PSNR is easy to compute but weak as a perceptual metric.",
          "SSIM is more perceptual and still widely available.",
          "VMAF is common for ladder tuning when the tooling is available."
        ]
      },
      {
        type: "demo",
        title: "Encode Tradeoffs",
        mode: "packets",
        text: "Changing codec settings changes file size, bitrate, prediction structure, random access points, and visual quality."
      }
    ],
    outcome: "You can use FFmpeg and FFprobe to compare H.264 CRF, bitrate, GOP, and frame-type behavior."
  },
  {
    slug: "media-files-containers",
    title: "Media Files And Containers",
    kind: "Theory",
    summary: "Learn what a media file contains and how containers organize tracks, timing, metadata, and media data.",
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
        type: "text",
        heading: "MP4 As A Box Tree",
        body: [
          "MP4 files are built from boxes, also called atoms. Each box starts with a size and a four-character type, then contains either data or more nested boxes. A player reads this structure to discover what tracks exist, how samples are timed, and where the encoded media bytes live.",
          "The important beginner model is that metadata and media payload are separate. Boxes such as ftyp and moov describe the file and its tracks. The mdat box carries the encoded audio and video samples."
        ],
        points: [
          "ftyp identifies the MP4 brand and compatibility, such as isom, mp42, avc1, or iso6.",
          "moov contains movie-level metadata and track descriptions.",
          "mdat contains encoded media data: compressed audio and video samples."
        ]
      },
      {
        type: "code",
        title: "Typical MP4 Box Shape",
        explain: "A normal MP4 is a hierarchy. Some boxes contain other boxes, and the media samples are referenced by metadata rather than being self-describing raw bytes.",
        code: `
MP4 file
  ftyp
    major brand
    compatible brands

  moov
    mvhd
    trak
      tkhd
      mdia
        mdhd
        hdlr
        minf
          stbl

  mdat
    encoded audio/video samples`
      },
      {
        type: "text",
        heading: "Movie And Track Metadata",
        body: [
          "The moov box is the main metadata container for a normal MP4 file. Inside it, mvhd stores movie-level information such as the overall timescale and duration. Each trak box describes one track, such as video, audio, or subtitles.",
          "Inside a trak, tkhd stores track-level information such as track ID, duration, dimensions for video, and presentation flags. The mdia box contains the media information for that track: its media timescale, handler type, and tables that map sample numbers to decode times, byte offsets, sizes, and keyframe positions."
        ],
        points: [
          "moov tells the player how to interpret the file as a timed presentation.",
          "mvhd describes movie-level timing.",
          "trak groups metadata for one track.",
          "tkhd describes that track's identity and presentation properties.",
          "mdia leads to the timing and sample tables needed for playback and seeking."
        ]
      },
      {
        type: "text",
        heading: "Where mdat Fits",
        body: [
          "The mdat box is where the encoded sample bytes live. It does not, by itself, tell the browser when every sample should play or which samples are random access points. The player uses metadata from moov and the track sample tables to interpret the bytes in mdat.",
          "This is why MP4 metadata placement affects startup. If the moov box is near the start of the file, the browser can read track metadata quickly and begin progressive playback sooner. If moov is at the end, the browser may need more of the file before it can understand duration, tracks, and seek points."
        ],
        points: [
          "mdat is payload; moov explains the payload.",
          "Fast-start MP4 usually means moov is placed before mdat.",
          "Fragmented MP4 changes this model by putting setup in an init segment and timing metadata in repeated fragments."
        ]
      },
      {
        type: "text",
        heading: "MIME Types And Codec Strings",
        body: [
          "A browser support check needs two layers of identity. The MIME type describes the container or track format, such as video/mp4, audio/mp4, or video/webm. The codecs parameter describes the encoded samples inside that container.",
          "This matters more once you reach MSE. When you call addSourceBuffer, the browser needs a precise string so it can decide whether the appended bytes can be parsed and decoded. A string that is too vague, or a codec profile the device cannot decode, can fail before any media is appended."
        ],
        points: [
          "A complete MP4 file might be described as video/mp4 with both video and audio codec identifiers.",
          "An MSE SourceBuffer normally receives one track type, so the video buffer and audio buffer use separate MIME strings.",
          "DASH MPDs may put mimeType and codecs on AdaptationSet or Representation, so a player often combines inherited attributes."
        ]
      },
      {
        type: "code",
        title: "Container Versus Codec",
        explain: "Use exact MIME and codec strings before creating SourceBuffers. A normal file can advertise audio and video together; MSE often checks each track buffer separately.",
        code: `
const mp4File = 'video/mp4; codecs="avc1.64001f, mp4a.40.2"';
const videoBuffer = 'video/mp4; codecs="avc1.64001f"';
const audioBuffer = 'audio/mp4; codecs="mp4a.40.2"';

console.log(MediaSource.isTypeSupported(mp4File));
console.log(MediaSource.isTypeSupported(videoBuffer));
console.log(MediaSource.isTypeSupported(audioBuffer));`
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
    ],
    outcome: "You can separate MP4 file structure, container metadata, boxes, tracks, samples, and codec identifiers."
  },
  {
    slug: "inspect-mp4-containers",
    title: "Inspect MP4 Containers",
    kind: "Practical",
    summary: "Use FFprobe and optional MP4 box tools to inspect tracks, packets, timestamps, keyframes, and MP4 box structure.",
    reference: "https://ffmpeg.org/ffprobe.html",
    blocks: [
      {
        type: "text",
        heading: "Inspect The Container, Not Just The Codec",
        body: [
          "The previous labs created encoded audio and video. This lab looks at how the MP4 container describes those encoded samples as tracks, packets, timestamps, durations, and byte-addressed payload.",
          "FFprobe does not show every MP4 box in the same way a dedicated MP4 parser does, but it is excellent for stream, packet, frame, and timing inspection. If you install Bento4, mp4dump can show the box tree directly."
        ],
        points: [
          "Streams are logical tracks such as video and audio.",
          "Packets are encoded chunks with timestamps and sizes.",
          "Frames are decoded pictures or audio frames exposed by the demuxer/decoder path."
        ]
      },
      {
        type: "code",
        title: "Create A Fast-Start MP4",
        explain: "The +faststart flag places the moov metadata near the start, which helps progressive download startup.",
        code: `
mkdir -p lab

ffmpeg -y \\
  -f lavfi -i testsrc2=size=1280x720:rate=25:duration=6 \\
  -f lavfi -i sine=frequency=440:sample_rate=48000:duration=6 \\
  -c:v libx264 -pix_fmt yuv420p -g 50 -crf 23 \\
  -c:a aac -b:a 128k -ac 2 \\
  -movflags +faststart \\
  lab/container-faststart.mp4`
      },
      {
        type: "code",
        title: "Show Format And Streams",
        explain: "This is the high-level view: one container with video and audio streams.",
        code: `
ffprobe -hide_banner \\
  -show_format \\
  -show_streams \\
  lab/container-faststart.mp4`
      },
      {
        type: "code",
        title: "Inspect Packets",
        explain: "Packets expose encoded payload timing. Look for stream_index, pts_time, dts_time, duration_time, size, and flags.",
        code: `
ffprobe -v error \\
  -select_streams v:0 \\
  -show_packets \\
  -show_entries packet=stream_index,pts_time,dts_time,duration_time,size,flags \\
  -of csv=p=0 \\
  lab/container-faststart.mp4 | head -30`
      },
      {
        type: "code",
        title: "Inspect Frames And Keyframes",
        explain: "Frame inspection helps connect MP4 timing with codec structure. Keyframes are the safe random access points.",
        code: `
ffprobe -v error \\
  -select_streams v:0 \\
  -show_frames \\
  -show_entries frame=key_frame,pict_type,best_effort_timestamp_time,pkt_size \\
  -of csv=p=0 \\
  lab/container-faststart.mp4 | head -40`
      },
      {
        type: "text",
        heading: "Optional Box Tree Inspection",
        body: [
          "FFprobe gives you stream and packet information. To inspect MP4 boxes directly, install Bento4 and use mp4dump. That lets you see ftyp, moov, mvhd, trak, tkhd, mdia, and mdat as container boxes.",
          "This is optional because FFmpeg is enough for the rest of the tutorial. Box dumps are useful when you need to debug malformed MP4s, metadata placement, timescales, or fragmented output."
        ],
        points: [
          "ftyp identifies brands and compatibility.",
          "moov contains movie and track metadata.",
          "trak/tkhd/mdia describe individual tracks.",
          "mdat carries encoded sample bytes."
        ]
      },
      {
        type: "code",
        title: "Optional: mp4dump",
        explain: "If Bento4 is installed, this prints the MP4 box tree. The command is optional and may not exist on every machine.",
        code: `
mp4dump lab/container-faststart.mp4 | head -80`
      },
      {
        type: "demo",
        title: "Container Evidence",
        mode: "packets",
        text: "A container maps encoded packets to tracks, timestamps, byte sizes, keyframes, and presentation order."
      }
    ],
    outcome: "You can inspect an MP4 as streams, packets, frames, timestamps, keyframes, and optionally as a box tree."
  },
  {
    slug: "fragmented-mp4-cmaf",
    title: "Fragmented MP4 And CMAF",
    kind: "Theory",
    summary: "Bridge the gap between encoded samples and the small appendable media pieces used by MSE, DASH, HLS, and CMAF.",
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
    ],
    outcome: "You understand init segments, media segments, MP4 boxes, timestamps, and why CMAF exists."
  },
  {
    slug: "create-fragmented-mp4",
    title: "Create Fragmented MP4 For MSE",
    kind: "Practical",
    summary: "Use FFmpeg to create fragmented MP4 output and inspect how it differs from a normal progressive MP4.",
    reference: "https://developer.mozilla.org/en-US/docs/Web/API/Media_Source_Extensions_API",
    blocks: [
      {
        type: "text",
        heading: "Why Create fMP4",
        body: [
          "MSE commonly works with fragmented MP4: initialization metadata first, then media fragments that carry timed samples. DASH and modern HLS can both reference fMP4 or CMAF-style media.",
          "This lab creates a fragmented MP4 with FFmpeg so you can connect the fMP4/CMAF theory to actual packaging commands before appending bytes with MSE."
        ],
        points: [
          "Normal progressive MP4 is usually one complete file.",
          "Fragmented MP4 splits timing metadata into repeated fragments.",
          "MSE needs initialization data before it can parse media fragments."
        ]
      },
      {
        type: "code",
        title: "Create A Normal MP4",
        explain: "Start with a normal fast-start MP4 so you have something to compare against.",
        code: `
mkdir -p lab

ffmpeg -y \\
  -f lavfi -i testsrc2=size=1280x720:rate=25:duration=8 \\
  -f lavfi -i sine=frequency=660:sample_rate=48000:duration=8 \\
  -c:v libx264 -pix_fmt yuv420p -g 50 -keyint_min 50 -sc_threshold 0 -crf 23 \\
  -c:a aac -b:a 128k -ac 2 \\
  -movflags +faststart \\
  lab/progressive.mp4`
      },
      {
        type: "code",
        title: "Create A Fragmented MP4",
        explain: "These movflags produce an MP4 with initialization metadata followed by fragments. The keyframe settings keep fragment boundaries predictable.",
        code: `
ffmpeg -y \\
  -f lavfi -i testsrc2=size=1280x720:rate=25:duration=8 \\
  -f lavfi -i sine=frequency=660:sample_rate=48000:duration=8 \\
  -c:v libx264 -pix_fmt yuv420p -g 50 -keyint_min 50 -sc_threshold 0 -crf 23 \\
  -c:a aac -b:a 128k -ac 2 \\
  -movflags frag_keyframe+empty_moov+default_base_moof \\
  lab/fragmented.mp4`
      },
      {
        type: "code",
        title: "Compare High-Level Metadata",
        explain: "FFprobe still sees both as MP4 files with audio and video streams. Fragmentation is mainly a container layout difference.",
        code: `
ffprobe -hide_banner -show_format -show_streams lab/progressive.mp4
ffprobe -hide_banner -show_format -show_streams lab/fragmented.mp4`
      },
      {
        type: "text",
        heading: "What Changed",
        body: [
          "The progressive file is optimized as one playable file. The fragmented file is organized as initialization information plus fragments. A browser using MSE can receive the initialization data, then receive media fragments over time.",
          "In real DASH packaging, these pieces are often split into a separate init segment and multiple .m4s media segment files. This single fragmented file is still useful because it exposes the same moof/mdat idea."
        ],
        points: [
          "empty_moov writes an initial moov before media fragments.",
          "frag_keyframe starts fragments at keyframes.",
          "default_base_moof makes fragment addressing friendlier for streaming use cases."
        ]
      },
      {
        type: "code",
        title: "Optional: Inspect Fragment Boxes",
        explain: "If Bento4 is installed, look for ftyp, moov, repeated moof boxes, and mdat payload boxes.",
        code: `
mp4dump lab/fragmented.mp4 | head -120`
      },
      {
        type: "code",
        title: "Optional: Segment With FFmpeg",
        explain: "This creates a DASH-style init segment and numbered media segments. The later DASH lessons use manifests to discover files like these.",
        code: `
mkdir -p lab/dash

ffmpeg -y -i lab/progressive.mp4 \\
  -map 0:v:0 -map 0:a:0 \\
  -c copy \\
  -f dash \\
  -seg_duration 2 \\
  -init_seg_name 'init-$RepresentationID$.mp4' \\
  -media_seg_name 'chunk-$RepresentationID$-$Number%05d$.m4s' \\
  lab/dash/manifest.mpd`
      },
      {
        type: "demo",
        title: "From File To Fragments",
        mode: "timeline",
        text: "Fragmented MP4 packages encoded samples into appendable timed fragments that line up with MSE and DASH."
      }
    ],
    outcome: "You can create fragmented MP4 output and relate FFmpeg packaging flags to init metadata, moof/mdat fragments, and DASH-style segments."
  },
  {
    slug: "players-timelines-buffers",
    title: "Players, Timelines, And Buffers",
    kind: "Theory",
    summary: "Build the mental model for playback state before using Media Source Extensions.",
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
    ],
    outcome: "You understand media timelines, playheads, buffered ranges, seekable ranges, ready state, and stalls."
  },
  {
    slug: "progressive-download",
    title: "Progressive Download Playback",
    kind: "Practical",
    summary: "Play a normal MP4 with the video element before taking control of media bytes with MSE.",
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
    ],
    outcome: "A plain HTML page plays a progressively downloaded MP4 using video.src and browser-native fetching."
  },
  {
    slug: "streaming-segments",
    title: "Streaming And Segments",
    kind: "Theory",
    summary: "Move from complete files to short timed chunks that a player can request and buffer.",
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
    ],
    outcome: "You can explain HTTP delivery, segments, renditions, initialization data, and timed media chunks."
  },
  {
    slug: "mse-basics",
    title: "Build A Tiny MSE Player",
    kind: "Practical",
    summary: "Use Media Source Extensions to append initialization and media segments into a video element.",
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
    ],
    outcome: "A plain HTML page and ESM module append remote Big Buck Bunny audio/video bytes to SourceBuffers."
  },
  {
    slug: "protocols",
    title: "Streaming Protocols",
    kind: "Theory",
    summary: "Replace hardcoded segment lists with protocol manifests that describe time, quality, codecs, and URLs.",
    reference: "https://dashif.org/docs/DASH-IF-IOP-v4.3.pdf",
    blocks: [
      {
        type: "text",
        heading: "Why Protocols Exist",
        body: [
          "The previous demo hardcoded every segment. That works for a lab, but not for real media. A streaming protocol gives the player a manifest so it can discover available qualities, languages, timing, and segment URLs.",
          "DASH and HLS use different manifest formats, but the player questions are similar: what tracks exist, which encodes are available, where are the segments, how long do they last, and what codecs are required?"
        ],
        points: [
          "DASH uses an XML Media Presentation Description, usually called an MPD.",
          "HLS uses text playlists: a multivariant playlist points at media playlists.",
          "Both protocols let the player react to bandwidth, latency, and device capability."
        ]
      },
      {
        type: "diagram",
        visual: "timeline"
      },
      {
        type: "code",
        title: "Protocol Mental Model",
        explain: "Most HTTP streaming protocols separate discovery from media bytes. The manifest tells the player what timed resources can be requested.",
        code: `
Manifest
  available audio/video/text tracks
  available qualities or renditions
  codec and container requirements
  segment addressing rules
  timing information

Media
  initialization data
  timed media segments`
      },
      {
        type: "demo",
        title: "Manifest To Timeline",
        mode: "timeline",
        text: "A manifest maps segment numbers to timeline ranges so the player can request just enough future media."
      }
    ],
    outcome: "You understand why streaming protocols exist and how DASH and HLS describe media choices."
  },
  {
    slug: "dash-theory",
    title: "DASH",
    kind: "Theory",
    summary: "Read an MPD as a map from presentation time to track choices, representations, initialization data, and media segments.",
    reference: "https://dashif.org/docs/DASH-IF-IOP-v4.3.pdf",
    blocks: [
      {
        type: "text",
        heading: "The MPD Is The Map",
        body: [
          "A DASH manifest is an MPD: a Media Presentation Description. It is XML that describes the media presentation, but it does not usually contain the video or audio bytes itself.",
          "The MPD tells the player how to turn media time into HTTP requests. It can also describe whether the presentation is static VOD or dynamic live, how long the presentation is, how much buffer is recommended, and which profiles or features are in use."
        ],
        points: [
          "type=\"static\" usually means VOD; type=\"dynamic\" usually means live.",
          "mediaPresentationDuration describes total VOD duration.",
          "BaseURL values are resolved with normal URL rules and can appear at several levels."
        ]
      },
      {
        type: "diagram",
        visual: "timeline"
      },
      {
        type: "code",
        title: "MPD Structure",
        explain: "This is the hierarchy your parser walks before it can request any media bytes.",
        code: `
MPD
  BaseURL?
  Period
    AdaptationSet mimeType="video/mp4" codecs="avc1..."
      SegmentTemplate initialization="..." media="..."
      Representation id="v1" bandwidth="..." width="..." height="..."
      Representation id="v2" bandwidth="..." width="..." height="..."

    AdaptationSet mimeType="audio/mp4" codecs="mp4a..."
      SegmentTemplate initialization="..." media="..."
      Representation id="a1" bandwidth="..." audioSamplingRate="..."`
      },
      {
        type: "text",
        heading: "Period, AdaptationSet, Representation",
        body: [
          "A Period is a span of the presentation timeline. Many simple VOD streams have one Period. More complex streams can use multiple Periods for ad insertion, programme boundaries, codec changes, or metadata changes.",
          "An AdaptationSet groups interchangeable content for one role, such as video, audio, or subtitles. A Representation is one concrete encoding inside that group. For video, different Representations often mean different resolutions and bitrates. For audio, they may mean different bitrates, languages, channel layouts, or codecs."
        ],
        points: [
          "AdaptationSet answers: what kind of media is this track group?",
          "Representation answers: which exact encoding can I fetch?",
          "Attributes can be inherited, so mimeType or codecs may appear on the AdaptationSet, the Representation, or both."
        ]
      },
      {
        type: "text",
        heading: "Segment Addressing Modes",
        body: [
          "DASH has several ways to describe where segments live. The simplest for this tutorial is SegmentTemplate: the MPD gives a URL pattern, a start number, a duration, and a timescale. The player fills in values such as $RepresentationID$ and $Number$.",
          "Other MPDs may use SegmentList, where each segment URL is listed explicitly, or SegmentBase, where a Representation points at a resource and byte ranges or indexes describe where subsegments live."
        ],
        points: [
          "SegmentTemplate is compact and common for regularly numbered segment URLs.",
          "SegmentTimeline handles variable segment durations or explicit segment start times.",
          "SegmentList names each segment directly, which is simple but can make large manifests.",
          "SegmentBase can use byte ranges and MP4 index data such as sidx to locate subsegments inside a larger file."
        ]
      },
      {
        type: "code",
        title: "Addressing Modes At A Glance",
        explain: "The practical parser starts with SegmentTemplate. A production player needs to recognize more than one addressing shape.",
        code: `
SegmentTemplate
  initialization="avc1/$RepresentationID$/IS.mp4"
  media="avc1/$RepresentationID$/$Number%06d$.m4s"
  startNumber="1"
  duration="100000"
  timescale="25000"

SegmentList
  Initialization sourceURL="init.mp4"
  SegmentURL media="seg-1.m4s"
  SegmentURL media="seg-2.m4s"

SegmentBase
  Initialization range="0-900"
  media resource plus byte ranges or sidx index data`
      },
      {
        type: "text",
        heading: "Timing Fields",
        body: [
          "DASH timing values are often integers in a timescale, not seconds. If duration is 100000 and timescale is 25000, each segment is four seconds. The player converts those values into seconds when deciding what media time a segment covers.",
          "The startNumber tells the player which segment number to request first. For VOD, mediaPresentationDuration lets a simple player estimate how many segments to request. For live, the available segment numbers move over time, which is why live support needs additional rules."
        ],
        points: [
          "segmentSeconds = duration / timescale.",
          "media URLs often need token replacement before fetch.",
          "A/V representations must describe compatible timelines so their segments append into the same media element timeline."
        ]
      },
      {
        type: "demo",
        title: "MPD To Segment Requests",
        mode: "timeline",
        text: "A DASH player reads the MPD, chooses compatible Representations, expands addressing rules into URLs, and fetches the next timed segments."
      }
    ],
    outcome: "You understand the DASH MPD hierarchy, inherited attributes, SegmentTemplate timing, and alternative segment addressing modes."
  },
  {
    slug: "dash-vod",
    title: "Parse DASH VOD",
    kind: "Practical",
    summary: "Update the MSE player so it fetches an MPD and appends the audio/video segments described by the manifest.",
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
    ],
    outcome: "A browser ESM player fetches the BBC Big Buck Bunny MPD and plays audio plus video from manifest-derived segments."
  },
  {
    slug: "adaptive-bitrate",
    title: "Adaptive Bitrate",
    kind: "Practical",
    summary: "Use the DASH representations you parsed to choose a quality level from network and buffer signals.",
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
    ],
    outcome: "The DASH player selects the initial video representation with a small ABR algorithm instead of always hardcoding one quality."
  },
  {
    slug: "live-theory",
    title: "Live Playback Theory",
    kind: "Theory",
    summary: "Understand how live streams differ from VOD before adding manifest refresh and live-edge logic.",
    reference: "https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Audio_and_video_delivery/Live_streaming_web_audio_and_video",
    blocks: [
      {
        type: "text",
        heading: "A Moving Presentation",
        body: [
          "VOD has a fixed beginning and end. Live playback has a moving availability window. New segments appear at the front of the window as the event continues, and old segments can disappear from the back as the server stops advertising them.",
          "The viewer still watches normal media time through the video element, but the set of times that can be requested changes while playback is happening."
        ],
        points: [
          "The live edge is the newest media time currently available.",
          "The live window is the range of recent media times the server still makes available.",
          "A live player usually starts behind the live edge, not exactly on it."
        ]
      },
      {
        type: "diagram",
        visual: "timeline"
      },
      {
        type: "text",
        heading: "Latency And Safety",
        body: [
          "Live latency is the delay between capture and playback. Lower latency feels closer to real time, but it leaves less room for network delay, encoder delay, segment production, fetch time, append time, and decoding.",
          "A player chooses a target latency so it can stay close to live without constantly stalling. For a simple segment-based player, that target is often expressed as a few segments behind the live edge."
        ],
        points: [
          "Playing too close to the edge risks requesting a segment before it is complete or available.",
          "Playing too far behind increases delay but usually improves stability.",
          "The right target depends on segment duration, network conditions, and product expectations."
        ]
      },
      {
        type: "code",
        title: "Live Edge Mental Model",
        explain: "A simple player can think in segment numbers before dealing with wall-clock timing details.",
        code: `
const segmentDuration = 4;
const newestSegmentNumber = 120;
const targetLatencySegments = 3;

const startSegmentNumber = newestSegmentNumber - targetLatencySegments;
const approximateLatency = targetLatencySegments * segmentDuration;

console.log(startSegmentNumber);   // 117
console.log(approximateLatency);   // 12 seconds`
      },
      {
        type: "text",
        heading: "Manifest Refresh",
        body: [
          "A live manifest is not a static table. The player must refresh it to discover newly available segments and to learn when older segments have expired. DASH uses fields such as type=\"dynamic\", availabilityStartTime, timeShiftBufferDepth, minimumUpdatePeriod, and suggestedPresentationDelay to describe live behavior.",
          "The practical lesson keeps this deliberately small: refresh the manifest, calculate the segment numbers that should now be available, append missing segments, and schedule the next refresh."
        ],
        points: [
          "minimumUpdatePeriod tells the player how often the MPD may need refreshing.",
          "timeShiftBufferDepth describes how much recent history is available for seeking.",
          "suggestedPresentationDelay gives the service's recommended distance behind the live edge."
        ]
      },
      {
        type: "text",
        heading: "Buffer Cleanup",
        body: [
          "A live stream can run for hours, so a player cannot keep every appended segment forever. Old buffered media should be removed after the playhead has moved safely beyond it.",
          "Cleanup is a balancing act. Removing too little wastes memory. Removing too aggressively can break short backward seeks or cause playback to stall if timestamps and ranges are not handled carefully."
        ],
        points: [
          "Use SourceBuffer.remove(start, end) for old ranges.",
          "Do not remove media close to currentTime.",
          "Keep audio and video cleanup aligned so one track does not disappear before the other."
        ]
      },
      {
        type: "demo",
        title: "Sliding Live Window",
        mode: "timeline",
        text: "Live playback follows a moving segment window, targeting a stable delay behind the newest available media."
      }
    ],
    outcome: "You can explain live edge, live latency, sliding availability windows, MPD refresh, and why live buffers need cleanup."
  },
  {
    slug: "live",
    title: "Add Live Playback",
    kind: "Practical",
    summary: "Adapt the DASH player for dynamic manifests, live edge, latency, and buffer cleanup.",
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
    ],
    outcome: "The player refreshes a dynamic MPD and appends newly available segments near the live edge."
  },
  {
    slug: "subtitle-theory",
    title: "Subtitles In Streaming",
    kind: "Theory",
    summary: "Learn where timed text comes from and how browsers display cues alongside media.",
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
    ],
    outcome: "You understand sidecar subtitles, embedded text tracks, WebVTT, TTML, IMSC, languages, and cue timing."
  },
  {
    slug: "subtitle-practical",
    title: "Add Subtitle Support",
    kind: "Practical",
    summary: "Attach sidecar WebVTT captions and control active subtitle tracks from JavaScript.",
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
    ],
    outcome: "The tutorial player loads and toggles WebVTT subtitle tracks."
  },
  {
    slug: "imsc-practical",
    title: "Render IMSC Subtitles",
    kind: "Practical",
    summary: "Replace native WebVTT rendering with a small custom IMSC renderer layered over the video.",
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
    ],
    outcome: "The tutorial player fetches a simple IMSC document, parses timed paragraphs, and paints active cues."
  },
  {
    slug: "drm-theory",
    title: "DRM And EME",
    kind: "Theory",
    summary: "Understand encrypted media at the browser boundary without hiding the moving parts.",
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
    ],
    outcome: "You understand init data, key systems, MediaKeys, sessions, licenses, and ClearKey limitations."
  },
  {
    slug: "drm-practical",
    title: "Add Optional ClearKey DRM",
    kind: "Practical",
    summary: "Wire a minimal ClearKey EME flow so users can see the browser DRM lifecycle.",
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
    ],
    outcome: "The player can attach MediaKeys and update a ClearKey session for compatible encrypted samples."
  },
  {
    slug: "putting-it-all-together",
    title: "Putting It All Together",
    kind: "Practical",
    summary: "Run the finished in-app player: DASH manifest parsing, audio/video MSE appends, playback controls, ABR startup selection, and custom subtitles.",
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
    ],
    outcome: "A working browser player loads a Big Buck Bunny DASH stream with audio, video, and subtitle cues."
  }
];
