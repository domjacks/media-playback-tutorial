// Renders every lesson server-side through Vite so broken MDX or component props
// fail here instead of in the browser. Usage: node scripts/render-lessons.mjs [slug...]
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createServer } from "vite";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(join(root, "package.json"));
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const { MDXProvider } = require("@mdx-js/react");

// Components may touch DOMParser while rendering; a stub is enough for a render check.
globalThis.DOMParser ??= class {
  parseFromString() {
    return { querySelector: () => null, getElementsByTagNameNS: () => [] };
  }
};

const only = new Set(process.argv.slice(2));
const server = await createServer({ root, logLevel: "error", server: { middlewareMode: true }, appType: "custom" });
let failures = 0;

try {
  const { lessons } = await server.ssrLoadModule("/src/lessons/index.js");
  const { lessonComponents } = await server.ssrLoadModule("/src/components/LessonComponents.jsx");

  for (const lesson of lessons) {
    if (only.size && !only.has(lesson.slug)) continue;
    try {
      const html = renderToStaticMarkup(
        React.createElement(MDXProvider, { components: lessonComponents }, React.createElement(lesson.Content))
      );
      if (html.includes("snippet-error")) throw new Error("a Snippet rendered an error box");
    } catch (error) {
      failures += 1;
      console.error(`FAIL ${lesson.slug}: ${error.message}`);
    }
  }

  const count = only.size || lessons.length;
  if (failures) {
    console.error(`render-lessons: ${failures} of ${count} lesson(s) failed`);
    process.exitCode = 1;
  } else {
    console.log(`render-lessons: ok (${count} lesson(s))`);
  }
} finally {
  await server.close();
}
