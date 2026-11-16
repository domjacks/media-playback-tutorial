import { cpSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import mdx from "@mdx-js/rollup";
import remarkFrontmatter from "remark-frontmatter";
import remarkGfm from "remark-gfm";
import remarkMdxFrontmatter from "remark-mdx-frontmatter";
import rehypeSections from "./src/lib/rehype-sections.js";

function copyCheckpoints() {
  let outDir = "dist";
  let root = process.cwd();
  return {
    name: "copy-checkpoints",
    apply: "build",
    configResolved(config) {
      outDir = config.build.outDir;
      root = config.root;
    },
    closeBundle() {
      const from = resolve(root, "checkpoints");
      if (!existsSync(from)) return;
      cpSync(from, resolve(root, outDir, "checkpoints"), { recursive: true });
    }
  };
}

export default defineConfig({
  plugins: [
    {
      enforce: "pre",
      ...mdx({
        providerImportSource: "@mdx-js/react",
        remarkPlugins: [remarkFrontmatter, remarkMdxFrontmatter, remarkGfm],
        rehypePlugins: [rehypeSections]
      })
    },
    react(),
    copyCheckpoints()
  ],
  build: {
    rollupOptions: {
      input: {
        main: "index.html"
      }
    }
  }
});
