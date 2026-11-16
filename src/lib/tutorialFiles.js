import { extractRegion, stripMarkers } from "./snippets.js";

const files = import.meta.glob("/checkpoints/**/*.{js,html,css,vtt,ttml,sh}", {
  query: "?raw",
  import: "default",
  eager: true
});

export function checkpointUrl(slug, file = "") {
  return `${import.meta.env.BASE_URL}checkpoints/${slug}/${file}`;
}

export function getSnippet(file, region) {
  const source = files[`/checkpoints/${file}`];
  if (typeof source !== "string") throw new Error(`Checkpoint file not found: checkpoints/${file}`);
  try {
    return region ? extractRegion(source, region) : stripMarkers(source);
  } catch (error) {
    throw new Error(`${file}: ${error.message}`, { cause: error });
  }
}
