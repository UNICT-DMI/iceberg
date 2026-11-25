import index from "./index.html";

const asset = (path: string, type: string) =>
  new Response(Bun.file(new URL(`../assets/${path}`, import.meta.url)), {
    headers: { "content-type": type },
  });

const server = Bun.serve({
  port: Number(process.env.PORT ?? 3000),
  routes: {
    "/": index,
    "/items.toml": () =>
      new Response(Bun.file(new URL("./items.toml", import.meta.url)), {
        headers: { "content-type": "text/plain; charset=utf-8" },
      }),
    "/assets/models/iceberg-web.glb": asset("models/iceberg-web.glb", "model/gltf-binary"),
    "/assets/environment/ocean-panorama.hdr": asset("environment/ocean-panorama.hdr", "image/vnd.radiance"),
    "/assets/environment/polar-cirrus.webp": asset("environment/polar-cirrus.webp", "image/webp"),
    "/assets/textures/glacial-relief.webp": asset("textures/glacial-relief.webp", "image/webp"),
  },
  fetch(request) {
    const { pathname } = new URL(request.url);
    const file = /^\/(logos\/[a-z0-9-]+\.png|gallery\/[a-z0-9-]+\.jpg|contributors\.json)$/.exec(pathname);
    if (file) return new Response(Bun.file(new URL(`./${file[1]}`, import.meta.url)));
    return new Response("Not found", { status: 404 });
  },
  development: true,
});

console.log(`UNICT Devs iceberg: ${server.url}`);
