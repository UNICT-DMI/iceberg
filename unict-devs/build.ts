// Builds the UNICT Devs iceberg as a static site, e.g. for GitHub Pages.
// Usage: bun unict-devs/build.ts [outdir]   (default: dist-pages)
import { cp, rm } from "node:fs/promises";

const here = new URL("./", import.meta.url);
const root = new URL("../", here);
const outdir = new URL(`${process.argv[2] ?? "dist-pages"}/`, root);

await rm(outdir, { recursive: true, force: true });

// Bundle main.ts rather than index.html: Bun 1.3.8 (pinned in CI) writes an
// empty script when the HTML file is the entrypoint.
const result = await Bun.build({
  entrypoints: [new URL("main.ts", here).pathname],
  outdir: outdir.pathname,
  target: "browser",
  format: "esm",
  minify: true,
  naming: "[name]-[hash].[ext]",
});
if (!result.success) {
  for (const log of result.logs) console.error(log);
  process.exit(1);
}
const outputName = (extension: string) => {
  const output = result.outputs.find(file => file.path.endsWith(extension));
  if (!output) throw new Error(`The build produced no ${extension} file.`);
  return output.path.slice(outdir.pathname.length);
};
// Relative URLs keep the site working under a sub-path like /iceberg/.
const html = (await Bun.file(new URL("index.html", here)).text()).replace(
  '<script type="module" src="./main.ts"></script>',
  `<link rel="stylesheet" href="./${outputName(".css")}" />\n    <script type="module" src="./${outputName(".js")}"></script>`,
);
if (!html.includes(outputName(".js"))) throw new Error("index.html no longer loads ./main.ts.");
await Bun.write(new URL("index.html", outdir), html);

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
