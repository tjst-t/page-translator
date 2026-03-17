import * as esbuild from "esbuild";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SRC = path.join(ROOT, "src");
const DIST = path.join(ROOT, "dist");
const ASSETS = path.join(ROOT, "assets");

const ELEMENT_JS_URL =
  "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";

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

async function downloadElementJs() {
  const vendorDir = path.join(DIST, "vendor");
  fs.mkdirSync(vendorDir, { recursive: true });

  const resp = await fetch(ELEMENT_JS_URL);
  if (!resp.ok) {
    throw new Error(`Failed to download element.js: HTTP ${resp.status}`);
  }
  const code = await resp.text();
  fs.writeFileSync(path.join(vendorDir, "element.js"), code);
  console.log("Downloaded vendor/element.js");
}

async function main() {
  // Clean dist
  fs.rmSync(DIST, { recursive: true, force: true });
  fs.mkdirSync(DIST, { recursive: true });

  // Copy manifest.json
  copyFile(path.join(SRC, "manifest.json"), path.join(DIST, "manifest.json"));
  console.log("Copied manifest.json");

  // Copy HTML/CSS
  copyFile(
    path.join(SRC, "popup/popup.html"),
    path.join(DIST, "popup/popup.html"),
  );
  copyFile(
    path.join(SRC, "popup/popup.css"),
    path.join(DIST, "popup/popup.css"),
  );
  console.log("Copied popup HTML/CSS");

  // Copy icons
  copyDir(path.join(ASSETS, "icons"), path.join(DIST, "icons"));
  console.log("Copied icons");

  // Download Google Translate element.js
  await downloadElementJs();

  // Bundle TypeScript with esbuild
  await esbuild.build({
    entryPoints: [
      { in: path.join(SRC, "popup/popup.ts"), out: "popup/popup" },
      {
        in: path.join(SRC, "background/service-worker.ts"),
        out: "background/service-worker",
      },
    ],
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
