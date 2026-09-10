import { build } from "esbuild";
import { copyFile, mkdir, rm } from "node:fs/promises";

const dist = new URL("../dist/", import.meta.url);
const root = new URL("../", import.meta.url);

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });

for (const file of ["manifest.json", "popup.html", "popup.css"]) {
  await copyFile(new URL(file, root), new URL(file, dist));
}

await build({
  entryPoints: [new URL("../src/popup.js", import.meta.url).pathname],
  bundle: true,
  format: "iife",
  platform: "browser",
  target: ["chrome120"],
  outfile: new URL("popup.js", dist).pathname,
  sourcemap: false,
  minify: true,
  legalComments: "eof"
});

console.log("Built extension in dist/");
