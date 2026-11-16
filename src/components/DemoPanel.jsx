import React from "react";
import { Clock, Lightbulb, Waypoints, Layers } from "lucide-react";

const modeIcons = { timeline: Clock, packets: Waypoints, buffer: Layers };

export function DemoPanel({ demo }) {
  const Icon = modeIcons[demo.mode] ?? Lightbulb;
  return (
    <aside className={`key-idea ${demo.mode ?? ""}`} aria-label={`Key idea: ${demo.title}`}>
      <span className="key-idea-icon" aria-hidden="true"><Icon size={22} /></span>
      <div>
        <span className="key-idea-label">Key idea</span>
        <h2>{demo.title}</h2>
        <p>{demo.text}</p>
      </div>
    </aside>
  );
}
