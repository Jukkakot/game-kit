// Packs every kit package into .release/<scope>-<name>-<version>.tgz, ready for a GitHub Release.
//
//   npm run pack             internal @game-kit/* dependencies point at this version's release URLs
//   npm run pack -- --local  they point at the tarballs in .release/ (file:), for `kit:use local`
//
// The packed package.json drops the `source` export condition (the tarball has no src/), the
// scripts, the dev dependencies and `private`.
import { execSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const REPO = "Jukkakot/game-kit";
export const PACKAGES = ["protocol", "server", "client", "bots"];

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const local = process.argv.includes("--local");
const outDir = join(root, ".release");

const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));
const tarballName = (name, version) => `${name.replace(/^@/, "").replace("/", "-")}-${version}.tgz`;

function tarballUrl(name, version) {
  const file = tarballName(name, version);
  if (local) return `file:${join(outDir, file).replaceAll("\\", "/")}`;
  return `https://github.com/${REPO}/releases/download/v${version}/${file}`;
}

function withoutSource(exports) {
  return Object.fromEntries(
    Object.entries(exports).map(([path, conditions]) => {
      const { source: _source, ...rest } = conditions;
      return [path, rest];
    }),
  );
}

function packedManifest(manifest, version) {
  const { private: _private, scripts: _scripts, devDependencies: _dev, ...rest } = manifest;
  const dependencies = Object.fromEntries(
    Object.entries(rest.dependencies ?? {}).map(([name, range]) => [
      name,
      name.startsWith("@game-kit/") ? tarballUrl(name, version) : range,
    ]),
  );
  return {
    ...rest,
    exports: withoutSource(rest.exports),
    ...(rest.dependencies ? { dependencies } : {}),
  };
}

const version = readJson(join(root, "packages/protocol/package.json")).version;
for (const pkg of PACKAGES) {
  const v = readJson(join(root, "packages", pkg, "package.json")).version;
  if (v !== version) throw new Error(`packages/${pkg} is at ${v}, expected ${version} (one version for all)`);
}

execSync("npm run build", { cwd: root, stdio: "inherit" });
rmSync(outDir, { recursive: true, force: true });
mkdirSync(join(outDir, "stage"), { recursive: true });

for (const pkg of PACKAGES) {
  const source = join(root, "packages", pkg);
  const stage = join(outDir, "stage", pkg);
  const manifest = readJson(join(source, "package.json"));
  if (!existsSync(join(source, "dist"))) throw new Error(`packages/${pkg} has no dist/`);
  cpSync(join(source, "dist"), join(stage, "dist"), { recursive: true });
  writeFileSync(join(stage, "package.json"), JSON.stringify(packedManifest(manifest, version), null, 2) + "\n");
  execSync(`npm pack "${stage}" --pack-destination "${outDir}"`, { stdio: ["ignore", "ignore", "inherit"] });
  console.log(`packed ${tarballName(manifest.name, version)}`);
}
rmSync(join(outDir, "stage"), { recursive: true, force: true });
console.log(`${local ? "Local" : "Release"} tarballs for ${version} in .release/`);
