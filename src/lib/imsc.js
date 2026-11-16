export function parseImscCues(xmlText) {
  const doc = new DOMParser().parseFromString(xmlText, "application/xml");
  if (doc.querySelector("parsererror")) throw new Error("The IMSC document could not be parsed as XML.");

  return [...doc.getElementsByTagNameNS("*", "p")].map((node) => ({
    begin: parseTime(node.getAttribute("begin")),
    end: parseTime(node.getAttribute("end")),
    region: node.getAttribute("region") ?? "",
    text: (node.textContent ?? "").replace(/\s+/g, " ").trim()
  }));
}

function parseTime(value) {
  const text = (value ?? "").trim();
  const clock = /^(\d+):(\d{2}):(\d{2}(?:\.\d+)?)$/.exec(text);
  if (clock) return Number(clock[1]) * 3600 + Number(clock[2]) * 60 + Number(clock[3]);

  const offset = /^(\d+(?:\.\d+)?)(h|ms|m|s)$/.exec(text);
  if (offset) {
    const scale = { h: 3600, m: 60, s: 1, ms: 0.001 }[offset[2]];
    return Number(offset[1]) * scale;
  }

  return 0;
}
