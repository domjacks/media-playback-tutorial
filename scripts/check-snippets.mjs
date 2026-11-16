import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkMdx from "remark-mdx";
import remarkFrontmatter from "remark-frontmatter";
import { parse as parseYaml } from "yaml";
import { extractRegion, listRegions } from "../src/lib/snippets.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const checkpointsDir = join(root, "checkpoints");
const lessonsDir = join(root, "src/lessons");
const { lessonOrder } = await import(pathToFileURL(join(lessonsDir, "order.js")).href);

const requiredFields = ["slug", "title", "kind", "summary", "outcome", "reference"];
const kinds = ["Theory", "Practical"];
const allowedComponents = ["Snippet", "Diagram", "Demo", "Checkpoint", "Exercise", "Hint", "PlayerShowcase"];

const errors = [];
const warnings = [];
const checkpointSlugs = new Set();
const usedRegions = new Set();

const processor = unified().use(remarkParse).use(remarkMdx).use(remarkFrontmatter, ["yaml"]);

function attributeValue(attribute) {
  const { value } = attribute;
  if (value === null || value === undefined) return true;
  if (typeof value === "string") return value;
  if (value.type === "mdxJsxAttributeValueExpression") return JSON.parse(value.value);
  throw new Error(`unsupported attribute value for "${attribute.name}"`);
}

function readAttributes(node, where, problems) {
  const props = {};
  for (const attribute of node.attributes) {
    if (attribute.type !== "mdxJsxAttribute") {
      problems.push(`${where}: spread attributes are not supported`);
      continue;
    }
    try {
      props[attribute.name] = attributeValue(attribute);
    } catch (error) {
      problems.push(`${where}: attribute "${attribute.name}" must be a string, boolean or JSON expression (${error.message})`);
    }
  }
  return props;
}

function walk(node, visit) {
  visit(node);
  for (const child of node.children ?? []) walk(child, visit);
}

function checkSnippet(where, props, node) {
  const hasFile = props.file !== undefined;
  const codeChildren = (node.children ?? []).filter((child) => child.type === "code");
  if (hasFile === (codeChildren.length > 0) || codeChildren.length > 1) {
    errors.push(`${where}: Snippet needs exactly one of "file" or one fenced code child`);
    return;
  }
  if (!props.title || !props.explain) errors.push(`${where}: Snippet needs title and explain`);
  if (!hasFile) return;
  const path = join(checkpointsDir, props.file);
  if (!existsSync(path) || !statSync(path).isFile()) {
    errors.push(`${where}: file not found: checkpoints/${props.file}`);
    return;
  }
  if (props.region) {
    usedRegions.add(`${props.file}#${props.region}`);
    try {
      if (!extractRegion(readFileSync(path, "utf8"), props.region).trim()) {
        errors.push(`${where}: region "${props.region}" in ${props.file} is empty`);
      }
    } catch (error) {
      errors.push(`${where}: ${props.file}: ${error.message}`);
    }
  }
}

function checkCheckpoint(where, props) {
  checkpointSlugs.add(props.slug);
  const dir = join(checkpointsDir, String(props.slug));
  if (!existsSync(dir) || !statSync(dir).isDirectory()) {
    errors.push(`${where}: directory not found: checkpoints/${props.slug}`);
    return;
  }
  if (!Array.isArray(props.files)) {
    errors.push(`${where}: Checkpoint needs files={[...]}`);
    return;
  }
  for (const file of props.files) {
    if (!existsSync(join(dir, file))) errors.push(`${where}: listed file not found: checkpoints/${props.slug}/${file}`);
  }
  if (props.run && !existsSync(join(dir, "index.html"))) {
    errors.push(`${where}: run requires checkpoints/${props.slug}/index.html`);
  }
}

function checkLesson(fileSlug, source) {
  const label = `${fileSlug}.mdx`;
  let tree;
  try {
    tree = processor.parse(source);
  } catch (error) {
    errors.push(`${label}: could not parse MDX: ${error.message}`);
    return;
  }

  const yamlNode = tree.children.find((node) => node.type === "yaml");
  let frontmatter = null;
  try {
    frontmatter = yamlNode ? parseYaml(yamlNode.value) : null;
  } catch (error) {
    errors.push(`${label}: invalid frontmatter YAML: ${error.message}`);
  }
  if (!frontmatter || typeof frontmatter !== "object") {
    errors.push(`${label}: missing frontmatter`);
  } else {
    for (const field of requiredFields) {
      if (typeof frontmatter[field] !== "string" || !frontmatter[field].trim()) errors.push(`${label}: frontmatter field "${field}" is missing or not a non-empty string`);
    }
    if (frontmatter.kind && !kinds.includes(frontmatter.kind)) errors.push(`${label}: kind must be one of ${kinds.join(", ")} (got "${frontmatter.kind}")`);
    if (frontmatter.slug && frontmatter.slug !== fileSlug) errors.push(`${label}: frontmatter slug "${frontmatter.slug}" does not match filename`);
  }

  walk(tree, (node) => {
    if (node.type !== "mdxJsxFlowElement" && node.type !== "mdxJsxTextElement") return;
    const name = node.name;
    const where = `${label} line ${node.position?.start.line ?? "?"} <${name ?? "fragment"}>`;
    if (!allowedComponents.includes(name)) {
      errors.push(`${where}: unknown component (allowed: ${allowedComponents.join(", ")})`);
      return;
    }
    const problems = [];
    const props = readAttributes(node, where, problems);
    errors.push(...problems);
    if (name === "Snippet") checkSnippet(where, props, node);
    else if (name === "Checkpoint") checkCheckpoint(where, props);
  });
}

// order.js and files must match one-to-one
const files = readdirSync(lessonsDir).filter((name) => name.endsWith(".mdx")).map((name) => name.slice(0, -4));
for (const slug of lessonOrder) {
  if (!files.includes(slug)) errors.push(`order.js lists "${slug}" but src/lessons/${slug}.mdx does not exist`);
}
for (const slug of files) {
  if (!lessonOrder.includes(slug)) errors.push(`src/lessons/${slug}.mdx is not listed in order.js`);
}
const duplicates = lessonOrder.filter((slug, index) => lessonOrder.indexOf(slug) !== index);
for (const slug of duplicates) errors.push(`order.js lists "${slug}" more than once`);

for (const slug of files) checkLesson(slug, readFileSync(join(lessonsDir, `${slug}.mdx`), "utf8"));

function walkFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? walkFiles(path) : [path];
  });
}

if (existsSync(checkpointsDir)) {
  for (const entry of readdirSync(checkpointsDir, { withFileTypes: true })) {
    if (entry.isDirectory() && !checkpointSlugs.has(entry.name)) {
      warnings.push(`checkpoints/${entry.name} has no checkpoint block in any lesson`);
    }
  }
  for (const path of walkFiles(checkpointsDir)) {
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
