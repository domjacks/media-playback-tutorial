export async function installImscRenderer(video, url) {
  const cues = await loadImscCues(url);
  const overlay = createOverlay(video);

  function render() {
    const now = video.currentTime;
    const active = cues.filter((cue) => cue.begin <= now && now < cue.end);
    overlay.replaceChildren(...active.map(renderCue));
  }

  video.addEventListener("timeupdate", render);
  video.addEventListener("seeking", render);
  video.addEventListener("emptied", () => overlay.replaceChildren());
  render();
}

async function loadImscCues(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch ${url}`);

  const xml = await response.text();
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  return [...doc.getElementsByTagNameNS("*", "p")].map((node) => ({
    begin: parseClock(node.getAttribute("begin")),
    end: parseClock(node.getAttribute("end")),
    region: node.getAttribute("region") ?? "default",
    text: node.textContent.trim().replace(/\s+/g, " ")
  }));
}

function createOverlay(video) {
  let stage = video.parentElement;
  if (!stage?.classList.contains("video-stage")) {
    stage = document.createElement("div");
    video.before(stage);
    stage.append(video);
  }
  stage.classList.add("video-stage");

  const overlay = document.createElement("div");
  overlay.className = "imsc-overlay";
  stage.append(overlay);
  return overlay;
}

function renderCue(cue) {
  const element = document.createElement("div");
  element.className = `imsc-cue imsc-region-${cue.region}`;
  element.textContent = cue.text;
  return element;
}

function parseClock(value) {
  const match = /^(\d+):(\d{2}):(\d{2}(?:\.\d+)?)$/.exec(value ?? "");
  if (!match) return 0;
  return Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]);
}
