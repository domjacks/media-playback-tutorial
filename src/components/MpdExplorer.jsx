import React, { useMemo, useState } from "react";
import { computeSegments } from "./mpdMath.js";

const defaults = {
  media: "$RepresentationID$/$Number%06d$.m4s",
  initialization: "$RepresentationID$/IS.mp4",
  representationId: "896x504p25",
  bandwidth: "1570000",
  baseUrl: "https://vod-dash-ww-rd-live.akamaized.net/bbb/2/avc1/",
  timescale: "1000",
  duration: "3840",
  startNumber: "1",
  presentationSeconds: "572.52"
};

const textFields = [
  ["media", "SegmentTemplate media"],
  ["initialization", "SegmentTemplate initialization"],
  ["representationId", "Representation id"],
  ["baseUrl", "BaseURL"]
];
const numberFields = [
  ["bandwidth", "Representation bandwidth"],
  ["timescale", "timescale"],
  ["duration", "duration (timescale units)"],
  ["startNumber", "startNumber"],
  ["presentationSeconds", "mediaPresentationDuration (s)"]
];

function seconds(value) {
  return value.toFixed(2);
}

export function MpdExplorer() {
  const [values, setValues] = useState(defaults);
  const result = useMemo(
    () => computeSegments({
      media: values.media,
      initialization: values.initialization,
      representationId: values.representationId,
      bandwidth: Number(values.bandwidth) || 0,
      baseUrl: values.baseUrl,
      timescale: Number(values.timescale),
      duration: Number(values.duration),
      startNumber: Number(values.startNumber) || 0,
      presentationSeconds: Number(values.presentationSeconds)
    }),
    [values]
  );

  function update(name, value) {
    setValues((current) => ({ ...current, [name]: value }));
  }

  return (
    <section className="mpd-explorer" aria-label="MPD SegmentTemplate explorer">
      <h2>MPD Explorer</h2>
      <p>Edit the SegmentTemplate fields and watch the player's segment maths and request URLs change. Nothing is fetched.</p>
      <div className="mpd-fields">
        {textFields.map(([name, label]) => (
          <label key={name} className="mpd-field wide">
            <span>{label}</span>
            <input type="text" value={values[name]} spellCheck={false} onChange={(event) => update(name, event.target.value)} />
          </label>
        ))}
        {numberFields.map(([name, label]) => (
          <label key={name} className="mpd-field">
            <span>{label}</span>
            <input type="number" step="any" min="0" value={values[name]} onChange={(event) => update(name, event.target.value)} />
          </label>
        ))}
      </div>
      <button type="button" className="secondary" onClick={() => setValues(defaults)}>Reset to defaults</button>

      <div className="mpd-summary" role="status">
        <span>Segment duration <strong>{result.segmentSeconds > 0 ? `${result.segmentSeconds} s` : "invalid"}</strong></span>
        <span>Segment count <strong>{result.count}</strong></span>
      </div>
      <p className="mpd-init">Initialization: <code>{result.init}</code></p>

      <div className="mpd-table-wrap">
        <table className="mpd-table">
          <caption>First 5 and last 2 segments</caption>
          <thead>
            <tr><th scope="col">Number</th><th scope="col">Time (s)</th><th scope="col">URL</th></tr>
          </thead>
          <tbody>
            {result.rows.map((row, index) => (
              <React.Fragment key={row.number}>
                {result.skipped > 0 && index === 5 && (
                  <tr className="mpd-gap"><td colSpan={3}>... {result.skipped} more segments ...</td></tr>
                )}
                <tr>
                  <td>{row.number}</td>
                  <td>{seconds(row.start)}–{seconds(row.end)}</td>
                  <td><code>{row.url}</code></td>
                </tr>
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
