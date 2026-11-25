# UNICT Devs iceberg

The open source projects of [UNICT Devs](https://github.com/UNICT-DMI) on the
iceberg, from the best known at the tip to the least known in the abyss.

Live: <https://unict-dmi.github.io/iceberg/>

## Run locally

From the repository root:

```sh
bun install
bun unict-devs/server.ts        # http://localhost:3000, PORT overrides
```

## Content

- `items.toml`: projects, their depth (`obscurity_bucket`), logo and gallery.
  Edit and refresh the page; no restart needed.
- `logos/`, `gallery/`: pictures referenced from `items.toml`.
- `contributors.json`: generated from the GitHub API. Regenerate with
  `GITHUB_TOKEN=$(gh auth token) bun unict-devs/scripts/fetch-contributors.ts`.

## Publish

`bun unict-devs/build.ts` writes a static site to `dist-pages/`. The `Pages`
workflow builds and deploys it to GitHub Pages on every push to `main`.
