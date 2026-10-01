import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/*
 * The kit's boundary, for what lint cannot express: every relative import in a kit package stays
 * inside that package, and the bot library imports no other kit package. (Lint forbids paths three
 * or more levels up.)
 */

const packagesDir = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const kitPackages = readdirSync(packagesDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name);

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name === "node_modules" || entry.name === "dist") return [];
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.tsx?$/.test(entry.name) ? [path] : [];
  });
}

const IMPORT = /(?:from|import)\s*\(?\s*["'](\.{1,2}\/[^"']+)["']/g;

describe("kit boundary", () => {
  it("finds the kit packages", () => {
    expect(kitPackages).toEqual(expect.arrayContaining(["protocol", "server", "client", "bots"]));
  });

  it.each(kitPackages)("%s imports nothing outside itself", (name) => {
    const root = join(packagesDir, name);
    const outside = sourceFiles(root).flatMap((file) =>
      [...readFileSync(file, "utf8").matchAll(IMPORT)]
        .map((m) => m[1]!)
        .filter((spec) => relative(root, resolve(dirname(file), spec)).startsWith(".."))
        .map((spec) => `${relative(root, file)}: ${spec}`),
    );
    expect(outside).toEqual([]);
  });

  it("keeps the bot library free of the other kit packages", () => {
    const root = join(packagesDir, "bots");
    const kitImports = sourceFiles(root).flatMap((file) =>
      [...readFileSync(file, "utf8").matchAll(/(?:from|import)\s*\(?\s*["'](@game-kit\/[^"']+)["']/g)]
        .map((m) => `${relative(root, file)}: ${m[1]}`)
        .filter((line) => !line.includes("@game-kit/bots")),
    );
    expect(kitImports).toEqual([]);
  });
});
