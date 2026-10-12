import React, { useEffect, useRef, useState } from "react";
import { AlertTriangle, Captions, Loader2, Play, RotateCcw } from "lucide-react";
import { estimateInitialThroughput, loadDashVod, measureFetch } from "../lib/dashVod.js";

const bbbMpd = "https://rdmedia.bbc.co.uk/bbb/2/client_manifest-avc1-high_profile.mpd";

const imscCues = [
  { begin: 1, end: 4, text: "Big Buck Bunny arrives through a DASH manifest." },
  { begin: 5.5, end: 8.5, text: "JavaScript appends fMP4 segments with Media Source Extensions." },
  { begin: 10, end: 13.5, text: "These subtitles are rendered by the app, not a native WebVTT track." },
  { begin: 15, end: 19, text: "This final player combines the tutorial pieces into one working surface." }
];

export function PlayerShowcase() {
  const videoRef = useRef(null);
  const objectUrlRef = useRef("");
  const cancelledRef = useRef(false);
  const [status, setStatus] = useState("Ready to load the DASH stream.");
  const [error, setError] = useState("");
  const [activeCue, setActiveCue] = useState("");
  const [manifestInfo, setManifestInfo] = useState(null);
  const [throughput, setThroughput] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return undefined;

    function syncCue() {
      const now = video.currentTime;
      const cue = imscCues.find((item) => item.begin <= now && now < item.end);
      setActiveCue(cue?.text ?? "");
    }

    video.addEventListener("timeupdate", syncCue);
    video.addEventListener("seeking", syncCue);
    return () => {
      cancelledRef.current = true;
      video.removeEventListener("timeupdate", syncCue);
      video.removeEventListener("seeking", syncCue);
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
  }, []);

  async function loadPlayer() {
    const video = videoRef.current;
    if (!video || loading) return;

    setLoading(true);
    setError("");
    setStatus("Fetching DASH manifest...");
    setActiveCue("");
    cancelledRef.current = false;

    try {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = "";
      }

      let throughputBps = estimateInitialThroughput();
      setThroughput(throughputBps);
      const manifest = await loadDashVod(bbbMpd, { throughputBps, bufferSeconds: 0 });
      setManifestInfo(manifest);

      if (!MediaSource.isTypeSupported(manifest.video.mime)) {
        throw new Error(`Browser does not support ${manifest.video.mime}`);
      }
      if (!MediaSource.isTypeSupported(manifest.audio.mime)) {
        throw new Error(`Browser does not support ${manifest.audio.mime}`);
      }

      const mediaSource = new MediaSource();
      const objectUrl = URL.createObjectURL(mediaSource);
      objectUrlRef.current = objectUrl;
      video.src = objectUrl;

      await once(mediaSource, "sourceopen");
      const videoBuffer = mediaSource.addSourceBuffer(manifest.video.mime);
      const audioBuffer = mediaSource.addSourceBuffer(manifest.audio.mime);
      const videoUrls = [manifest.video.init, ...manifest.video.segments.map((segment) => segment.url)];
      const audioUrls = [manifest.audio.init, ...manifest.audio.segments.map((segment) => segment.url)];

      await Promise.all([
        appendTrack({
          sourceBuffer: videoBuffer,
          urls: videoUrls,
          cancelledRef,
          onProgress: ({ appended, throughputBps: measured }) => {
            throughputBps = (throughputBps * 0.7) + (measured * 0.3);
            setThroughput(throughputBps);
            setStatus(`Appending video segment ${Math.max(0, appended - 1)}...`);
          }
        }),
        appendTrack({
          sourceBuffer: audioBuffer,
          urls: audioUrls,
          cancelledRef,
          onProgress: ({ appended }) => {
            setStatus(`Appending audio segment ${Math.max(0, appended - 1)}...`);
          }
        })
      ]);

      if (mediaSource.readyState === "open") mediaSource.endOfStream();
      setStatus(`Buffered ${manifest.video.segments.length} audio/video segments. Press play.`);
      setLoading(false);
    } catch (cause) {
      setError(cause.message ?? String(cause));
      setStatus("The player could not start.");
      setLoading(false);
    }
  }

  async function appendTrack({ sourceBuffer, urls, cancelledRef, onProgress }) {
    let index = 0;

    return new Promise((resolve, reject) => {
      async function appendNext() {
        if (cancelledRef.current) {
          resolve();
          return;
        }
        if (index >= urls.length) {
          resolve();
          return;
        }

        const result = await measureFetch(urls[index]);
        index += 1;
        onProgress({ appended: index, throughputBps: result.throughputBps });
        sourceBuffer.appendBuffer(result.bytes);
      }

      sourceBuffer.addEventListener("updateend", () => {
        appendNext().catch(reject);
      });
      appendNext().catch(reject);
    });
  }

  function resetPlayer() {
    const video = videoRef.current;
    if (!video) return;
    cancelledRef.current = true;
    video.pause();
    video.removeAttribute("src");
    video.load();
    setActiveCue("");
    setManifestInfo(null);
    setThroughput(0);
    setError("");
    setLoading(false);
    setStatus("Ready to load the DASH stream.");
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = "";
    }
  }

  return (
    <section className="player-showcase">
      <div className="showcase-toolbar">
        <div>
          <h2>Working DASH Player</h2>
          <p>{status}</p>
        </div>
        <div className="showcase-actions">
          <button className="primary" onClick={loadPlayer} disabled={loading}>
            {loading ? <Loader2 className="spin" size={18} /> : <Play size={18} />}
            Load Stream
          </button>
          <button className="secondary" onClick={resetPlayer}>
            <RotateCcw size={18} />
            Reset
          </button>
        </div>
      </div>

      <div className="showcase-stage">
        <video ref={videoRef} controls playsInline />
        <div className="showcase-subtitle" aria-live="polite">
          {activeCue && <span><Captions size={18} /> {activeCue}</span>}
        </div>
      </div>

      {manifestInfo && (
        <div className="manifest-readout">
          <span>Video <strong>{manifestInfo.video.id}</strong></span>
          <span>Audio <strong>{manifestInfo.audio.id}</strong></span>
          <span>Video bitrate <strong>{Math.round(manifestInfo.video.bandwidth / 1000)} kbps</strong></span>
          <span>Measured <strong>{Math.round(throughput / 1000)} kbps</strong></span>
          <span>Available <strong>{manifestInfo.representations.video.length} video reps</strong></span>
          <span>Segments <strong>{manifestInfo.video.segments.length}</strong></span>
        </div>
      )}

      {error && (
        <div className="player-error">
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}
    </section>
  );
}

function once(target, event) {
  return new Promise((resolve) => target.addEventListener(event, resolve, { once: true }));
}
