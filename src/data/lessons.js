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
        file: "inspect-av-with-ffmpeg/lab.sh",
        region: "check-tools"
      },
      {
        type: "code",
        title: "Generate A Test MP4",
        explain: "Create a five-second MP4 with a 1280x720, 25 fps video test pattern and a 48 kHz sine-wave audio track.",
        file: "inspect-av-with-ffmpeg/lab.sh",
        region: "generate-mp4"
      },
      {
        type: "code",
        title: "Inspect Streams",
        explain: "The stream output connects directly to resolution, frame rate, pixel format, sample rate, channels, codec names, and duration.",
        file: "inspect-av-with-ffmpeg/lab.sh",
        region: "inspect-streams"
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
        file: "inspect-av-with-ffmpeg/lab.sh",
        region: "compact-fields"
      },
      {
        type: "checkpoint",
        slug: "inspect-av-with-ffmpeg",
        run: false,
        files: [
          "lab.sh"
        ],
        verify: [
          "lab/fundamentals.mp4 exists and is a few hundred KB.",
          "Video stream: codec_name=h264, profile=High, width=1280, height=720, pix_fmt=yuv420p, r_frame_rate=25/1, avg_frame_rate=25/1, duration=5.000000.",
          "Audio stream: codec_name=aac, sample_rate=48000, channels=2, channel_layout=stereo, duration=5.000000.",
          "The audio stream reports r_frame_rate=0/0 in the full dump: frame rate is a video-only concept."
        ],
        note: "Run it from the directory where you want the lab/ folder: bash path/to/lab.sh. It creates ./lab/ in your current directory and needs only FFmpeg and FFprobe."
      },
      {
        type: "exercise",
        title: "Change The Source, Predict The Fields",
        task: [
          "Edit the generate step to produce a 640x360, 30 fps video with a 44.1 kHz audio track, saving it as lab/variant.mp4.",
          "Before you run ffprobe, write down the width, height, r_frame_rate and sample_rate you expect. Then run the compact field view and compare."
        ],
        hint: "Change size=, rate= and sample_rate= in the lavfi inputs, and the output filename. Remember -g 50 is a frame count, so at 30 fps it is no longer exactly 2 seconds."
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
          "A camera does not start with H.264 or AV1. It starts with samples that describe light. This example is a 10-bit 4:2:2 production or camera-style signal at 1920 by 1080 and 25 fps: each frame has a Y plane at 1920 by 1080, a Cb plane at 960 by 1080, and a Cr plane at 960 by 1080.",
          "Y is luma, the brightness detail. Cb and Cr are chroma difference samples. They are 960 pixels wide here because each chroma sample is shared across a pair of horizontal luma samples, so the colour information is sampled at half the horizontal resolution. This is the 4:2:2 pattern from the chroma subsampling section of the video fundamentals lesson."
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
        heading: "Contrast: 8-Bit 4:2:0 Web Delivery",
        body: [
          "Typical web delivery is 8-bit 4:2:0, as covered under chroma subsampling in the video fundamentals lesson. Chroma is halved vertically as well as horizontally, so each chroma plane is 960 by 540 instead of 960 by 1080.",
          "That gives 1920 x 1080 luma plus two 960 x 540 chroma planes: 2,073,600 + 518,400 + 518,400 = 3,110,400 samples per frame. At 8 bits per sample and 25 fps, that is 622,080,000 bit/s, about 622 Mbit/s or 77.8 MB/s."
        ],
        points: [
          "Dropping from 10-bit 4:2:2 to 8-bit 4:2:0 cuts the raw rate to 60%, before any codec has done anything.",
          "Even 622 Mbit/s is far beyond what a viewer's connection can carry, so compression is still essential."
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
        file: "inspect-codecs-compression/lab.sh",
        region: "create-source"
      },
      {
        type: "code",
        title: "Compare CRF Values",
        explain: "Lower CRF generally means higher quality and larger output. The codec is still H.264 in both files.",
        file: "inspect-codecs-compression/lab.sh",
        region: "compare-crf"
      },
      {
        type: "code",
        title: "Inspect Codec And Bitrate",
        explain: "Use FFprobe to compare codec name, profile, pixel format, and reported bitrate.",
        file: "inspect-codecs-compression/lab.sh",
        region: "inspect-bitrate"
      },
      {
        type: "code",
        title: "Force A Bitrate Target",
        explain: "This creates a more delivery-oriented encode. The maxrate and bufsize options constrain bitrate variation.",
        file: "inspect-codecs-compression/lab.sh",
        region: "bitrate-target"
      },
      {
        type: "code",
        title: "Inspect Frame Types",
        explain: "The pict_type values show I, P, and B frames. Key frames are the random access points used for startup and seeking. pkt_pts_time was removed in FFmpeg 5 and prints nothing, so use pts_time. ffprobe prints fields in its own order, not the order you list in -show_entries, so the compact format is used here to label every value. Note that B-frames mean decode order differs from presentation order.",
        file: "inspect-codecs-compression/lab.sh",
        region: "frame-types"
      },
      {
        type: "code",
        title: "Change GOP And B-Frames",
        explain: "This encode uses a shorter GOP and disables B-frames. It is easier to decode and reason about, but usually less efficient.",
        file: "inspect-codecs-compression/lab.sh",
        region: "gop-no-bframes"
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
        type: "checkpoint",
        slug: "inspect-codecs-compression",
        run: false,
        files: [
          "lab.sh"
        ],
        verify: [
          "ls -lh shows lab/h264-crf18.mp4 at about 4.1M and lab/h264-crf32.mp4 at about 900K: same source, same codec, roughly 4.5x size difference.",
          "bit_rate for the CRF 18 encode is around 4.1 Mbps (4100631 here) against around 0.8 Mbps (788351) for CRF 32. Both report codec_name=h264 and profile=High.",
          "Frame types for the default encode start I, B, P, P: B-frames are present, so pts_time order differs from decode order.",
          "The GOP 25 / -bf 0 encode prints only I and P frames, with a key frame (key_frame=1) every 25 frames."
        ],
        note: "Run it from the directory where you want the lab/ folder: bash path/to/lab.sh. It creates ./lab/ in your current directory and needs only FFmpeg and FFprobe."
      },
      {
        type: "exercise",
        title: "Find The CRF Sweet Spot",
        task: [
          "Encode lab/source.mkv at CRF 23 and CRF 28 (keep -g 50 and the AAC settings), then compare file size and video bit_rate with the CRF 18 and 32 results.",
          "Plot or tabulate size against CRF. Decide which value you would ship for this test pattern, and say what you would check before trusting that choice on real content."
        ],
        hint: "Reuse the Compare CRF command with a different -crf and output name. On this source expect roughly 2.8 MB at CRF 23 and 1.5 MB at CRF 28. Read bit_rate with -show_entries stream=bit_rate. A synthetic test pattern compresses unlike real footage, so size ratios will not transfer."
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
    summary: "Use FFprobe and Bento4 mp4dump to inspect tracks, packets, timestamps, keyframes, and MP4 box structure.",
    reference: "https://ffmpeg.org/ffprobe.html",
    blocks: [
      {
        type: "text",
        heading: "Inspect The Container, Not Just The Codec",
        body: [
          "The previous labs created encoded audio and video. This lab looks at how the MP4 container describes those encoded samples as tracks, packets, timestamps, durations, and byte-addressed payload.",
          "FFprobe is excellent for stream, packet, frame, and timing inspection. Bento4's mp4dump complements it by showing the MP4 box tree directly, which is how you inspect ftyp, moov, trak, mdia, and mdat as container structures."
        ],
        points: [
          "Streams are logical tracks such as video and audio.",
          "Packets are encoded chunks with timestamps and sizes.",
          "Frames are decoded pictures or audio frames exposed by the demuxer/decoder path.",
          "mp4dump exposes the MP4 box hierarchy that FFprobe abstracts away."
        ]
      },
      {
        type: "code",
        title: "Check The Tools",
        explain: "This lab expects FFmpeg, FFprobe, and Bento4's mp4dump to be available on your command line.",
        file: "inspect-mp4-containers/lab.sh",
        region: "check-tools"
      },
      {
        type: "code",
        title: "Create A Fast-Start MP4",
        explain: "The +faststart flag places the moov metadata near the start, which helps progressive download startup.",
        file: "inspect-mp4-containers/lab.sh",
        region: "create-faststart"
      },
      {
        type: "code",
        title: "Show Format And Streams",
        explain: "This is the high-level view: one container with video and audio streams.",
        file: "inspect-mp4-containers/lab.sh",
        region: "show-format"
      },
      {
        type: "code",
        title: "Inspect Packets",
        explain: "Packets expose encoded payload timing. Look for stream_index, pts_time, dts_time, duration_time, size, and flags. The compact format labels each field, because ffprobe prints fields in its own order rather than the -show_entries order.",
        file: "inspect-mp4-containers/lab.sh",
        region: "inspect-packets"
      },
      {
        type: "code",
        title: "Inspect Frames And Keyframes",
        explain: "Frame inspection helps connect MP4 timing with codec structure. Keyframes are the safe random access points. Fields are labelled because ffprobe ignores the -show_entries order; the first frame may also print extra encoder side data such as an x264 SEI message.",
        file: "inspect-mp4-containers/lab.sh",
        region: "inspect-frames"
      },
      {
        type: "text",
        heading: "Box Tree Inspection",
        body: [
          "FFprobe gives you stream and packet information. mp4dump gives you the MP4 box tree. Use both views together: FFprobe shows what the media means to a demuxer, while mp4dump shows how the file is actually structured.",
          "Box dumps are useful when you need to debug malformed MP4s, metadata placement, timescales, missing track metadata, or fragmented output."
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
        title: "Inspect The MP4 Box Tree",
        explain: "This prints the MP4 box tree. Look for ftyp, moov, mvhd, trak, tkhd, mdia, and mdat.",
        file: "inspect-mp4-containers/lab.sh",
        region: "box-tree"
      },
      {
        type: "checkpoint",
        slug: "inspect-mp4-containers",
        run: false,
        files: [
          "lab.sh"
        ],
        verify: [
          "Format: format_name=mov,mp4,m4a,3gp,3g2,mj2, nb_streams=2, duration=6.000000.",
          "Video stream nb_frames=150 (6 s x 25 fps); audio nb_frames=283 (AAC frames of 1024 samples).",
          "The first video packet has flags=K__ (keyframe) and dts_time=-0.080000 before pts_time=0.000000: B-frame reordering shows up as DTS earlier than PTS.",
          "Packets in decode order have non-monotonic pts_time (0.000, 0.080, 0.040 ...).",
          "The box tree lists ftyp, moov (mvhd, trak, tkhd, mdia) and mdat. Without Bento4 the lab prints \"mp4dump not found; skipping box tree (install Bento4)\" and carries on."
        ],
        note: "Run it from the directory where you want the lab/ folder: bash path/to/lab.sh. It creates ./lab/ in your current directory and needs only FFmpeg and FFprobe. If mp4dump is not installed, the box-tree steps print a notice and are skipped."
      },
      {
        type: "exercise",
        title: "Find The Keyframes",
        task: [
          "List only the video keyframe packets in lab/container-faststart.mp4 with their timestamps, and work out the keyframe interval in seconds.",
          "Then explain why that interval follows from -g 50 and the 25 fps frame rate, and what it means for where a player can start or seek."
        ],
        hint: "Use -show_packets -show_entries packet=pts_time,flags -of csv=p=0 and filter for lines containing K. You should find keyframes at 0, 2 and 4 seconds."
      },
      {
        type: "demo",
        title: "Container Evidence",
        mode: "packets",
        text: "A container maps encoded packets to tracks, timestamps, byte sizes, keyframes, and presentation order."
      }
    ],
    outcome: "You can inspect an MP4 as streams, packets, frames, timestamps, keyframes, and a concrete MP4 box tree."
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
        file: "create-fragmented-mp4/lab.sh",
        region: "create-progressive"
      },
      {
        type: "code",
        title: "Create A Fragmented MP4",
        explain: "These movflags produce an MP4 with initialization metadata followed by fragments. The keyframe settings keep fragment boundaries predictable.",
        file: "create-fragmented-mp4/lab.sh",
        region: "create-fragmented"
      },
      {
        type: "code",
        title: "Compare High-Level Metadata",
        explain: "FFprobe still sees both as MP4 files with audio and video streams. Fragmentation is mainly a container layout difference.",
        file: "create-fragmented-mp4/lab.sh",
        region: "compare-metadata"
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
        title: "Inspect Fragment Boxes",
        explain: "Use mp4dump to inspect the fragmented MP4. Look for ftyp, moov, repeated moof boxes, and mdat payload boxes.",
        file: "create-fragmented-mp4/lab.sh",
        region: "fragment-boxes"
      },
      {
        type: "code",
        title: "Optional: Segment With FFmpeg",
        explain: "This creates a DASH-style init segment and numbered media segments. The later DASH lessons use manifests to discover files like these. By default FFmpeg's dash muxer writes a SegmentTimeline, which the parser built later in this course does not read; it only understands SegmentTemplate with a fixed duration and $Number$. -use_template 1 -use_timeline 0 makes FFmpeg write exactly that form, with duration and startNumber.",
        file: "create-fragmented-mp4/lab.sh",
        region: "dash-segments"
      },
      {
        type: "text",
        heading: "Check The Manifest And Audio Segment Durations",
        body: [
          "Open lab/dash/manifest.mpd. Each Representation should carry a SegmentTemplate with timescale, duration, and startNumber, and the file should contain no SegmentTimeline element. With the generated 2 second setting the template reads timescale=\"1000000\" duration=\"2000000\", which is 2 seconds.",
          "Audio segment durations will not exactly match video. AAC frames are 1024 samples, so at 48 kHz each frame lasts 21.33 ms and audio segments can only start on multiples of that. In this lab the second audio segment starts at 1.920 s (90 frames), the third at 3.925 s, and the audio track can finish with a very short extra segment, so audio may report one more segment than video for the same period."
        ],
        points: [
          "The template duration is nominal; real audio segments land within a frame of it.",
          "Players should position audio by the timestamps inside the segment, not by index x duration."
        ]
      },
      {
        type: "checkpoint",
        slug: "create-fragmented-mp4",
        run: false,
        files: [
          "lab.sh"
        ],
        verify: [
          "major_brand is isom (compatible isomiso2avc1mp41) for lab/progressive.mp4 and iso5 (compatible iso5iso6mp41) for lab/fragmented.mp4.",
          "The fragmented file reports nb_frames=N/A and duration=8.080000 for audio; the progressive file reports nb_frames=200 for video.",
          "ls lab/dash lists init-0.mp4, init-1.mp4, manifest.mpd, 4 video chunks (chunk-0-00001..4.m4s) and 5 audio chunks (chunk-1-00001..5.m4s): audio has one extra short segment.",
          "manifest.mpd contains no SegmentTimeline (grep -c prints 0) and a template with timescale=\"1000000\" duration=\"2000000\".",
          "With Bento4 installed, mp4dump lab/fragmented.mp4 shows ftyp, an empty moov, then repeated moof and mdat boxes."
        ],
        note: "Run it from the directory where you want the lab/ folder: bash path/to/lab.sh. It creates ./lab/ in your current directory and needs only FFmpeg and FFprobe. If mp4dump is not installed, the fragment-box step prints a notice and is skipped."
      },
      {
        type: "exercise",
        title: "Change The Segment Duration",
        task: [
          "Re-run the DASH segmenting step with -seg_duration 4 into a different folder, such as lab/dash4.",
          "Count the video and audio chunks, and check the new SegmentTemplate duration. Explain why 4 seconds still works with -g 50 at 25 fps, and what would go wrong with -seg_duration 3."
        ],
        hint: "Expect 2 video chunks and 3 audio chunks. Segments must start on keyframes, and keyframes here are 2 s apart, so only multiples of 2 s can be honoured exactly."
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
        file: "progressive-download/index.html",
        region: "index"
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
        file: "progressive-download/player.js"
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
        type: "checkpoint",
        slug: "progressive-download",
        run: true,
        files: [
          "index.html",
          "player.js"
        ],
        verify: [
          "DevTools Network shows one request for flower.mp4 (status 200, or 206 Partial Content for range requests) and no .m4s segment requests.",
          "Console prints duration 5.0 and size 960 540 once, then repeated buffered 0 <n> lines as the file downloads.",
          "Console prints ready to play 3 or 4 (HAVE_FUTURE_DATA or HAVE_ENOUGH_DATA); the native controls play, pause and seek.",
          "video.buffered in the console reports the same range the progress logs show."
        ]
      },
      {
        type: "exercise",
        title: "Watch The Browser Buffer",
        task: [
          "Add waiting, seeking and seeked listeners that log currentTime and the buffered ranges. Throttle the network to Slow 3G in DevTools, hard-reload, and press play.",
          "Note when waiting fires relative to the buffered end, then seek past the buffered end and see what the Network panel does."
        ],
        hint: "Use video.addEventListener(\"waiting\", ...) and reuse logRanges. Disable cache in DevTools so the file really re-downloads."
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
        explain: "Before ABR, the core streaming loop is simply request a segment, append it, then move to the next segment. Each append is wrapped in a promise that settles on updateend, so the loop runs one segment at a time and the caller can await it.",
        code: `
async function fetchBytes(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(\`HTTP \${response.status} for \${url}\`);
  return response.arrayBuffer();
}

function appendBuffer(sourceBuffer, bytes) {
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      sourceBuffer.removeEventListener("updateend", onEnd);
      sourceBuffer.removeEventListener("error", onError);
    };
    const onEnd = () => { cleanup(); resolve(); };
    const onError = () => { cleanup(); reject(new Error("appendBuffer failed")); };
    sourceBuffer.addEventListener("updateend", onEnd);
    sourceBuffer.addEventListener("error", onError);
    sourceBuffer.appendBuffer(bytes);
  });
}

async function appendSegments(sourceBuffer, segments) {
  for (const segment of segments) {
    const bytes = await fetchBytes(segment.url);
    await appendBuffer(sourceBuffer, bytes);
  }
}

// The caller can await the whole loop:
// await appendSegments(videoBuffer, representation.segments);`
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
        file: "mse-basics/index.html",
        region: "index"
      },
      {
        type: "code",
        title: "Create MediaSource",
        explain: "MediaSource is the browser object that will receive media bytes from your JavaScript.",
        file: "mse-basics/player.js",
        region: "create-media-source"
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
        explain: "The object URL lets the video element treat your MediaSource as its media resource. Nothing can be appended yet: wait for the sourceopen event, which the final handler below listens for, before adding SourceBuffers.",
        file: "mse-basics/player.js",
        region: "attach"
      },
      {
        type: "code",
        title: "Describe The Tracks",
        explain: "This lab uses one video track and one audio track from the BBC Big Buck Bunny DASH stream. The first file for each track is the initialization segment, and it must come from the same Representation as the media segments that follow it, so the audio init and media segments all use 128kbps.",
        file: "mse-basics/player.js",
        region: "describe-tracks"
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
        explain: "Create one SourceBuffer for each MIME type. The browser uses the codec string to decide whether it can decode the bytes you append. This single line sits inside the sourceopen handler, once per track, and is shown on its own here. It appears exactly once in the finished player.js, so do not add it a second time.",
        file: "mse-basics/player.js",
        region: "add-source-buffer"
      },
      {
        type: "code",
        title: "Append A Queue",
        explain: "appendBuffer is asynchronous. This helper waits for updateend before feeding the next chunk to the same SourceBuffer, and rejects if the SourceBuffer fires an error so a bad segment fails loudly instead of hanging.",
        file: "mse-basics/player.js",
        region: "append-queue"
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
        explain: "This is the sourceopen handler. Once the MediaSource is open, it creates the SourceBuffers (the previous step, in its final home), fetches each init and media segment, appends each track queue, then closes the stream. The console.log is a placeholder you can remove.",
        file: "mse-basics/player.js",
        region: "fetch-and-append"
      },
      {
        type: "code",
        title: "Complete player.js",
        explain: "This complete file is runnable as-is beside the index.html from the first snippet. The steps above are excerpts of it.",
        file: "mse-basics/player.js"
      },
      {
        type: "checkpoint",
        slug: "mse-basics",
        run: true,
        files: [
          "index.html",
          "player.js"
        ],
        verify: [
          "DevTools Network shows IS.mp4 then 000001.m4s, 000002.m4s, 000003.m4s for avc1/896x504p25, and the same four files for audio/128kbps.",
          "Console prints MediaSource is open once.",
          "After a moment, video.buffered.end(0) in the console is about 11.52 (3 segments x 3.84 s) and video.duration matches.",
          "The video plays for about 11.5 seconds and then ends; there is no src attribute on the video element, only a blob: URL set by script."
        ]
      },
      {
        type: "exercise",
        title: "Append Three More Segments",
        task: [
          "Add 000004.m4s, 000005.m4s and 000006.m4s to both tracks' file lists.",
          "Reload and confirm video.buffered.end(0) grows by 3 x 3.84 s, from about 11.52 to about 23.04, and that the video now plays for about 23 seconds."
        ],
        hint: "Only the files arrays in the tracks description change. Segment numbers are zero-padded to six digits. Check the Network panel for six media requests per track."
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
    slug: "mse-debugging",
    title: "MSE Debugging And Failure Modes",
    kind: "Theory",
    summary: "Learn how to inspect MSE state, browser media errors, append failures, and timestamp problems when playback does not work.",
    reference: "https://developer.mozilla.org/en-US/docs/Web/API/Media_Source_Extensions_API",
    blocks: [
      {
        type: "text",
        heading: "Debug State, Not Just Code",
        body: [
          "MSE failures often look opaque because the browser owns parsing, decode, buffering, and A/V synchronization. A player engineer needs to inspect state at several layers: the media element, the MediaSource, each SourceBuffer, network requests, and the encoded media itself.",
          "The fastest debugging path is to ask where the pipeline stopped. Did fetch fail? Did addSourceBuffer reject the MIME string? Did appendBuffer throw? Did updateend never fire? Did bytes append but produce no buffered time? Did buffered time exist but decode fail?"
        ],
        points: [
          "HTMLMediaElement exposes playback state and final media errors.",
          "MediaSource exposes whether the append pipeline is open, ended, or closed.",
          "SourceBuffer exposes whether an append or remove operation is still updating."
        ]
      },
      {
        type: "diagram",
        visual: "buffer"
      },
      {
        type: "code",
        title: "Log The Browser Media State",
        explain: "Start with the media element because it tells you whether the browser thinks it has data, can play, is waiting, or has hit a fatal error.",
        code: `
const video = document.querySelector("video");

for (const eventName of ["loadedmetadata", "canplay", "waiting", "stalled", "error"]) {
  video.addEventListener(eventName, () => {
    console.log(eventName, {
      currentTime: video.currentTime,
      readyState: video.readyState,
      networkState: video.networkState,
      error: video.error?.message ?? video.error?.code
    });
    logRanges("buffered", video.buffered);
    logRanges("seekable", video.seekable);
  });
}

function logRanges(label, ranges) {
  console.log(label, Array.from({ length: ranges.length }, (_, i) => [
    ranges.start(i),
    ranges.end(i)
  ]));
}`
      },
      {
        type: "text",
        heading: "SourceBuffer Rules",
        body: [
          "A SourceBuffer is strict. You cannot append while it is updating. You cannot append bytes with a MIME type or codec the browser does not support. You cannot rely on downloaded bytes becoming playable time if the timestamps are missing, discontinuous, overlapping in the wrong way, or incompatible with previous appends.",
          "Most MSE bugs fall into a small set: wrong codec string, missing init segment, append called while updating, media segments appended out of order, timestamp gaps, quota pressure, or a decode error in the media bytes."
        ],
        points: [
          "Check MediaSource.isTypeSupported before addSourceBuffer.",
          "Append initialization data before media fragments.",
          "Wait for updateend before appending the next chunk.",
          "Inspect buffered ranges after append; do not assume bytes equal playable time."
        ]
      },
      {
        type: "code",
        title: "Guard Append Operations",
        explain: "This wrapper makes append failures visible. It resolves on updateend, rejects on error, abort, or a synchronous throw such as QuotaExceededError, and removes its listeners once settled so repeated appends do not pile them up.",
        code: `
function appendBufferChecked(sourceBuffer, bytes, label) {
  if (sourceBuffer.updating) {
    throw new Error(\`\${label}: SourceBuffer is still updating\`);
  }

  return new Promise((resolve, reject) => {
    const events = {
      updateend: () => settle(resolve),
      error: () => settle(reject, new Error(\`\${label}: SourceBuffer error\`)),
      abort: () => settle(reject, new Error(\`\${label}: SourceBuffer abort\`))
    };
    const settle = (callback, value) => {
      for (const [name, listener] of Object.entries(events)) {
        sourceBuffer.removeEventListener(name, listener);
      }
      callback(value);
    };

    for (const [name, listener] of Object.entries(events)) {
      sourceBuffer.addEventListener(name, listener);
    }

    try {
      sourceBuffer.appendBuffer(bytes);
    } catch (error) {
      settle(reject, error);
    }
  });
}`
      },
      {
        type: "text",
        heading: "Common Failure Modes",
        body: [
          "Unsupported codec strings usually fail at addSourceBuffer or decode. CORS and HTTP errors fail before append. QuotaExceededError means the browser refused more buffered data, usually because the player appended too much without removing old ranges. Timestamp gaps can append successfully but create disjoint buffered ranges that stall at the gap.",
          "DevTools is part of the workflow. Use the Network panel to inspect status codes, CORS headers, Content-Type, range requests, and segment sizes. Use the Media panel to inspect ready state, buffered ranges, errors, and selected tracks."
        ],
        points: [
          "If addSourceBuffer throws, check MIME and codec strings first.",
          "If fetch throws, check URL resolution, CORS, status code, and content type.",
          "If append throws QuotaExceededError, remove old buffered media or reduce buffer target.",
          "If playback stalls with buffered data, inspect gaps and A/V alignment."
        ]
      },
      {
        type: "code",
        title: "Check Support Before Appending",
        explain: "Make unsupported codec problems explicit instead of letting them fail later in the pipeline.",
        code: `
function requireSupported(mime) {
  if (!MediaSource.isTypeSupported(mime)) {
    throw new Error(\`Unsupported SourceBuffer type: \${mime}\`);
  }
}

requireSupported('video/mp4; codecs="avc1.64001f"');
requireSupported('audio/mp4; codecs="mp4a.40.2"');`
      },
      {
        type: "text",
        heading: "When Bytes Append But Playback Fails",
        body: [
          "The hardest class of bugs happens after appendBuffer succeeds. That only proves the browser accepted bytes for parsing. It does not prove the decoded samples form a continuous, synchronized timeline.",
          "At that point, inspect media structure. Use ffprobe, mp4dump, or browser DevTools to check whether init segments match media segments, whether decode and presentation timestamps are continuous, whether the segment starts with a usable random access point, and whether audio and video describe the same timeline."
        ],
        points: [
          "Successful append is not the same as successful decode.",
          "Continuous video without matching audio can still stall.",
          "A gap in TimeRanges is usually a timestamp or missing-segment problem."
        ]
      },
      {
        type: "demo",
        title: "Failure Pipeline",
        mode: "buffer",
        text: "Debug MSE by locating the failed stage: network, MIME support, append sequencing, timestamp continuity, decode, or playback state."
      }
    ],
    outcome: "You can inspect MSE playback failures using media element state, MediaSource state, SourceBuffer events, buffered ranges, DevTools, and media-file inspection."
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
          "The MPD tells you the base URL, codec string, initialization URL, media URL pattern, start number, duration, and total presentation duration. That is enough to request sequential VOD audio and video segments. BaseURL can appear at the MPD level, the AdaptationSet level, or not at all, so resolve each optionally.",
          "The parser also stops after TUTORIAL_SEGMENT_LIMIT segments. Big Buck Bunny is about 9.5 minutes long and this player appends everything up front with no buffer management, so the limit (36 segments of 3.84 seconds, about 2.3 minutes) keeps memory bounded. Later lessons add buffer goals and removal; until then, raise the limit with care."
        ],
        points: [
          "Use DOMParser instead of string splitting XML.",
          "Resolve segment URLs with new URL(relative, manifestUrl).",
          "Codecs and mimeType can sit on the AdaptationSet or the Representation; a Representation value overrides the AdaptationSet value, they are never concatenated.",
          "TUTORIAL_SEGMENT_LIMIT caps the segment list for this tutorial only; it is not part of DASH.",
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
        explain: "This parser intentionally supports the small BBC DASH subset used by the tutorial: one Period, audio/video AdaptationSets, optional BaseURL, and SegmentTemplate. A Representation's mimeType and codecs override the AdaptationSet's, and each Representation keeps mimeType, codecs, and the combined mime string so later lessons can compare them.",
        file: "dash-vod/dash.js"
      },
      {
        type: "code",
        title: "player.js With DASH",
        explain: "The player no longer knows segment filenames. It asks the manifest parser for selected audio and video representations, then appends each track with an await loop so a failed fetch or append rejects instead of hanging.",
        file: "dash-vod/player.js"
      },
      {
        type: "checkpoint",
        slug: "dash-vod",
        run: true,
        files: [
          "index.html",
          "dash.js",
          "player.js"
        ],
        verify: [
          "DevTools Network shows the MPD first (redirected to vod-dash-ww-rd-live.akamaized.net), then IS.mp4 for avc1/896x504p25 and for audio/160kbps, then numbered .m4s segments.",
          "36 media segments are requested per track (TUTORIAL_SEGMENT_LIMIT), so video.buffered.end(0) ends near 138.24 (36 x 3.84 s).",
          "The chosen video Representation is the lowest bandwidth (896x504p25, 1416688 bps) and the audio is the highest (160kbps).",
          "Playback runs for about 2.3 minutes and ends; no segment URL is hardcoded in player.js."
        ]
      },
      {
        type: "exercise",
        title: "Pick The 720p Representation",
        task: [
          "Change the video choice so the player requests the 1280x720p25 Representation rather than the lowest one.",
          "Confirm in the Network panel that the requests are now 1280x720p25/IS.mp4 and 1280x720p25/00000N.m4s, and compare segment sizes with the 504p ones."
        ],
        hint: "Replace chooseLowest(video) with video.find((rep) => rep.id === \"1280x720p25\") ?? chooseLowest(video). Representation ids come straight from the MPD, and they are also available through dash.representations.video."
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
    slug: "demuxing-samples",
    title: "Demuxing Media Samples",
    kind: "Theory",
    summary: "Follow fragmented MP4 one level below media segments and see how a demuxer exposes timed encoded samples.",
    reference: "https://developer.mozilla.org/en-US/docs/Web/API/WebCodecs_API",
    blocks: [
      {
        type: "text",
        heading: "A Segment Contains Samples",
        body: [
          "MSE accepts a complete initialization segment and media fragments, then the browser demuxes and decodes them internally. WebCodecs gives JavaScript access to the decoder boundary, so a player must do the demuxing work itself.",
          "An fMP4 init segment describes tracks, timescales, and codec setup. Each media fragment pairs moof metadata with mdat bytes. The sample run metadata tells us where each encoded access unit starts, how many bytes it occupies, and where it belongs on the track timeline."
        ],
        points: [
          "tfhd identifies the track and can provide default sample fields.",
          "tfdt gives the first decode timestamp in a fragment.",
          "trun lists sample durations, sizes, flags, and optional composition offsets.",
          "mdat stores the encoded sample bytes; sample flags identify random access points."
        ]
      },
      {
        type: "diagram",
        visual: "fmp4"
      },
      {
        type: "text",
        heading: "Decode Time And Presentation Time",
        body: [
          "Track timestamps are integer ticks. Divide by that track's timescale to get seconds. Decode time tells the decoder when a sample must be processed; a composition offset maps it to presentation time. With B-frames, decode order can differ from display order.",
          "The demuxer feeds samples to a decoder in decode order and carries presentation timestamps with each chunk. The output frames can then be scheduled on a shared audio/video playback clock."
        ],
        points: [
          "Encoded samples are compressed access units, not decoded pixels or PCM audio.",
          "Video keyframe flags tell the decoder where independent decoding can begin.",
          "Audio and video have different timescales but share one presentation timeline."
        ]
      },
      {
        type: "code",
        title: "From Fragment Bytes To Samples",
        explain: "The tutorial demuxer reads track setup once, then extracts each sample's bytes and timing from media fragments.",
        code: `
const tracks = parseInitSegment(initializationBytes);
const samples = demuxFragment(mediaSegmentBytes, tracks);

for (const sample of samples) {
  const decodeSeconds = sample.decodeTime / sample.track.timescale;
  const presentationSeconds = sample.timestamp / sample.track.timescale;
  console.log(sample.track.kind, sample.data.byteLength, decodeSeconds, presentationSeconds, sample.key);
}`
      },
      {
        type: "text",
        heading: "A Deliberately Small Parser",
        body: [
          "The hands-on parser supports the H.264 and AAC fragmented MP4 tracks used by this tutorial's single-period DASH VOD example. It reads the sample descriptions, tfhd, tfdt, trun, and mdat boxes needed for that path.",
          "MP4 has many valid layouts and optional fields. This parser reports unsupported structures instead of claiming to handle flat MP4 sample tables, encrypted samples, every codec, or every fMP4 variation."
        ]
      }
    ],
    outcome: "You can explain how fMP4 track metadata and fragment boxes locate encoded samples and map them onto decode and presentation timelines."
  },
  {
    slug: "webcodecs-playback",
    title: "Decode Samples With WebCodecs",
    kind: "Practical",
    summary: "Use your DASH and demuxing knowledge to decode H.264 and AAC samples and schedule synchronized video and audio output.",
    reference: "https://developer.mozilla.org/en-US/docs/Web/API/WebCodecs_API",
    blocks: [
      {
        type: "text",
        heading: "The Decoder Boundary",
        body: [
          "WebCodecs accepts encoded chunks plus codec configuration. It does not fetch DASH segments, parse MP4, create a media timeline, or present a complete movie for you. The player connects those pieces: MPD, segment fetch, demuxed samples, decoders, and output scheduling.",
          "The example uses VideoDecoder output frames drawn to a canvas and AudioDecoder output scheduled through AudioContext. Both tracks use timestamps derived from their fMP4 timescales, so audio and video follow one playback clock."
        ],
        points: [
          "Check VideoDecoder and AudioDecoder configuration support before decoding.",
          "Send compressed samples in decode order and label video keyframes correctly.",
          "Use decoded timestamps for presentation and apply backpressure to decoder queues.",
          "Close VideoFrame and AudioData objects when they are no longer needed."
        ]
      },
      {
        type: "code",
        title: "Configure A Video Decoder",
        explain: "The H.264 sample entry provides the codec string and avcC decoder configuration needed by WebCodecs.",
        code: `
const support = await VideoDecoder.isConfigSupported({
  codec: track.config.codec,
  description: track.config.description
});
if (!support.supported) throw new Error("This device cannot decode this H.264 profile");

decoder.configure(support.config);
decoder.decode(new EncodedVideoChunk({
  type: sample.key ? "key" : "delta",
  timestamp: presentationTimeUs,
  duration: sampleDurationUs,
  data: sample.data
}));`
      },
      {
        type: "text",
        heading: "Scheduling And Controls",
        body: [
          "The sample player schedules audio buffers against AudioContext.currentTime and draws the video frame whose timestamp is due. Pausing suspends the audio clock, which also pauses video presentation. Replay rebuilds the decoder session from the first sample.",
          "The example requests a fixed DASH quality and buffers the tutorial's bounded VOD segment list. It demonstrates the decoding and synchronization boundary, not adaptive switching, live edge management, seeking, or production memory policies."
        ]
      },
      {
        type: "text",
        heading: "When To Choose WebCodecs",
        body: [
          "MSE is a good fit when the browser should own demuxing and presentation while JavaScript supplies media segments. WebCodecs is useful when an application needs control over decoded frames or custom processing, and accepts responsibility for parsing, scheduling, synchronization, and resource cleanup."
        ]
      },
      {
        type: "checkpoint",
        slug: "webcodecs-playback",
        run: true,
        files: [
          "index.html",
          "webcodecs-player.js",
          "mp4-demuxer.js",
          "dash.js"
        ],
        verify: [
          "The status line moves from Reading the DASH manifest... through Fetching DASH fragments... to Ready: <n> timed samples extracted. Press Play.",
          "Press Play: the canvas shows Big Buck Bunny, audio plays in sync, and the status reads Playing decoded samples.",
          "Pause freezes the picture and silences audio together (the AudioContext clock is the playback clock); Play resumes from the same point.",
          "At the end the status reads Playback ended. Press Replay to start again, and Replay restarts from the first sample.",
          "There is no video element and no MediaSource: DevTools Elements shows only a canvas."
        ],
        note: "Needs a browser with WebCodecs (VideoDecoder and AudioDecoder) and a secure context: localhost or HTTPS."
      },
      {
        type: "exercise",
        title: "Draw The Media Clock",
        task: [
          "In drawFrame, draw the current mediaTime onto the canvas as text each time a frame is shown, for example with context.fillText.",
          "Press Pause and confirm the number stops advancing, then press Play and confirm it resumes without a jump."
        ],
        hint: "mediaTime is already computed in drawFrame as audioContext.currentTime - audioOrigin. Call fillText after drawImage, so the text is not painted over."
      }
    ],
    outcome: "You can connect DASH segment fetching, fMP4 sample extraction, WebCodecs decoding, and synchronized canvas/audio output."
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
        explain: "Replace parseAdaptation and loadDashVod from the previous lesson with these versions. Each Representation now carries id, bandwidth, mimeType, codecs, the combined mime string, its init URL, and segments with start and end times. loadDashVod accepts options for the startup choice and returns { video, audio, representations }. The rest of dash.js (findAdaptation, resolveBaseUrl, format, chooseHighest, parseIsoDuration, and TUTORIAL_SEGMENT_LIMIT) stays as it was.",
        file: "adaptive-bitrate/dash.js",
        region: "expose-representations"
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
        explain: "The parser module also exports the small startup ABR helpers used by the player. chooseRepresentation replaces chooseLowest for the video startup choice, and its defaults let loadDashVod(mpdUrl) work with no options. It also drops Representations the browser reports as unsupported by MediaSource.isTypeSupported before choosing.",
        file: "adaptive-bitrate/dash.js",
        region: "startup-abr"
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
        explain: "loadDashVod now takes the options object and returns the startup video choice, so choose it before creating SourceBuffers. In the finished player.js, playDash then creates the SourceBuffers and replaces the old video appendTrack call with the runtime ABR loop shown below; audio keeps its own sequential loop.",
        file: "adaptive-bitrate/player.js",
        region: "startup-choice"
      },
      {
        type: "text",
        heading: "Runtime ABR",
        body: [
          "Runtime ABR repeats the decision while playback is already running. Instead of building one segment queue for one selected video Representation, the player chooses a representation for each future segment request. The decision uses measured throughput, current buffer depth, the current representation, and switching rules.",
          "The goal is stability, not always maximum quality. A runtime algorithm should switch down quickly when throughput or buffer depth becomes risky, and switch up more slowly so it does not oscillate between qualities."
        ],
        points: [
          "Measure every segment download and smooth the result.",
          "Use buffer depth to decide how much risk is acceptable.",
          "Only switch between compatible, aligned representations.",
          "Avoid switching up unless the higher representation has been affordable for multiple decisions."
        ]
      },
      {
        type: "code",
        title: "Smooth Throughput With EWMA",
        explain: "A single segment download can be noisy. EWMA gives recent measurements more weight while preserving some history.",
        file: "adaptive-bitrate/dash.js",
        region: "ewma"
      },
      {
        type: "code",
        title: "Measure Buffer Depth",
        explain: "Runtime ABR needs playable seconds ahead of currentTime, not downloaded bytes.",
        file: "adaptive-bitrate/player.js",
        region: "buffer-depth"
      },
      {
        type: "code",
        title: "Runtime Representation Choice",
        explain: "This keeps the startup selector but adds switch-down urgency, switch-up caution, and a compatibility filter. canSwitchTo only allows candidates with the same mimeType and either identical codecs or a browser that supports SourceBuffer.changeType(). Both functions are exported from dash.js so the player can import chooseRuntimeRepresentation.",
        file: "adaptive-bitrate/dash.js",
        region: "runtime-choice"
      },
      {
        type: "code",
        title: "Segment-By-Segment ABR Loop",
        explain: "The player waits until the buffer is below its goal, chooses the video representation, appends the new representation's init segment whenever the representation changes (calling changeType first if the codec string differs), then fetches and appends the media segment and measures the result. appendBufferChecked comes from the Guard Append Operations snippet in the MSE debugging lesson, and createEwma and bufferAhead come from the snippets above.",
        file: "adaptive-bitrate/player.js",
        region: "abr-loop"
      },
      {
        type: "text",
        heading: "Runtime Switching Constraints",
        body: [
          "The loop assumes every Representation has aligned segment timing. It also has to handle codec configuration. The BBB ladder's video Representations have different codec strings (avc1.640028 for 1080p, avc1.640020 for 720p, and avc1.64001f for 504p), even though they are all H.264 in MP4. A player must either restrict switching to identical codecs or call SourceBuffer.changeType() with the new MIME type before appending the new init segment. That is exactly what canSwitchTo and the loop do.",
          "Switching also means appending the new Representation's init segment before its first media segment, because the SourceBuffer's parser needs that Representation's codec setup. The loop tracks which init segment is currently in the buffer.",
          "The loop also has a buffer goal: before each request it waits while bufferAhead(video) is at or above BUFFER_GOAL_SECONDS (30). Without a goal a fast network just downloads the whole presentation, the buffer is always full, and the buffer signal that drives ABR becomes meaningless. A goal keeps buffer depth responsive to real conditions and bounds memory.",
          "Runtime ABR also coordinates audio and video. Audio often stays on one Representation because it is much cheaper than video, but the player still has to keep audio and video append queues synchronized around the same media time."
        ],
        points: [
          "Switch only at aligned segment boundaries.",
          "Avoid switching across incompatible codec strings or profiles unless changeType() is available.",
          "Append the new init segment on every switch, before the next media segment.",
          "Stop fetching once the buffer goal is met.",
          "Do not abandon audio buffering while chasing video quality.",
          "Keep enough buffer to survive the next request before switching up."
        ]
      },
      {
        type: "checkpoint",
        slug: "adaptive-bitrate",
        run: true,
        files: [
          "index.html",
          "dash.js",
          "player.js"
        ],
        verify: [
          "The status line reads video <representation id> segment <n>, <kbps> kbps, <s>s buffered, updating after each video segment.",
          "Reload with DevTools throttling set to Fast 3G (or 3G): the status line shows 896x504p25 from the start, the lowest Representation.",
          "Reload with no throttling: it starts on a higher Representation (1280x720p25 or 1920x1080p25, depending on navigator.connection.downlink), and then switches down to 896x504p25 when you apply Fast 3G mid-playback. Decisions are made only while the buffer is below 30 s, so the switch can take a few segments.",
          "Remove the throttle again: it steps up one Representation at a time (504p to 720p to 1080p), never straight to the top.",
          "Network shows an init segment request (IS.mp4) for the new Representation each time the video Representation changes, and the picture keeps playing without a glitch.",
          "The buffer reading stops growing near 30 s: the buffer goal is holding downloads back."
        ],
        note: "This snapshot has no subtitles, so you can inspect ABR behaviour in isolation."
      },
      {
        type: "exercise",
        title: "Make Switching Up More Cautious",
        task: [
          "Change appendVideoAbr so it only switches up after chooseRuntimeRepresentation has proposed the same higher Representation on 3 consecutive segments. Switching down must still happen immediately.",
          "Verify by throttling to Fast 3G, then removing the throttle: you should see three segments on the old Representation before each step up."
        ],
        hint: "Keep a counter in appendVideoAbr: increment it when the proposal has higher bandwidth than current, reset it to 0 otherwise, and only assign current when it reaches 3 (always assign on a downward proposal). Log the counter in the status line to see it."
      },
      {
        type: "demo",
        title: "ABR Decision Loop",
        mode: "timeline",
        text: "The player compares representation bandwidth with measured throughput and buffer depth before choosing quality."
      }
    ],
    outcome: "The DASH player selects an initial video representation, then uses runtime ABR concepts to choose future segments from throughput and buffer signals."
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
        type: "text",
        heading: "Wall Clock Versus Media Time",
        body: [
          "Live DASH adds wall-clock time to the normal media timeline. Wall-clock time is real time, usually UTC. Media time is the presentation timeline used by segments, timestamps, SourceBuffers, and video.currentTime.",
          "The bridge between those worlds is availabilityStartTime. It anchors the start of the live presentation to wall-clock time. A player estimates the live presentation time by subtracting availabilityStartTime from the current wall clock, then applies latency and availability rules before choosing segments."
        ],
        points: [
          "Wall-clock time answers: what time is it now?",
          "Media time answers: which presentation time should this segment cover?",
          "Live playback is the process of staying near a moving media time derived from wall-clock state."
        ]
      },
      {
        type: "code",
        title: "Live Edge From Wall Clock",
        explain: "This is the core mental model. A real player also accounts for server clock accuracy, MPD publish time, segment production delay, and presentation delay.",
        code: `
const availabilityStartTimeMs = Date.parse(mpd.getAttribute("availabilityStartTime"));
const nowSeconds = Date.now() / 1000;
const astSeconds = availabilityStartTimeMs / 1000;

const livePresentationTime = nowSeconds - astSeconds;
// Never less than one segment: a segment is only available once its END time has passed.
const targetLatency = Math.max(suggestedPresentationDelay || segmentDuration * 3, segmentDuration);
const targetPlaybackTime = Math.max(0, livePresentationTime - targetLatency);

console.log("live edge", livePresentationTime);
console.log("target playback time", targetPlaybackTime);`
      },
      {
        type: "text",
        heading: "Manifest Refresh",
        body: [
          "A live manifest is not a static table. The player must refresh it to discover newly available segments, detect changed timing metadata, and learn when older segments have expired. DASH uses fields such as type=\"dynamic\", availabilityStartTime, publishTime, timeShiftBufferDepth, minimumUpdatePeriod, and suggestedPresentationDelay to describe live behavior.",
          "minimumUpdatePeriod is a refresh hint, not a guarantee that every refresh contains new segments. publishTime can help identify whether a refreshed MPD is newer than the one already loaded."
        ],
        points: [
          "minimumUpdatePeriod tells the player how often the MPD may need refreshing.",
          "publishTime identifies when this version of the MPD was published.",
          "timeShiftBufferDepth describes how much recent history is available for seeking.",
          "suggestedPresentationDelay gives the service's recommended distance behind the live edge."
        ]
      },
      {
        type: "text",
        heading: "Segment Availability",
        body: [
          "For simple SegmentTemplate streams with fixed duration, the player can estimate segment numbers from media time. Divide presentation time by segment duration and add startNumber. The first available segment is bounded by the time-shift buffer. The newest safe segment is behind the live edge by the target latency or by a service-specific availability delay.",
          "The accurate rule is that a segment becomes available at availabilityStartTime + Period start + the segment's end time, plus availabilityTimeOffset if the service sets one (it makes segments available earlier, for chunked low-latency delivery). The end time is what counts because a segment cannot be published until its last sample has been produced. This is why target latency must be at least one segment duration: the segment that covers the target playback time can end up to a whole segment later than that time.",
          "This tutorial keeps the formula deliberately simple because live DASH can become more complex. SegmentTimeline, multiple Periods, clock synchronization, and low-latency chunked transfer all refine the same basic idea: determine which media times are currently requestable."
        ],
        points: [
          "segmentDurationSeconds = duration / timescale.",
          "availableAt = availabilityStartTime + Period@start + segment end time (- availabilityTimeOffset, if present).",
          "targetLatency >= segmentDurationSeconds, or the newest chosen segment may not exist yet.",
          "newest = startNumber + floor(targetPlaybackTime / segmentDurationSeconds).",
          "first = newest - floor(timeShiftBufferDepth / segmentDurationSeconds).",
          "SegmentTimeline streams should use explicit S elements instead of assuming fixed duration."
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
        type: "text",
        heading: "404s, Drift, And Catch-Up",
        body: [
          "Live players must tolerate uncertainty. A segment near the live edge may return 404 because the MPD advertised it before the object reached the CDN edge, or because the player clock is ahead of the server clock. A robust player treats near-edge 404s as retryable rather than fatal.",
          "Players also drift. If playback falls too far behind the target latency, the player can seek closer to live or temporarily raise playbackRate slightly above 1.0. If playback gets too close to the edge, it should slow requests or increase target latency before it starts stalling."
        ],
        points: [
          "Retry near-edge 404s with backoff.",
          "Use playbackRate catch-up conservatively, such as 1.03x to 1.08x.",
          "Avoid seeking over buffered media unless latency is far outside the target."
        ]
      },
      {
        type: "demo",
        title: "Sliding Live Window",
        mode: "timeline",
        text: "Live playback follows a moving segment window, targeting a stable delay behind the newest available media."
      }
    ],
    outcome: "You can explain live edge, live latency, wall-clock versus media time, segment availability, MPD refresh, retry behavior, catch-up, and live buffer cleanup."
  },
  {
    slug: "dash-live-timing",
    title: "DASH Live Timing",
    kind: "Theory",
    summary: "Turn a dynamic MPD into live segment availability calculations using wall-clock time, presentation time, and SegmentTemplate timing.",
    reference: "https://dashif.org/docs/DASH-IF-IOP-v4.3.pdf",
    blocks: [
      {
        type: "text",
        heading: "Dynamic MPDs",
        body: [
          "A DASH live stream usually uses an MPD with type=\"dynamic\". Unlike a static VOD MPD, a dynamic MPD describes a presentation that is still moving forward. The MPD is a snapshot of rules and currently useful metadata, not a complete list of all media that will ever exist.",
          "The key engineering task is to convert MPD timing fields into segment requests that are likely to exist now. That means combining wall-clock time, availabilityStartTime, Period timing, SegmentTemplate timing, and the service's latency guidance."
        ],
        points: [
          "availabilityStartTime anchors the presentation timeline to UTC wall-clock time.",
          "publishTime tells you when this MPD snapshot was generated.",
          "minimumUpdatePeriod tells you when it is useful to refresh the MPD.",
          "suggestedPresentationDelay tells you how far behind live the service expects playback to run."
        ]
      },
      {
        type: "diagram",
        visual: "timeline"
      },
      {
        type: "text",
        heading: "Wall Clock To Presentation Time",
        body: [
          "DASH live timing starts by estimating where the live presentation is right now. If the wall clock says it is 12:00:30 and availabilityStartTime was 12:00:00, the live presentation is roughly 30 seconds from the start of the live timeline.",
          "Players then subtract a target latency to avoid requesting media too close to the live edge. If the service suggests 12 seconds of presentation delay, the target playback time is around 18 seconds into the presentation."
        ],
        points: [
          "livePresentationTime = now - availabilityStartTime.",
          "targetPlaybackTime = livePresentationTime - suggestedPresentationDelay.",
          "A segment is available at availabilityStartTime + Period start + the segment's end time (plus availabilityTimeOffset if present), so target latency must be at least one segment duration.",
          "DASH-IF services publish a UTCTiming element in the MPD. Players should sync their clock with it (for example by fetching the time source it names and storing an offset) instead of trusting Date.now(), because device clocks are often seconds out. Pass the corrected time as nowMs to the range calculation.",
          "For real services, clock synchronization and CDN propagation can make this estimate imperfect."
        ]
      },
      {
        type: "code",
        title: "Live Presentation Time",
        explain: "This calculation turns wall-clock time into media presentation time, then applies presentation delay.",
        code: `
const astMs = Date.parse(mpd.getAttribute("availabilityStartTime"));
const nowSeconds = Date.now() / 1000;
const livePresentationTime = nowSeconds - (astMs / 1000);

const suggestedDelay = parseDuration(mpd.getAttribute("suggestedPresentationDelay"));
const targetPlaybackTime = Math.max(0, livePresentationTime - suggestedDelay);`
      },
      {
        type: "text",
        heading: "SegmentTemplate Timing",
        body: [
          "With a fixed-duration SegmentTemplate, each segment covers duration / timescale seconds. The player can convert target playback time into a segment number by dividing by the segment duration and adding startNumber.",
          "This is the easiest live timing mode to teach, but it is not the only one. Streams that use SegmentTimeline should follow explicit S elements because segment durations may vary or include repeats. Streams with multiple Periods must account for Period@start before mapping media time to segment number."
        ],
        points: [
          "segmentDurationSeconds = SegmentTemplate@duration / SegmentTemplate@timescale.",
          "segmentNumber = startNumber + floor(targetPlaybackTime / segmentDurationSeconds).",
          "SegmentTimeline is more precise for variable durations and should not be approximated as fixed duration."
        ]
      },
      {
        type: "code",
        title: "Fixed Duration Segment Range",
        explain: "This is the core calculation used by the practical lesson for a simple fixed-duration SegmentTemplate live stream.",
        code: `
function getLiveSegmentRange(timing, nowMs = Date.now()) {
  const livePresentationTime = Math.max(0, (nowMs - timing.availabilityStartTimeMs) / 1000);
  // A segment only becomes available at its END time, so latency must be at least one segment.
  const targetLatency = Math.max(timing.suggestedPresentationDelay || timing.segmentDuration * 3, timing.segmentDuration);
  const targetPlaybackTime = Math.max(0, livePresentationTime - targetLatency);
  const windowDepth = timing.timeShiftBufferDepth || timing.segmentDuration * 12;

  const newest = timing.startNumber + Math.floor(targetPlaybackTime / timing.segmentDuration);
  const first = Math.max(
    timing.startNumber,
    newest - Math.floor(windowDepth / timing.segmentDuration)
  );

  return { first, newest, targetPlaybackTime, livePresentationTime };
}`
      },
      {
        type: "text",
        heading: "Time Shift Buffer",
        body: [
          "timeShiftBufferDepth defines how much live history is available. If the time-shift buffer is 120 seconds and segment duration is 4 seconds, the live window contains roughly the newest 30 segments. Segments older than that can disappear from the manifest or return 404/410 from the server.",
          "A player should keep its seekable UI and request logic inside this window. The MSE buffer can also contain old appended media, but that does not mean the server can still re-fetch it."
        ],
        points: [
          "The seekable live window is a server availability concept.",
          "The buffered range is local media already appended into MSE.",
          "A live player has to manage both ranges and keep them coherent."
        ]
      },
      {
        type: "text",
        heading: "Refresh And Publish Time",
        body: [
          "minimumUpdatePeriod is the cadence for checking whether the MPD has changed. It does not guarantee that every refresh contains new media. publishTime can help detect whether the response is a newer snapshot or effectively the same MPD.",
          "The player should avoid refreshing too aggressively, but it should also recover if a refresh arrives late or a segment request near the edge fails. That is why live controllers combine MPD refresh, request retries, and target latency."
        ],
        points: [
          "Refresh at or after minimumUpdatePeriod unless the service documents a tighter loop.",
          "Compare publishTime when deciding whether metadata actually changed.",
          "Treat near-edge 404s as a timing signal, not always as a fatal error."
        ]
      },
      {
        type: "demo",
        title: "DASH Live Clock",
        mode: "timeline",
        text: "DASH live timing maps wall-clock time through MPD timing fields into a safe segment range behind the live edge."
      }
    ],
    outcome: "You can derive a simple DASH live segment range from availabilityStartTime, suggestedPresentationDelay, timeShiftBufferDepth, startNumber, duration, and timescale."
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
          "A live manifest changes over time. Segments expire from the back of the availability window and new segments appear near the live edge. The practical player needs to parse live MPD timing, turn wall-clock time into segment numbers, append missing segments, and prune old buffers.",
          "The player should not chase the newest byte exactly. It should target a small latency behind live edge so downloads, CDN propagation, MSE append, and decode have room to recover."
        ],
        points: [
          "Parse live DASH timing fields instead of assuming first and last segment numbers exist.",
          "Start behind the live edge using suggestedPresentationDelay or a segment-count fallback.",
          "Start at the live edge with a segment cursor instead of downloading the whole time-shift window.",
          "Handle near-edge 404s as retryable and remove old buffered ranges after playback moves past them.",
          "After the first append, seek the video to the start of the buffered range and set mediaSource.duration to Infinity so the player treats the stream as live."
        ]
      },
      {
        type: "diagram",
        visual: "buffer"
      },
      {
        type: "code",
        title: "Parse Live MPD Timing",
        explain: "Start by extracting the fields that connect wall-clock time, media time, refresh cadence, and the live window.",
        file: "live/live.js",
        region: "parse-live-timing"
      },
      {
        type: "code",
        title: "Read The Live MPD",
        explain: "A deliberately small live MPD reader: one Period, one audio and one video AdaptationSet, the first Representation of each, and a SegmentTemplate with $Number$. It builds the init URL and a segmentUrl(number) function per track, reuses parseLiveTiming, and picks up the UTCTiming URL when it is an http-xsdate or http-iso source. The target stream is the public DASH-IF livesim2 test stream, which loops a short clip and has availabilityStartTime 1970, 2 second segments, startNumber 0 and no timescale (so 1).",
        file: "live/dash-live.js"
      },
      {
        type: "code",
        title: "Calculate The Available Segment Range",
        explain: "For fixed-duration SegmentTemplate streams, convert wall-clock time into the segment numbers that are likely requestable.",
        file: "live/live.js",
        region: "segment-range"
      },
      {
        type: "code",
        title: "Sync To The Server Clock",
        explain: "The MPD's UTCTiming element points at a server clock. Segment numbers depend on wall-clock time, so a local clock that is wrong by a few seconds requests segments that do not exist yet or have already gone. Measure the offset once, assuming the reply took half the round trip, and add it to Date.now() wherever the live range is computed.",
        file: "live/player.js",
        region: "clock-sync"
      },
      {
        type: "code",
        title: "Live Refresh Controller",
        explain: "The controller refreshes the MPD, calculates the current window, and calls appendSegment(number) from a nextNumber cursor; that callback must fetch and append every track for that number. It starts at the live edge rather than the start of the time-shift window, jumps back to the edge if the cursor falls out of the window, and on a near-edge 404 stops for this tick without advancing so the same segment is retried. getNow lets the caller supply a server-corrected clock. fetchBytes attaches the HTTP status to the error it throws, which is what isNearLiveEdge404 inspects. Initialisation segments are appended once by the caller before start().",
        file: "live/live.js",
        region: "live-controller"
      },
      {
        type: "code",
        title: "Near-Edge Retry",
        explain: "A segment close to live edge can briefly 404 while it propagates through packaging and CDN layers. The check relies on error.status, which fetchBytes sets; fetch itself does not throw on a 404, so without that helper nothing would ever carry a status.",
        file: "live/live.js",
        region: "near-edge-retry"
      },
      {
        type: "code",
        title: "Start At The Live Media",
        explain: "Appending media does not move the playhead. The first segment appended near the live edge starts at a large presentation time (here, seconds since 1970), so currentTime 0 is empty and the video waits forever. onStarted runs after the first append and moves currentTime to the start of the buffered range. Setting mediaSource.duration to Infinity marks the stream as live, and setLiveSeekableRange exposes the live window to the seek bar. Call it again as the window moves, and when audio and video are in separate SourceBuffers, call it once both have data.",
        file: "live/live.js",
        region: "seek-to-live-start"
      },
      {
        type: "code",
        title: "Wire The Live Player",
        explain: "The real wiring: both SourceBuffers already exist and both init segments are appended. appendSegment fetches both tracks for a segment number before appending either, so a 404 on one track never leaves the other half-appended, and onStarted seeks to the live start. Appends and removals go through a small exclusive() queue so they never overlap on a SourceBuffer.",
        file: "live/player.js",
        region: "live-wiring"
      },
      {
        type: "code",
        title: "Catch Up To Target Latency",
        explain: "A small playbackRate increase can gently reduce excess live latency without a visible seek.",
        file: "live/live.js",
        region: "live-catchup"
      },
      {
        type: "code",
        title: "Prune Old Buffers",
        explain: "Live players must remove old media, but not too close to the playhead.",
        file: "live/live.js",
        region: "prune-buffer"
      },
      {
        type: "code",
        title: "Run The Live Maintenance Tick",
        explain: "A one-second tick keeps the live player healthy: it applies catch-up, prunes both SourceBuffers behind the playhead, refreshes the seekable range, and reports latency, which is livePresentationTime minus currentTime.",
        file: "live/player.js",
        region: "live-maintenance"
      },
      {
        type: "checkpoint",
        slug: "live",
        run: true,
        files: [
          "index.html",
          "live.js",
          "dash-live.js",
          "player.js"
        ],
        verify: [
          "Network shows Manifest.mpd re-requested about every 2 s, A48/init.mp4 and V300/init.mp4 once each, then A48/<n>.m4s and V300/<n>.m4s pairs with n increasing by 1 every 2 s (numbers around 897 million, because availabilityStartTime is 1970).",
          "The status line shows segment <n> increasing every 2 s and latency settling around 6 to 8 s (target 6.0 s, three 2 s segments), with rate 1 and a small clock offset.",
          "video.buffered.start(0) in the console is about 1.79 billion (seconds since 1970), and after a minute it trails currentTime by about 30 s as old media is pruned.",
          "The video starts muted and plays continuously; the seek bar shows a live window rather than a fixed duration (mediaSource.duration is Infinity)."
        ],
        note: "Plays the public DASH-IF livesim2 stream, so it needs network access to livesim2.dashif.org and time.akamai.com (both allow CORS)."
      },
      {
        type: "exercise",
        title: "Chase The Edge",
        task: [
          "Reduce the target latency in getLiveSegmentRange from three segments to one, and add 1000 ms to the getNow passed to createLiveController, as if the local clock ran fast.",
          "Watch the Network panel: segments are now requested slightly before they exist, so you should see 404s followed by a 200 about 750 ms later for the same segment number. Explain why the controller retries instead of skipping."
        ],
        hint: "Change timing.segmentDuration * 3 to timing.segmentDuration * 1 in live.js. Latency of 2 segments is safe on this stream; one segment sits exactly on the availability boundary, which is why clock error shows up as 404s."
      },
      {
        type: "demo",
        title: "Live Window",
        mode: "buffer",
        text: "The live window slides forward while playback follows a few segments behind the edge."
      }
    ],
    outcome: "The player parses live MPD timing, estimates segment availability, refreshes the manifest, retries near-edge segments, catches up to target latency, and prunes old buffer."
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
        file: "subtitle-practical/subtitles.js"
      },
      {
        type: "code",
        title: "Wire It Into The Player",
        explain: "Add the track before playback starts and connect the English and Off buttons from index.html. showSubtitle disables every track whose language does not match, so asking for a language that does not exist (off) hides all subtitles.",
        file: "subtitle-practical/player.js",
        region: "subtitle-wiring"
      },
      {
        type: "checkpoint",
        slug: "subtitle-practical",
        run: true,
        files: [
          "index.html",
          "dash.js",
          "player.js",
          "subtitles.js",
          "sample.vtt"
        ],
        verify: [
          "Network shows sample.vtt fetched once with status 200.",
          "In the console, video.textTracks.length is 1 and video.textTracks[0].mode is \"showing\".",
          "\"Big Buck Bunny starts in a quiet field.\" appears from 1.0 to 4.0 s, and \"Captions are synchronized to media time.\" from 5.5 to 8.0 s, rendered by the browser.",
          "Off hides the cue and sets mode to \"disabled\"; English shows it again. Seeking back to 0 replays the cues at the right times."
        ],
        note: "This snapshot is the adaptive-bitrate player plus subtitles.js, sample.vtt and two buttons."
      },
      {
        type: "exercise",
        title: "Add A Second Language",
        task: [
          "Write a sample.fr.vtt file with the same two cue times and French text, add it with addSubtitleTrack using language fr, and add a French button to index.html.",
          "Confirm that only one language shows at a time and that video.textTracks.length is 2."
        ],
        hint: "Call addSubtitleTrack twice (only the English track should set defaultTrack) and wire a third button to showSubtitle(video, \"fr\")."
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
        file: "imsc-practical/imsc-renderer.js"
      },
      {
        type: "code",
        title: "imsc.css",
        explain: "The custom renderer needs a stage around the video and an overlay that does not intercept controls.",
        file: "imsc-practical/imsc.css"
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
        explain: "Remove the WebVTT track setup and install the custom IMSC overlay instead. In the checkpoint this call sits before playDash starts the adaptive-bitrate player, and index.html links imsc.css.",
        file: "imsc-practical/player.js",
        region: "using-renderer"
      },
      {
        type: "checkpoint",
        slug: "imsc-practical",
        run: true,
        files: [
          "index.html",
          "dash.js",
          "player.js",
          "imsc-renderer.js",
          "imsc.css",
          "sample.ttml"
        ],
        verify: [
          "Network shows sample.ttml fetched once; there is no sample.vtt request.",
          "In the console, video.textTracks.length is 0: the cues are not native text tracks.",
          "\"Big Buck Bunny starts in a quiet field.\" appears over the bottom of the video from 1.0 to 4.0 s, and \"IMSC cues can carry richer layout information than WebVTT.\" from 5.5 to 8.0 s.",
          "DevTools Elements shows a .video-stage wrapper containing the video and a .imsc-overlay with a .imsc-cue.imsc-region-bottom child while a cue is active, and the overlay empties between cues.",
          "Seeking re-renders immediately (the renderer listens to seeking as well as timeupdate)."
        ],
        note: "This snapshot is the adaptive-bitrate player with the IMSC overlay in place of WebVTT."
      },
      {
        type: "exercise",
        title: "Add A Top Region",
        task: [
          "Add a third cue to sample.ttml with region=\"top\" between 9 and 12 seconds, and a matching .imsc-region-top rule in imsc.css that pins it to the top of the video.",
          "Confirm in the Elements panel that the cue gets the class imsc-region-top, and that the bottom cues are unaffected."
        ],
        hint: "The renderer already emits imsc-region-<name>. Add <region xml:id=\"top\" /> to the TTML layout for tidiness, and use align-self: start in the new CSS rule, since the overlay is a grid with align-items: end."
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
          "ClearKey uses JSON Web Key Set data, which makes it suitable for a tutorial. The structure is not how production services should expose keys.",
          "Both kid and k in a ClearKey JWK must be base64url (no padding) of the raw 16-byte key ID and key. If you hold them as 32-character hex strings, as most packaging tools print them, convert with the hexToBase64Url helper. Plain base64 or hex in those fields makes the CDM reject the licence."
        ],
        points: [
          "Request key system access, with both video and audio capabilities, before attaching encrypted media.",
          "Attach MediaKeys to the video element.",
          "Audio and video each fire encrypted, often with identical initData, so create one session per distinct initData (keyed by its base64) rather than per event.",
          "In the session's message handler, parse the request JSON ({ kids, type }) and update the session with a JWK set containing only the requested keys: { keys: [{ kty: \"oct\", kid, k }], type: \"temporary\" }."
        ]
      },
      {
        type: "diagram",
        visual: "packets"
      },
      {
        type: "code",
        title: "drm.js",
        explain: "This is the smallest useful EME shape. It creates one session per distinct initData, answers the license request with only the keys the CDM asked for, and requests both video and audio capabilities. Production DRM replaces createClearKeyLicense with a license server fetch.",
        file: "drm-practical/drm.js"
      },
      {
        type: "checkpoint",
        slug: "drm-practical",
        run: false,
        files: [
          "drm.js"
        ],
        verify: [
          "node --check passes on drm.js, and it imports cleanly as an ES module in the browser console on localhost or HTTPS.",
          "hexToBase64Url(\"00112233445566778899aabbccddeeff\") returns \"ABEiM0RVZneImaq7zN3u_w\": 22 characters, no padding, no + or /.",
          "hexToBase64Url throws for anything that is not 32 hex characters.",
          "createClearKeyLicense returns JSON bytes shaped like {\"keys\":[{\"kty\":\"oct\",\"kid\":...,\"k\":...}],\"type\":\"temporary\"} for a requested kid it knows, and throws for an unknown kid."
        ],
        note: "No runnable page yet: a ClearKey-encrypted test asset arrives in a later DRM chunk. For now this checkpoint is a module you can exercise from the console."
      },
      {
        type: "exercise",
        title: "Test The License Builder",
        task: [
          "In a scratch module or the browser console, import drm.js and build a key table with one kid and key using hexToBase64Url. Encode a request message with TextEncoder as {\"kids\":[<base64url kid>],\"type\":\"temporary\"}.",
          "Call createClearKeyLicense and decode the result. Then request an unknown kid and confirm it throws, and explain why filtering to known kids matters."
        ],
        hint: "keyTable is a Map from base64url kid to base64url key, exactly as installClearKey builds it. new TextDecoder().decode(result) gives you the JSON to read."
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
    summary: "Run the finished in-app player: DASH manifest parsing, audio/video MSE appends, playback controls, runtime ABR decisions, and custom subtitles.",
    reference: "https://rdmedia.bbc.co.uk/bbb/2/client_manifest-avc1-high_profile.mpd",
    blocks: [
      {
        type: "text",
        heading: "The Final Shape",
        body: [
          "This page brings the main pieces together inside the tutorial app. The player fetches a DASH MPD, chooses a conservative startup video representation, then continues making runtime video representation decisions as segment downloads reveal real throughput.",
          "The subtitle layer uses the same timing idea as the IMSC lab. It watches the media playhead and renders the active cue into an overlay above the video."
        ],
        points: [
          "The audio and video bytes come from DASH and MSE, not from assigning a single MP4 URL to video.src.",
          "Runtime ABR uses smoothed measured throughput and buffer depth to choose each future video segment.",
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
4. Seed ABR with an initial throughput estimate.
5. Append audio on its selected Representation.
6. Choose each future video segment with runtime ABR.
7. Smooth measured throughput after each segment fetch.
8. Watch video.currentTime and render active subtitle cues.
9. Surface unsupported codec, CORS, and network failures in the UI.`
      },
      {
        type: "text",
        heading: "What To Build Next",
        body: [
          "This final version is still intentionally small. It now performs runtime video ABR, but a production player would add deeper audio/video adaptation coordination, gap handling, retry logic, live edge management, full subtitle styling, and real DRM license integration.",
          "The important thing is that the architecture now has clear boundaries: manifest parsing, segment loading, append scheduling, timeline observation, subtitle rendering, and UI state are separate enough to improve one at a time."
        ],
        points: [
          "Add stronger switching guards for codec changes, init segment compatibility, and aligned random access points.",
          "Use separate fast and slow throughput estimates to reduce ABR oscillation.",
          "Expand the IMSC subset only for features your content actually uses."
        ]
      },
      {
        type: "demo",
        title: "Complete Playback Loop",
        mode: "timeline",
        text: "Manifest parsing feeds runtime ABR, ABR selects segment requests, segment loading feeds MSE, and the media timeline drives subtitles."
      },
      {
        type: "showcase",
        showcase: "player"
      }
    ],
    outcome: "A working browser player loads a Big Buck Bunny DASH stream with audio, runtime ABR video selection, MSE appends, and subtitle cues."
  }
];
