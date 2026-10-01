// The template's placeholder names (template/ is written as a game called "Starter Game") and the
// leftover check shared by create-game and template:check.
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

export const PLACEHOLDER = {
  kebab: "starter-game",
  camel: "starterGame",
  pascal: "StarterGame",
  title: "Starter Game",
  serverPort: 2597,
  theme: "Placeholder",
};

/** Client port = server port + 2606 (as in Labyrinth 2567/5173 and Palikka 2577/5183); preview = client + 1. */
export const CLIENT_PORT_OFFSET = 2606;

/** Ports the known games use; a new game must pick another. */
export const KNOWN_PORTS = { labyrinth: 2567, palikka: 2577 };

/** Folders never copied or scanned. */
export const SKIP_DIRS = new Set(["node_modules", "dist", "build", ".release", "tournament-results", "test-results", "playwright-report", ".git"]);

export const BINARY = /\.(png|ico|jpg|jpeg|gif|webp|woff2?)$/i;

/** The name forms of a kebab-case name: `connect-four` → connectFour, ConnectFour, Connect Four. */
export function nameForms(kebab) {
  const words = kebab.split("-");
  const cap = (w) => w[0].toUpperCase() + w.slice(1);
  return {
    kebab,
    camel: words[0] + words.slice(1).map(cap).join(""),
    pascal: words.map(cap).join(""),
    title: words.map(cap).join(" "),
  };
}

/** Every file under `root` (relative, forward slashes), skipping SKIP_DIRS. */
export function listFiles(root, dir = root) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (SKIP_DIRS.has(entry.name)) return [];
    const path = join(dir, entry.name);
    return entry.isDirectory() ? listFiles(root, path) : [relative(root, path).replaceAll("\\", "/")];
  });
}

/** What a generated game must never contain: placeholder forms, ports and other games' names. */
export function leftoverPatterns() {
  const { kebab, camel, pascal, title, serverPort } = PLACEHOLDER;
  const clientPort = serverPort + CLIENT_PORT_OFFSET;
  return [
    ...[kebab, camel, pascal, title].map((form) => new RegExp(form)),
    new RegExp(`\\b(${serverPort}|${clientPort}|${clientPort + 1})\\b`),
    /palikka|kuura|labyrinth/i,
  ];
}

/** Leftover lines in the project at `root` (paths included), as "file:line: text". */
export function findLeftovers(root) {
  const patterns = leftoverPatterns();
  const hits = [];
  for (const file of listFiles(root)) {
    if (file === "package-lock.json") continue;
    if (patterns.some((p) => p.test(file))) hits.push(`${file}: (path)`);
    if (BINARY.test(file)) continue;
    readFileSync(join(root, file), "utf8")
      .split("\n")
      .forEach((line, i) => {
        if (patterns.some((p) => p.test(line))) hits.push(`${file}:${i + 1}: ${line.trim().slice(0, 120)}`);
      });
  }
  return hits;
}
