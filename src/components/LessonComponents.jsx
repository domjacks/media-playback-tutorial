import React, { Children, isValidElement, useMemo, useState } from "react";
import { Check, Copy, ExternalLink, FileCode, FlaskConical, HelpCircle } from "lucide-react";
import { AudioFundamentalsDiagram, AvSyncDiagram, BufferQueue, CodecCompressionDiagram, Fmp4CmafDiagram, MediaFileDiagram, PacketFlow, SegmentTimeline, VideoFundamentalsDiagram } from "./Diagrams.jsx";
import { DemoPanel } from "./DemoPanel.jsx";
import { MpdExplorer } from "./MpdExplorer.jsx";
import { PlayerShowcase } from "./PlayerShowcase.jsx";
import { checkpointUrl, getSnippet } from "../lib/tutorialFiles.js";

function textOf(node) {
  if (node === null || node === undefined || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (isValidElement(node)) return textOf(node.props.children);
  return Children.toArray(node).map(textOf).join("");
}

function resolveSnippet(file, region, children) {
  try {
    return { code: file ? getSnippet(file, region) : textOf(children).trim() };
  } catch (error) {
    return { error: error.message };
  }
}

export function Snippet({ title, explain, file, region, children }) {
  const [copied, setCopied] = useState(false);
  const { code, error } = useMemo(() => resolveSnippet(file, region, children), [file, region, children]);

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      setCopied(false);
    }
  }

  const [slug, ...rest] = file ? file.split("/") : [];

  return (
    <section className="snippet">
      <div className="snippet-head">
        <div>
          <h2>{title}</h2>
          {file && (
            <a className="file-label" href={checkpointUrl(slug, rest.join("/"))} target="_blank" rel="noreferrer">
              <FileCode size={14} /> {file}
            </a>
          )}
          <p>{explain}</p>
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

export function Diagram({ visual }) {
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

export function Demo({ title, mode, children }) {
  return <DemoPanel demo={{ title, mode, text: children }} />;
}

export function Checkpoint({ slug, run, files, note, children }) {
  const scripts = files.filter((file) => file.endsWith(".sh"));
  return (
    <section className="checkpoint-panel">
      <h2><FlaskConical size={20} /> Checkpoint</h2>
      {run && (
        <p>
          <a className="primary lesson-link" href={checkpointUrl(slug)} target="_blank" rel="noreferrer">
            <ExternalLink size={18} /> Open checkpoint
          </a>
        </p>
      )}
      <ul className="checkpoint-files">
        {files.map((file) => (
          <li key={file}>
            <a href={checkpointUrl(slug, file)} target="_blank" rel="noreferrer">
              <FileCode size={14} /> {slug}/{file}
            </a>
          </li>
        ))}
      </ul>
      {scripts.map((file) => (
        <p key={file}>Run the lab script: <code>bash checkpoints/{slug}/{file}</code></p>
      ))}
      <h3>You should now see</h3>
      <div className="verify-list">{children}</div>
      {note && <p className="checkpoint-note">{note}</p>}
    </section>
  );
}

export function Exercise({ title, children }) {
  return (
    <section className="exercise-panel">
      <h2>Exercise: {title}</h2>
      {children}
    </section>
  );
}

export function Hint({ children }) {
  return (
    <details>
      <summary>Hint</summary>
      <p>{children}</p>
    </details>
  );
}

export function Question({ prompt, children }) {
  return (
    <section className="question-panel">
      <span className="question-label"><HelpCircle size={16} aria-hidden="true" /> Predict</span>
      <p className="question-prompt">{prompt}</p>
      <details>
        <summary>Think about it, then reveal</summary>
        <div className="question-answer">{children}</div>
      </details>
    </section>
  );
}

export const lessonComponents = { Snippet, Diagram, Demo, Question, Checkpoint, Exercise, Hint, PlayerShowcase, MpdExplorer };
