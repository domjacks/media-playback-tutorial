import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  ExternalLink,
  FileCode,
  FlaskConical,
  Play,
  ShieldCheck
} from "lucide-react";
import { lessons } from "./data/lessons.js";
import { AudioFundamentalsDiagram, AvSyncDiagram, BufferQueue, CodecCompressionDiagram, Fmp4CmafDiagram, MediaFileDiagram, PacketFlow, SegmentTimeline, VideoFundamentalsDiagram } from "./components/Diagrams.jsx";
import { DemoPanel } from "./components/DemoPanel.jsx";
import { PlayerShowcase } from "./components/PlayerShowcase.jsx";
import { checkpointUrl, getSnippet } from "./lib/tutorialFiles.js";
import "./styles.css";

const storageKey = "mse-tutorial-progress";

function readProgress() {
  try {
    return JSON.parse(localStorage.getItem(storageKey)) ?? {};
  } catch {
    return {};
  }
}

function App() {
  const [slug, setSlug] = useState(() => location.hash.replace("#/", "") || lessons[0].slug);
  const [progress, setProgress] = useState(readProgress);
  const activeIndex = Math.max(0, lessons.findIndex((lesson) => lesson.slug === slug));
  const lesson = lessons[activeIndex] ?? lessons[0];
  const completedCount = Object.values(progress).filter(Boolean).length;

  useEffect(() => {
    const onHashChange = () => setSlug(location.hash.replace("#/", "") || lessons[0].slug);
    addEventListener("hashchange", onHashChange);
    return () => removeEventListener("hashchange", onHashChange);
  }, []);

  useEffect(() => {
    if (location.hash !== `#/${lesson.slug}`) {
      history.replaceState(null, "", `#/${lesson.slug}`);
    }
  }, [lesson.slug]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [lesson.slug]);

  function markComplete() {
    setProgress((current) => {
      const next = { ...current, [lesson.slug]: true };
      localStorage.setItem(storageKey, JSON.stringify(next));
      return next;
    });
  }

  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="Tutorial lessons">
        <a className="brand" href={`#/${lessons[0].slug}`}>
          <span className="brand-mark"><Play size={18} fill="currentColor" /></span>
          <span>Media Playback From Scratch</span>
        </a>
        <div className="progress-box">
          <span>{completedCount} of {lessons.length} complete</span>
          <div className="progress-track">
            <span style={{ width: `${(completedCount / lessons.length) * 100}%` }} />
          </div>
        </div>
        <nav className="lesson-nav">
          {lessons.map((item, index) => (
            <a
              key={item.slug}
              href={`#/${item.slug}`}
              className={item.slug === lesson.slug ? "active" : ""}
            >
              <span className="lesson-number">{index + 1}</span>
              <span>
                <strong>{item.title}</strong>
                <small>{item.kind}</small>
              </span>
              {progress[item.slug] && <Check size={16} />}
            </a>
          ))}
        </nav>
      </aside>
      <main className="lesson-page">
        <Lesson lesson={lesson} index={activeIndex} onComplete={markComplete} progress={progress} />
      </main>
    </div>
  );
}

function Lesson({ lesson, index, onComplete, progress }) {
  const previous = lessons[index - 1];
  const next = lessons[index + 1];
  const Icon = lesson.kind === "Theory" ? BookOpen : lesson.slug === "drm-practical" ? ShieldCheck : FlaskConical;

  return (
    <article>
      <header className="lesson-hero">
        <div className="lesson-kicker"><Icon size={18} /> {lesson.kind}</div>
        <h1>{lesson.title}</h1>
        <p>{lesson.summary}</p>
        <div className="hero-actions">
          <button className="primary" onClick={onComplete}>
            <Check size={18} /> Mark complete
          </button>
          <a className="secondary" href={lesson.reference} target="_blank" rel="noreferrer">
            <ExternalLink size={18} /> Reference
          </a>
        </div>
      </header>

      <section className="content-grid">
        <div className="lesson-body">
          {lesson.blocks.map((block, blockIndex) => (
            <LessonBlock key={`${block.type}-${block.title ?? block.heading ?? block.slug ?? block.visual ?? block.file ?? blockIndex}-${blockIndex}`} block={block} />
          ))}
        </div>
        <aside className="lesson-aside">
          <div className="aside-panel">
            <h3>Lesson Outcome</h3>
            <p>{lesson.outcome}</p>
          </div>
        </aside>
      </section>

      <footer className="pager">
        {previous ? <a href={`#/${previous.slug}`}><ChevronLeft size={18} /> {previous.title}</a> : <span />}
        <span className={progress[lesson.slug] ? "done" : ""}>{progress[lesson.slug] ? "Completed" : "In progress"}</span>
        {next ? <a href={`#/${next.slug}`}>{next.title} <ChevronRight size={18} /></a> : <span />}
      </footer>
    </article>
  );
}

function LessonBlock({ block }) {
  if (block.type === "text") return <TextBlock block={block} />;
  if (block.type === "code") return <CodeSnippet snippet={block} />;
  if (block.type === "checkpoint") return <Checkpoint block={block} />;
  if (block.type === "exercise") return <Exercise block={block} />;
  if (block.type === "diagram") return <Diagram visual={block.visual} />;
  if (block.type === "demo") return <DemoPanel demo={block} />;
  if (block.type === "link") return <p><a className="secondary lesson-link" href={block.href}><ExternalLink size={18} /> {block.label}</a></p>;
  if (block.type === "showcase" && block.showcase === "player") return <PlayerShowcase />;
  return null;
}

function TextBlock({ block }) {
  return (
    <section className="text-section">
      <h2>{block.heading}</h2>
      {block.body.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
      {block.points && (
        <ul>
          {block.points.map((point) => <li key={point}>{point}</li>)}
        </ul>
      )}
    </section>
  );
}

function Diagram({ visual }) {
  if (visual === "packets") return <PacketFlow />;
  if (visual === "buffer") return <BufferQueue />;
  if (visual === "timeline") return <SegmentTimeline />;
  if (visual === "video") return <VideoFundamentalsDiagram />;
  if (visual === "audio") return <AudioFundamentalsDiagram />;
  if (visual === "file") return <MediaFileDiagram />;
  if (visual === "codec") return <CodecCompressionDiagram />;
  if (visual === "fmp4") return <Fmp4CmafDiagram />;
  if (visual === "av-sync") return <AvSyncDiagram />;
  return null;
}

function resolveSnippet(snippet) {
  try {
    return { code: snippet.file ? getSnippet(snippet.file, snippet.region) : snippet.code.trim() };
  } catch (error) {
    return { error: error.message };
  }
}

function CodeSnippet({ snippet }) {
  const [copied, setCopied] = useState(false);
  const { code, error } = useMemo(() => resolveSnippet(snippet), [snippet]);

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      setCopied(false);
    }
  }

  const [slug, ...rest] = snippet.file ? snippet.file.split("/") : [];

  return (
    <section className="snippet">
      <div className="snippet-head">
        <div>
          <h2>{snippet.title}</h2>
          {snippet.file && (
            <a className="file-label" href={checkpointUrl(slug, rest.join("/"))} target="_blank" rel="noreferrer">
              <FileCode size={14} /> {snippet.file}
            </a>
          )}
          <p>{snippet.explain}</p>
        </div>
        {!error && (
          <button className="icon-button" onClick={copyCode} title="Copy code" aria-label="Copy code">
            {copied ? <Check size={18} /> : <Copy size={18} />}
          </button>
        )}
      </div>
      {error ? <div className="snippet-error" role="alert">{error}</div> : <pre><code>{code}</code></pre>}
    </section>
  );
}

function Checkpoint({ block }) {
  const scripts = block.files.filter((file) => file.endsWith(".sh"));
  return (
    <section className="checkpoint-panel">
      <h2><FlaskConical size={20} /> Checkpoint</h2>
      {block.run && (
        <p>
          <a className="primary lesson-link" href={checkpointUrl(block.slug)} target="_blank" rel="noreferrer">
            <ExternalLink size={18} /> Open checkpoint
          </a>
        </p>
      )}
      <ul className="checkpoint-files">
        {block.files.map((file) => (
          <li key={file}>
            <a href={checkpointUrl(block.slug, file)} target="_blank" rel="noreferrer">
              <FileCode size={14} /> {block.slug}/{file}
            </a>
          </li>
        ))}
      </ul>
      {scripts.map((file) => (
        <p key={file}>Run the lab script: <code>bash checkpoints/{block.slug}/{file}</code></p>
      ))}
      <h3>You should now see</h3>
      <ul className="verify-list">
        {block.verify.map((item) => <li key={item}>{item}</li>)}
      </ul>
      {block.note && <p className="checkpoint-note">{block.note}</p>}
    </section>
  );
}

function Exercise({ block }) {
  return (
    <section className="exercise-panel">
      <h2>Exercise: {block.title}</h2>
      {block.task.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
      {block.hint && (
        <details>
          <summary>Hint</summary>
          <p>{block.hint}</p>
        </details>
      )}
    </section>
  );
}

createRoot(document.getElementById("root")).render(<App />);
