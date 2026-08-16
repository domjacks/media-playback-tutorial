import React from "react";
import { ArrowRight, Boxes, Clock, Film, Gauge, Monitor, RadioTower } from "lucide-react";

export function PacketFlow() {
  return (
    <section className="diagram packet-flow" aria-label="Animated packet to segment diagram">
      <div className="node server"><RadioTower size={24} /> Server</div>
      <div className="packet-lane">
        {Array.from({ length: 7 }, (_, index) => <span key={index} style={{ animationDelay: `${index * 0.18}s` }} />)}
      </div>
      <ArrowRight className="diagram-arrow" />
      <div className="node segment"><Boxes size={24} /> fMP4 Segment</div>
      <div className="decode-stack">
        <span>moof</span>
        <span>mdat</span>
        <span>samples</span>
      </div>
    </section>
  );
}

export function BufferQueue() {
  const ranges = ["0-2s", "2-4s", "4-6s", "6-8s", "8-10s"];
  return (
    <section className="diagram buffer-diagram" aria-label="Animated source buffer queue">
      <div className="buffer-header">
        <span><Gauge size={20} /> SourceBuffer</span>
        <span>playhead 3.2s</span>
      </div>
      <div className="buffer-track">
        {ranges.map((range, index) => (
          <span key={range} className={index < 2 ? "played" : ""} style={{ animationDelay: `${index * 0.12}s` }}>{range}</span>
        ))}
        <i />
      </div>
      <p>Append bytes in order, then the browser exposes buffered time ranges to the video element.</p>
    </section>
  );
}

export function SegmentTimeline() {
  return (
    <section className="diagram timeline-diagram" aria-label="Manifest segment timeline">
      <div className="timeline-label"><Clock size={20} /> Manifest timeline</div>
      <div className="timeline-row">
        {Array.from({ length: 8 }, (_, index) => (
          <span key={index}>
            <strong>S{index + 1}</strong>
            <small>{index * 4}s-{(index + 1) * 4}s</small>
          </span>
        ))}
      </div>
      <div className="quality-rows">
        <div><b>360p</b><span /></div>
        <div><b>720p</b><span /></div>
        <div><b>1080p</b><span /></div>
      </div>
    </section>
  );
}

export function VideoFundamentalsDiagram() {
  return (
    <section className="diagram video-fundamentals" aria-label="Video fundamentals diagram">
      <div className="screen-model">
        <div className="screen-frame">
          <span className="pixel-grid" />
          <strong>1920 x 1080</strong>
          <small>16:9 frame</small>
        </div>
      </div>
      <div className="video-metrics">
        <div>
          <Monitor size={22} />
          <strong>Resolution</strong>
          <span>Spatial samples per frame</span>
        </div>
        <div>
          <Clock size={22} />
          <strong>Frame rate</strong>
          <span>Pictures presented each second</span>
        </div>
        <div>
          <Gauge size={22} />
          <strong>Dynamic range</strong>
          <span>Detail between dark and bright</span>
        </div>
      </div>
      <div className="colour-strip" aria-label="Colour gamut strip">
        <span>Rec.709</span>
        <span>P3</span>
        <span>Rec.2020</span>
      </div>
    </section>
  );
}

export function MediaFileDiagram() {
  const gop = ["I", "B", "B", "P", "B", "B", "P", "B", "B", "I"];

  return (
    <section className="diagram media-file-diagram" aria-label="Media file and GOP diagram">
      <div className="file-box">
        <div><Boxes size={20} /> Header</div>
        <div><Clock size={20} /> Metadata</div>
        <div><Film size={20} /> Encoded samples</div>
      </div>
      <div className="track-stack">
        <span>video track: H.264 samples</span>
        <span>audio track: AAC samples</span>
        <span>timing: decode time and presentation time</span>
      </div>
      <div className="gop-row">
        {gop.map((frame, index) => (
          <span key={`${frame}-${index}`} className={`frame-${frame.toLowerCase()}`}>
            {frame}
          </span>
        ))}
      </div>
    </section>
  );
}
