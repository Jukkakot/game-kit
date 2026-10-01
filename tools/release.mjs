// Releases one version of every kit package: `npm run release -- 0.2.0`.
// Sets the version, runs the check chain, commits, tags v<version> and pushes; the tag's
// release workflow packs the tarballs and creates the GitHub Release.
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const PACKAGES = ["protocol", "server", "client", "bots"];
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const run = (command) => execSync(command, { cwd: root, stdio: "inherit" });
const output = (command) => execSync(command, { cwd: root, encoding: "utf8" }).trim();

const version = process.argv[2];
if (!/^\d+\.\d+\.\d+$/.test(version ?? "")) {
  console.error("Usage: npm run release -- <major.minor.patch>");
  process.exit(1);
}
if (output("git status --porcelain")) throw new Error("The working tree is not clean");
if (output("git branch --show-current") !== "main") throw new Error("Release from main");
if (output(`git tag --list v${version}`)) throw new Error(`v${version} exists already: never re-tag`);

for (const pkg of PACKAGES) {
  const path = join(root, "packages", pkg, "package.json");
  const manifest = JSON.parse(readFileSync(path, "utf8"));
  manifest.version = version;
  writeFileSync(path, JSON.stringify(manifest, null, 2) + "\n");
}
run("npm install --no-audit --no-fund");
run("npm run check");
// The first release keeps the version the packages already have: nothing to commit.
if (output("git status --porcelain")) run(`git commit -am "chore: release v${version}"`);
run(`git tag v${version}`);
run(`git push origin main v${version}`);
console.log(`Pushed v${version}: the release workflow attaches the tarballs (gh run watch)`);
