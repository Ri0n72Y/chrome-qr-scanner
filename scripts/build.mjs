import { build } from "esbuild";
import { copyFile, mkdir, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const dist = new URL("../dist/", import.meta.url);
const root = new URL("../", import.meta.url);

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });

for (const file of ["manifest.json", "popup.html", "popup.css"]) {
  await copyFile(new URL(file, root), new URL(file, dist));
}

await build({
  entryPoints: [fileURLToPath(new URL("../src/popup.js", import.meta.url))],
  bundle: true,
  format: "iife",
  platform: "browser",
  target: ["chrome120"],
  outfile: fileURLToPath(new URL("popup.js", dist)),
  sourcemap: false,
  minify: true,
  legalComments: "eof"
});

console.log("Built extension in dist/");
