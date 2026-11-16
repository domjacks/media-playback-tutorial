import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  BookOpen,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  FlaskConical,
  Play,
  ShieldCheck,
  Undo2
} from "lucide-react";
import { MDXProvider } from "@mdx-js/react";
import { lessons, sections } from "./lessons/index.js";
import { lessonComponents } from "./components/LessonComponents.jsx";
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
  const completedCount = lessons.filter((item) => progress[item.slug]).length;

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

  function toggleComplete() {
    setProgress((current) => {
      const next = { ...current, [lesson.slug]: !current[lesson.slug] };
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
        <LessonNav activeSlug={lesson.slug} activeSection={lesson.section} progress={progress} />
      </aside>
      <main className="lesson-page">
        <Lesson lesson={lesson} index={activeIndex} onToggleComplete={toggleComplete} progress={progress} />
      </main>
    </div>
  );
}

function LessonNav({ activeSlug, activeSection, progress }) {
  const [expanded, setExpanded] = useState(() => new Set([activeSection]));

  const [seenSection, setSeenSection] = useState(activeSection);
  if (seenSection !== activeSection) {
    setSeenSection(activeSection);
    if (!expanded.has(activeSection)) setExpanded(new Set(expanded).add(activeSection));
  }

  function toggle(title) {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(title)) next.delete(title);
      else next.add(title);
      return next;
    });
  }

  return (
    <nav className="lesson-nav">
      {sections.map((section, sectionIndex) => {
        const open = expanded.has(section.title);
        const done = section.lessons.filter((item) => progress[item.slug]).length;
        const listId = `lesson-section-${sectionIndex}`;
        return (
          <section key={section.title} className={`nav-section${section.title === activeSection ? " current" : ""}`}>
            <button
              type="button"
              className="nav-section-toggle"
              aria-expanded={open}
              aria-controls={listId}
              onClick={() => toggle(section.title)}
            >
              <ChevronDown size={16} className="nav-section-chevron" />
              <span className="nav-section-title">{section.title}</span>
              <span className="nav-section-count">{done}/{section.lessons.length}</span>
            </button>
            {open && (
              <div id={listId} className="nav-section-lessons">
                {section.lessons.map((item) => (
                  <a
                    key={item.slug}
                    href={`#/${item.slug}`}
                    className={item.slug === activeSlug ? "active" : ""}
                    aria-current={item.slug === activeSlug ? "page" : undefined}
                  >
                    <span className="lesson-number">{item.index + 1}</span>
                    <span>
                      <strong>{item.title}</strong>
                      <small>{item.kind}</small>
                    </span>
                    {progress[item.slug] && <Check size={16} />}
                  </a>
                ))}
              </div>
            )}
          </section>
        );
      })}
    </nav>
  );
}

function Lesson({ lesson, index, onToggleComplete, progress }) {
  const previous = lessons[index - 1];
  const next = lessons[index + 1];
  const completed = Boolean(progress[lesson.slug]);
  const Icon = lesson.kind === "Theory" ? BookOpen : lesson.slug === "drm-practical" ? ShieldCheck : FlaskConical;

  return (
    <article>
      <header className="lesson-hero">
        <div className="lesson-kicker"><Icon size={18} /> {lesson.section} · {lesson.kind}</div>
        <h1>{lesson.title}</h1>
        <p>{lesson.summary}</p>
        <div className="hero-actions">
          <button
            type="button"
            className={`primary${completed ? " is-complete" : ""}`}
            aria-pressed={completed}
            onClick={onToggleComplete}
          >
            {completed ? <Undo2 size={18} /> : <Check size={18} />}
            {completed ? "Mark incomplete" : "Mark complete"}
          </button>
          <a className="secondary" href={lesson.reference} target="_blank" rel="noreferrer">
            <ExternalLink size={18} /> Reference
          </a>
        </div>
      </header>

      <section className="content-grid">
        <div className="lesson-body">
          <MDXProvider components={lessonComponents}>
            <lesson.Content />
          </MDXProvider>
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

createRoot(document.getElementById("root")).render(<App />);
