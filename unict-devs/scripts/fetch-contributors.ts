// Regenerates contributors.json from the GitHub API.
// Usage: GITHUB_TOKEN=$(gh auth token) bun scripts/fetch-contributors.ts
import { parse } from "smol-toml";

const shown = 60;
// Items whose `url` is not their GitHub repository.
const repoOverrides: Record<string, string> = {
  "open-job-dmi": "UNICT-DMI/open-job-dmi",
};

type GitHubContributor = { login: string; avatar_url: string; html_url: string; type: string };

const token = process.env.GITHUB_TOKEN;
const headers: Record<string, string> = { accept: "application/vnd.github+json" };
if (token) headers.authorization = `Bearer ${token}`;

async function github<T>(path: string): Promise<T> {
  const response = await fetch(`https://api.github.com${path}`, { headers });
  if (!response.ok) throw new Error(`${path}: ${response.status} ${await response.text()}`);
  return response.json() as Promise<T>;
}

const root = new URL("..", import.meta.url);
const { items } = parse(await Bun.file(new URL("items.toml", root)).text()) as {
  items: { slug: string; url: string }[];
};

const names = new Map<string, string>();
async function displayName(login: string) {
  if (!names.has(login)) {
    const user = await github<{ name: string | null }>(`/users/${login}`);
    names.set(login, user.name?.trim() || login);
  }
  return names.get(login)!;
}

const result: Record<string, unknown> = {};
for (const item of items) {
  const repo = repoOverrides[item.slug]
    ?? /^https:\/\/github\.com\/([^/]+\/[^/]+)/.exec(item.url)?.[1];
  if (!repo) {
    console.warn(`${item.slug}: no GitHub repository, skipped`);
    continue;
  }
  const people = (await github<GitHubContributor[]>(`/repos/${repo}/contributors?per_page=100`))
    .filter(person => person.type === "User" && !person.login.endsWith("[bot]"));
  result[item.slug] = {
    contributors_total: people.length,
    contributors_url: `https://github.com/${repo}/graphs/contributors`,
    contributors: await Promise.all(people.slice(0, shown).map(async person => ({
      name: await displayName(person.login),
      avatar: `${person.avatar_url}${person.avatar_url.includes("?") ? "&" : "?"}s=96`,
      url: person.html_url,
    }))),
  };
  console.log(`${item.slug}: ${people.length} contributors`);
}

await Bun.write(new URL("contributors.json", root), `${JSON.stringify(result, null, 2)}\n`);
