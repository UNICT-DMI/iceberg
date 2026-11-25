// Builds the UNICT Devs iceberg as a static site, e.g. for GitHub Pages.
// Usage: bun unict-devs/build.ts [outdir]   (default: dist-pages)
import { cp, rm } from "node:fs/promises";

const here = new URL("./", import.meta.url);
const root = new URL("../", here);
const outdir = new URL(`${process.argv[2] ?? "dist-pages"}/`, root);

await rm(outdir, { recursive: true, force: true });

const result = await Bun.build({
  entrypoints: [new URL("index.html", here).pathname],
  outdir: outdir.pathname,
  target: "browser",
  minify: true,
  // Relative URLs keep the site working under a sub-path like /iceberg/.
  publicPath: "./",
});
if (!result.success) {
  for (const log of result.logs) console.error(log);
  process.exit(1);
}

for (const path of ["items.toml", "contributors.json", "logos", "gallery"]) {
  await cp(new URL(path, here), new URL(path, outdir), { recursive: true });
}
for (const path of [
  "models/iceberg-web.glb",
  "environment/ocean-panorama.hdr",
  "environment/polar-cirrus.webp",
  "textures/glacial-relief.webp",
]) {
  await cp(new URL(`assets/${path}`, root), new URL(`assets/${path}`, outdir), { recursive: true });
}

console.log(`Built ${outdir.pathname}`);
