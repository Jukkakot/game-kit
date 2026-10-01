// Keeps template/ working (README → Start a new game): generates a game from it against this
// checkout's packages and runs the game's check chain and E2E smoke. The kit CI's `template` job
// runs the same.
//
//   npm run template:check [-- --dir <path>] [--skip-e2e]
//
// The generated game's lint runs as plain oxlint: `tools/kit/check.mjs` refuses a local kit on
// purpose, and this check uses one.
import { execSync } from "node:child_process";
import { rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

const KIT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const { values } = parseArgs({ options: { dir: { type: "string" }, "skip-e2e": { type: "boolean", default: false } } });
const dir = resolve(values.dir ?? join(process.env.RUNNER_TEMP ?? tmpdir(), "ci-game"));

const run = (command, cwd = dir) => {
  console.log(`\n> ${command}`);
  execSync(command, { cwd, stdio: "inherit" });
};

rmSync(dir, { recursive: true, force: true });
run(`node tools/create-game.mjs ci-game --port 2700 --dir "${dir}" --kit local`, KIT);
run("npx oxlint");
run("npm run typecheck");
run("npm test");
run("npm run build");
run("npm run size -w @ci-game/client");
if (!values["skip-e2e"]) {
  run(`npx -w @ci-game/e2e playwright install${process.env.CI ? " --with-deps" : ""} chromium`);
  run("npm run e2e");
}
console.log(`\nTemplate check passed (${dir}).`);
