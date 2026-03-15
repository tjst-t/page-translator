import * as esbuild from "esbuild";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(
  path.dirname(new URL(import.meta.url).pathname),
  "..",
);
const SRC = path.join(ROOT, "src");
const DIST = path.join(ROOT, "dist");
const ASSETS = path.join(ROOT, "assets");

function copyFile(src: string, dest: string) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

function copyDir(src: string, dest: string) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else if (entry.name !== ".gitkeep") {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

async function main() {
  // Clean dist
  fs.rmSync(DIST, { recursive: true, force: true });
  fs.mkdirSync(DIST, { recursive: true });

  // Copy manifest.json
  copyFile(path.join(SRC, "manifest.json"), path.join(DIST, "manifest.json"));
  console.log("Copied manifest.json");

  // Copy HTML/CSS
  copyFile(path.join(SRC, "popup/popup.html"), path.join(DIST, "popup/popup.html"));
  copyFile(path.join(SRC, "popup/popup.css"), path.join(DIST, "popup/popup.css"));
  console.log("Copied popup HTML/CSS");

  // Copy icons
  copyDir(path.join(ASSETS, "icons"), path.join(DIST, "icons"));
  console.log("Copied icons");

  // Bundle TypeScript with esbuild
  const entryPoints = [
    { in: path.join(SRC, "popup/popup.ts"), out: "popup/popup" },
    { in: path.join(SRC, "background/service-worker.ts"), out: "background/service-worker" },
    { in: path.join(SRC, "content/inject.ts"), out: "content/inject" },
  ];

  await esbuild.build({
    entryPoints: entryPoints.map((e) => ({ in: e.in, out: e.out })),
    outdir: DIST,
    bundle: true,
    format: "esm",
    target: "es2022",
    minify: false,
  });
  console.log("Compiled TypeScript");

  console.log("Build complete → dist/");
}

main();
