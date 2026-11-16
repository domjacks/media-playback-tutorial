import { cpSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

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
  plugins: [react(), copyCheckpoints()],
  build: {
    rollupOptions: {
      input: {
        main: "index.html"
      }
    }
  }
});
