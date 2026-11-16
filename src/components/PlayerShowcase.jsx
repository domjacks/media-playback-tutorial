import React, { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Captions, Loader2, Play, RotateCcw } from "lucide-react";
import {
  chooseRuntimeRepresentation,
  createEwma,
  estimateInitialThroughput,
  getMediaSourceImpl,
  loadDashVod,
  measureFetch
} from "../lib/dashVod.js";
import { parseImscCues } from "../lib/imsc.js";
import showcaseTtml from "../data/showcase.ttml?raw";

const bbbMpd = "https://rdmedia.bbc.co.uk/bbb/2/client_manifest-avc1-high_profile.mpd";
const BUFFER_GOAL_SECONDS = 30;
const BACK_BUFFER_SECONDS = 30;
const WAIT_MS = 250;
const LOG_LIMIT = 12;

export function PlayerShowcase() {
  const imscCues = useMemo(() => parseImscCues(showcaseTtml), []);
  const videoRef = useRef(null);
  const objectUrlRef = useRef("");
  const abortRef = useRef(null);
  const [status, setStatus] = useState("Ready to load the DASH stream.");
  const [error, setError] = useState("");
  const [activeCue, setActiveCue] = useState("");
  const [manifestInfo, setManifestInfo] = useState(null);
  const [currentVideo, setCurrentVideo] = useState(null);
  const [throughput, setThroughput] = useState(0);
  const [bufferAheadSeconds, setBufferAheadSeconds] = useState(0);
  const [loading, setLoading] = useState(false);
  const [abrLog, setAbrLog] = useState([]);
  const buffersRef = useRef(null);
  const previousRepRef = useRef(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return undefined;

    function syncCue() {
      const now = video.currentTime;
      const cue = imscCues.find((item) => item.begin <= now && now < item.end);
      setActiveCue(cue?.text ?? "");
      setBufferAheadSeconds(bufferAhead(video));
    }

    video.addEventListener("timeupdate", syncCue);
    video.addEventListener("seeking", syncCue);
    return () => {
      abortRef.current?.abort();
      video.removeEventListener("timeupdate", syncCue);
      video.removeEventListener("seeking", syncCue);
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
  }, [imscCues]);

  async function loadPlayer() {
    const video = videoRef.current;
    if (!video) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const { signal } = controller;

    setLoading(true);
    setError("");
    setStatus("Fetching DASH manifest...");
    setActiveCue("");
    setBufferAheadSeconds(0);
    setAbrLog([]);
    previousRepRef.current = null;
    buffersRef.current = null;

    try {
      const MediaSourceImpl = getMediaSourceImpl();
      if (!MediaSourceImpl) {
        throw new Error("This browser does not support MediaSource or ManagedMediaSource.");
      }

      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = "";
      }

      const throughputEstimate = createEwma(estimateInitialThroughput());
      setThroughput(throughputEstimate.value());
      const manifest = await loadDashVod(bbbMpd, { throughputBps: throughputEstimate.value(), bufferSeconds: 0, signal });
      if (signal.aborted) return;
      setManifestInfo(manifest);
      setCurrentVideo(manifest.video);

      if (!MediaSourceImpl.isTypeSupported(manifest.video.mime)) {
        throw new Error(`Browser does not support ${manifest.video.mime}`);
      }
      if (!MediaSourceImpl.isTypeSupported(manifest.audio.mime)) {
        throw new Error(`Browser does not support ${manifest.audio.mime}`);
      }

      const mediaSource = new MediaSourceImpl();
      if (MediaSourceImpl === window.ManagedMediaSource) video.disableRemotePlayback = true;
      const objectUrl = URL.createObjectURL(mediaSource);
      objectUrlRef.current = objectUrl;
      video.src = objectUrl;

      await once(mediaSource, "sourceopen", signal);
      if (signal.aborted) return;
      mediaSource.duration = manifest.duration;
      const videoBuffer = mediaSource.addSourceBuffer(manifest.video.mime);
      const audioBuffer = mediaSource.addSourceBuffer(manifest.audio.mime);
      buffersRef.current = { video: videoBuffer, audio: audioBuffer };

      const tracks = {
        video: { done: false, initFor: "", codecs: manifest.video.codecs, ready: false, sourceBuffer: videoBuffer },
        audio: { done: false, initFor: "", codecs: manifest.audio.codecs, ready: false, sourceBuffer: audioBuffer }
      };
      let announcedReady = false;
      let currentRep = manifest.video;

      function markAppended(name) {
        tracks[name].ready = true;
        if (!announcedReady && tracks.video.ready && tracks.audio.ready) {
          announcedReady = true;
          setStatus("Ready to play. Buffering continues in the background.");
          setLoading(false);
        }
      }

      function maybeEndOfStream() {
        if (!tracks.video.done || !tracks.audio.done) return;
        if (mediaSource.readyState !== "open") return;
        if (videoBuffer.updating || audioBuffer.updating) return;
        try {
          mediaSource.endOfStream();
        } catch {
          // A later loop iteration will try again if the buffers were busy.
        }
      }

      await Promise.all([
        runTrackLoop({
          name: "video",
          track: tracks.video,
          video,
          mediaSource,
          signal,
          segmentCount: manifest.video.segments.length,
          pickRepresentation: () => {
            currentRep = chooseRuntimeRepresentation(manifest.representations.video, currentRep, {
              throughputBps: throughputEstimate.value(),
              bufferSeconds: bufferAhead(video)
            });
            return currentRep;
          },
          currentRepresentation: () => currentRep,
          onSegment: ({ representation, segment, throughputBps: measured }) => {
            const ahead = bufferAhead(video);
            setCurrentVideo(representation);
            const entry = describeDecision({
              previous: previousRepRef.current,
              representation,
              segment,
              throughputBps: measured,
              ahead,
              time: video.currentTime
            });
            previousRepRef.current = representation;
            setAbrLog((current) => [entry, ...current].slice(0, LOG_LIMIT));
            setThroughput(throughputEstimate.sample(measured));
            setBufferAheadSeconds(ahead);
            markAppended("video");
            if (announcedReady) {
              setStatus(`${representation.id} segment ${segment.number}/${manifest.video.segments.length}, ${ahead.toFixed(1)}s buffered ahead`);
            }
          },
          onIdle: maybeEndOfStream
        }),
        runTrackLoop({
          name: "audio",
          track: tracks.audio,
          video,
          mediaSource,
          signal,
          segmentCount: manifest.audio.segments.length,
          pickRepresentation: () => manifest.audio,
          currentRepresentation: () => manifest.audio,
          onSegment: () => markAppended("audio"),
          onIdle: maybeEndOfStream
        })
      ]);
    } catch (cause) {
      if (signal.aborted) return;
      setError(cause.message ?? String(cause));
      setStatus("The player could not start.");
      setLoading(false);
    }
  }

  function resetPlayer() {
    const video = videoRef.current;
    if (!video) return;
    abortRef.current?.abort();
    video.pause();
    video.removeAttribute("src");
    video.load();
    setActiveCue("");
    setManifestInfo(null);
    setCurrentVideo(null);
    setThroughput(0);
    setBufferAheadSeconds(0);
    setAbrLog([]);
    previousRepRef.current = null;
    buffersRef.current = null;
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
          <span>Runtime video <strong>{currentVideo?.id ?? manifestInfo.video.id}</strong></span>
          <span>Video bitrate <strong>{Math.round((currentVideo?.bandwidth ?? manifestInfo.video.bandwidth) / 1000)} kbps</strong></span>
          <span>Measured <strong>{Math.round(throughput / 1000)} kbps</strong></span>
          <span>Available <strong>{manifestInfo.representations.video.length} video reps</strong></span>
          <span>Segments <strong>{manifestInfo.video.segments.length} total</strong></span>
          <span>Buffer ahead <strong>{bufferAheadSeconds.toFixed(1)} s</strong></span>
        </div>
      )}

      {manifestInfo && (
        <>
          <BufferVisualiser videoRef={videoRef} buffersRef={buffersRef} duration={manifestInfo.duration} />
          <AbrLog entries={abrLog} />
        </>
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

function describeDecision({ previous, representation, segment, throughputBps, ahead, time }) {
  let reason = "hold";
  if (previous && representation.bandwidth < previous.bandwidth) reason = "switch down";
  else if (previous && representation.bandwidth > previous.bandwidth) reason = "step up";
  return {
    key: `${segment.number}-${representation.id}-${time}`,
    time,
    segment: segment.number,
    rep: representation.id,
    throughputBps,
    ahead,
    reason
  };
}

function readRanges(timeRanges) {
  const ranges = [];
  try {
    for (let i = 0; i < timeRanges.length; i += 1) ranges.push([timeRanges.start(i), timeRanges.end(i)]);
  } catch {
    // A detached SourceBuffer throws; treat it as empty.
  }
  return ranges;
}

function describeRanges(ranges) {
  return ranges.length ? ranges.map(([start, end]) => `${start.toFixed(1)}–${end.toFixed(1)} s`).join(", ") : "nothing";
}

function BufferVisualiser({ videoRef, buffersRef, duration }) {
  const [snapshot, setSnapshot] = useState(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return undefined;
    function tick() {
      setSnapshot({
        time: video.currentTime,
        total: readRanges(video.buffered),
        video: buffersRef.current ? readRanges(buffersRef.current.video.buffered) : [],
        audio: buffersRef.current ? readRanges(buffersRef.current.audio.buffered) : []
      });
    }
    const events = ["timeupdate", "progress", "seeking", "seeked"];
    for (const name of events) video.addEventListener(name, tick);
    const timer = setInterval(tick, 250);
    return () => {
      clearInterval(timer);
      for (const name of events) video.removeEventListener(name, tick);
    };
  }, [videoRef, buffersRef]);

  const total = snapshot?.total ?? [];
  const time = snapshot?.time ?? 0;
  const pct = (seconds) => `${Math.min(100, Math.max(0, (seconds / duration) * 100))}%`;
  const lane = (label, ranges, className) => (
    <div className="buffer-lane">
      <span>{label}</span>
      <div className="buffer-bar" aria-hidden="true">
        {ranges.map(([start, end]) => (
          <i key={`${start}-${end}`} className={className} style={{ left: pct(start), width: `${Math.max(0.3, ((end - start) / duration) * 100)}%` }} />
        ))}
        <b className="playhead" style={{ left: pct(time) }} />
      </div>
    </div>
  );

  return (
    <div className="buffer-visualiser">
      <h3>Buffer</h3>
      {lane("Media element", total, "range-total")}
      {lane("Video buffer", snapshot?.video ?? [], "range-video")}
      {lane("Audio buffer", snapshot?.audio ?? [], "range-audio")}
      <div className="buffer-scale" aria-hidden="true"><span>0 s</span><span>{duration.toFixed(0)} s</span></div>
      <p className="visually-hidden" role="status">
        {`Buffered ${describeRanges(total)}; playhead ${time.toFixed(1)} s of ${duration.toFixed(1)} s`}
      </p>
      <p className="buffer-text" aria-hidden="true">
        {`Buffered ${describeRanges(total)}; playhead ${time.toFixed(1)} s`}
      </p>
    </div>
  );
}

function AbrLog({ entries }) {
  return (
    <div className="abr-log">
      <h3>ABR decisions</h3>
      {entries.length === 0 ? (
        <p>No segments appended yet.</p>
      ) : (
        <div className="abr-table-wrap">
          <table>
            <thead>
              <tr>
                <th scope="col">Time</th>
                <th scope="col">Segment</th>
                <th scope="col">Rep</th>
                <th scope="col">Measured</th>
                <th scope="col">Buffer ahead</th>
                <th scope="col">Reason</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.key}>
                  <td>{entry.time.toFixed(1)} s</td>
                  <td>{entry.segment}</td>
                  <td>{entry.rep}</td>
                  <td>{Math.round(entry.throughputBps / 1000)} kbps</td>
                  <td>{entry.ahead.toFixed(1)} s</td>
                  <td><span className={`abr-reason ${entry.reason.replace(" ", "-")}`}>{entry.reason}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

async function runTrackLoop({
  name,
  track,
  video,
  mediaSource,
  signal,
  segmentCount,
  pickRepresentation,
  currentRepresentation,
  onSegment,
  onIdle
}) {
  const sourceBuffer = track.sourceBuffer;

  while (!signal.aborted) {
    const reference = currentRepresentation();
    const nextTime = bufferedEndAt(sourceBuffer.buffered, video.currentTime);
    const index = Math.floor((nextTime + 0.1) / reference.segmentSeconds);

    if (index >= segmentCount) {
      track.done = true;
      onIdle();
      await wait(signal, video);
      continue;
    }
    track.done = false;

    const streaming = mediaSource.streaming !== false;
    if (!streaming || nextTime - video.currentTime >= BUFFER_GOAL_SECONDS) {
      await wait(signal, video);
      continue;
    }

    const representation = pickRepresentation();

    if (track.initFor !== representation.id) {
      if (track.codecs !== representation.codecs) {
        await waitUntilIdle(sourceBuffer, signal);
        sourceBuffer.changeType(representation.mime);
        track.codecs = representation.codecs;
      }
      const init = await measureFetch(representation.init, { signal });
      await appendWithEviction(sourceBuffer, init.bytes, video, signal);
      track.initFor = representation.id;
    }

    const segment = representation.segments[index];
    const result = await measureFetch(segment.url, { signal });
    if (signal.aborted) return;
    await appendWithEviction(sourceBuffer, result.bytes, video, signal);
    onSegment({ name, representation, segment, throughputBps: result.throughputBps });
  }
}

async function appendWithEviction(sourceBuffer, bytes, video, signal) {
  await evictBehind(sourceBuffer, video.currentTime - BACK_BUFFER_SECONDS, signal);
  try {
    await appendBytes(sourceBuffer, bytes, signal);
  } catch (cause) {
    if (cause?.name !== "QuotaExceededError") throw cause;
    await evictBehind(sourceBuffer, video.currentTime - 5, signal);
    await appendBytes(sourceBuffer, bytes, signal);
  }
}

async function evictBehind(sourceBuffer, keepFrom, signal) {
  if (keepFrom <= 0) return;
  const buffered = sourceBuffer.buffered;
  if (!buffered.length || buffered.start(0) >= keepFrom) return;
  await waitUntilIdle(sourceBuffer, signal);
  await runBufferOperation(sourceBuffer, signal, () => sourceBuffer.remove(0, keepFrom));
}

function waitUntilIdle(sourceBuffer, signal) {
  if (!sourceBuffer.updating) return Promise.resolve();
  return runBufferOperation(sourceBuffer, signal, () => {});
}

function appendBytes(sourceBuffer, bytes, signal) {
  return runBufferOperation(sourceBuffer, signal, () => sourceBuffer.appendBuffer(bytes));
}

function runBufferOperation(sourceBuffer, signal, start) {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(abortError());
      return;
    }

    function cleanup() {
      sourceBuffer.removeEventListener("updateend", onUpdateEnd);
      sourceBuffer.removeEventListener("error", onError);
      sourceBuffer.removeEventListener("abort", onAbort);
      signal.removeEventListener("abort", onSignalAbort);
    }
    function onUpdateEnd() {
      cleanup();
      resolve();
    }
    function onError() {
      cleanup();
      reject(new Error("SourceBuffer operation failed."));
    }
    function onAbort() {
      cleanup();
      reject(new Error("SourceBuffer operation aborted."));
    }
    function onSignalAbort() {
      cleanup();
      reject(abortError());
    }

    sourceBuffer.addEventListener("updateend", onUpdateEnd);
    sourceBuffer.addEventListener("error", onError);
    sourceBuffer.addEventListener("abort", onAbort);
    signal.addEventListener("abort", onSignalAbort);

    try {
      start();
    } catch (cause) {
      cleanup();
      reject(cause);
    }
  });
}

function wait(signal, video, ms = WAIT_MS) {
  return new Promise((resolve) => {
    if (signal.aborted) {
      resolve();
      return;
    }

    const timer = setTimeout(done, ms);
    function done() {
      clearTimeout(timer);
      video.removeEventListener("seeking", done);
      video.removeEventListener("timeupdate", done);
      signal.removeEventListener("abort", done);
      resolve();
    }

    video.addEventListener("seeking", done);
    video.addEventListener("timeupdate", done);
    signal.addEventListener("abort", done);
  });
}

function bufferedEndAt(timeRanges, time) {
  for (let i = 0; i < timeRanges.length; i += 1) {
    if (timeRanges.start(i) - 0.1 <= time && time <= timeRanges.end(i) + 0.1) {
      return Math.max(timeRanges.end(i), time);
    }
  }
  return time;
}

function bufferAhead(video) {
  return bufferedEndAt(video.buffered, video.currentTime) - video.currentTime;
}

function abortError() {
  return new DOMException("The operation was aborted.", "AbortError");
}

function once(target, event, signal) {
  return new Promise((resolve) => {
    function done() {
      target.removeEventListener(event, done);
      signal?.removeEventListener("abort", done);
      resolve();
    }
    target.addEventListener(event, done);
    signal?.addEventListener("abort", done);
  });
}
