import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { extractRegion, listRegions } from "../src/lib/snippets.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const checkpointsDir = join(root, "checkpoints");
const { lessons } = await import(pathToFileURL(join(root, "src/data/lessons.js")).href);

const errors = [];
const warnings = [];
const usedSlugs = new Set();
const usedRegions = new Set();

for (const lesson of lessons) {
  lesson.blocks.forEach((block, index) => {
    const where = `${lesson.slug} block ${index + 1} (${block.type}${block.title ? ` "${block.title}"` : ""})`;
    if (block.type === "code") {
      const hasFile = block.file !== undefined;
      const hasCode = block.code !== undefined;
      if (hasFile === hasCode) {
        errors.push(`${where}: code block needs exactly one of "file" or "code"`);
        return;
      }
      if (!hasFile) return;
      const path = join(checkpointsDir, block.file);
      if (!existsSync(path) || !statSync(path).isFile()) {
        errors.push(`${where}: file not found: checkpoints/${block.file}`);
        return;
      }
      usedSlugs.add(block.file.split("/")[0]);
      if (block.region) {
        usedRegions.add(`${block.file}#${block.region}`);
        try {
          if (!extractRegion(readFileSync(path, "utf8"), block.region).trim()) {
            errors.push(`${where}: region "${block.region}" in ${block.file} is empty`);
          }
        } catch (error) {
          errors.push(`${where}: ${block.file}: ${error.message}`);
        }
      }
    } else if (block.type === "checkpoint") {
      usedSlugs.add(block.slug);
      const dir = join(checkpointsDir, block.slug);
      if (!existsSync(dir) || !statSync(dir).isDirectory()) {
        errors.push(`${where}: directory not found: checkpoints/${block.slug}`);
        return;
      }
      for (const file of block.files ?? []) {
        if (!existsSync(join(dir, file))) errors.push(`${where}: listed file not found: checkpoints/${block.slug}/${file}`);
      }
      if (block.run && !existsSync(join(dir, "index.html"))) {
        errors.push(`${where}: run: true requires checkpoints/${block.slug}/index.html`);
      }
    }
  });
}

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });
}

if (existsSync(checkpointsDir)) {
  const checkpointSlugs = new Set();
  for (const lesson of lessons) {
    for (const block of lesson.blocks) if (block.type === "checkpoint") checkpointSlugs.add(block.slug);
  }
  for (const entry of readdirSync(checkpointsDir, { withFileTypes: true })) {
    if (entry.isDirectory() && !checkpointSlugs.has(entry.name)) {
      warnings.push(`checkpoints/${entry.name} has no checkpoint block in any lesson`);
    }
  }
  for (const path of walk(checkpointsDir)) {
    const rel = path.slice(checkpointsDir.length + 1).split("\\").join("/");
    let source = "";
    let names = [];
    try {
      source = readFileSync(path, "utf8");
      names = listRegions(source);
    } catch {
      continue;
    }
    for (const name of names) {
      const openings = source.split("\n").filter((line) => new RegExp(`#region\\s+${name}(?![\\w-])`).test(line)).length;
      if (openings > 1) errors.push(`region "${name}" is defined ${openings} times in checkpoints/${rel}`);
      if (!usedRegions.has(`${rel}#${name}`)) warnings.push(`region "${name}" in checkpoints/${rel} is not used by any lesson`);
    }
  }
}

for (const warning of warnings) console.warn(`warning: ${warning}`);
if (errors.length) {
  console.error(`\n${errors.length} snippet error(s):`);
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}
console.log(`check-snippets: ok (${warnings.length} warning(s))`);
