// Creates a new game project from template/ (README → Start a new game).
//
//   npm run create-game -- <kebab-name> --port <server-port> [--title "<UI title>"] [--theme <name>]
//                          [--dir <path>] [--kit <version>|local]
//
// Copies the template, replaces the placeholder names and ports, points the game at a kit release
// (or this checkout with --kit local), installs, and makes the first commit. Creates nothing
// outside --dir: no GitHub repo, no services.
import { execSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { BINARY, CLIENT_PORT_OFFSET, findLeftovers, KNOWN_PORTS, listFiles, nameForms, PLACEHOLDER } from "./template-names.mjs";

const KIT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const TEMPLATE = join(KIT, "template");

function fail(message) {
  console.error(`create-game: ${message}`);
  process.exit(1);
}

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    port: { type: "string" },
    title: { type: "string" },
    theme: { type: "string", default: PLACEHOLDER.theme },
    dir: { type: "string" },
    kit: { type: "string" },
  },
});

const [name, ...extra] = positionals;
const usage = 'usage: npm run create-game -- <kebab-name> --port <server-port> [--title "<UI title>"] [--theme <name>] [--dir <path>] [--kit <version>|local]';
if (!name || extra.length > 0) fail(usage);
if (!/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(name)) fail(`"${name}" is not a kebab-case name (e.g. connect-four)`);

const known = Object.entries(KNOWN_PORTS).map(([game, port]) => `${game} ${port}`).join(", ");
if (values.port === undefined) fail(`--port is required: pick a server port no other game uses (known: ${known}; the client gets port + ${CLIENT_PORT_OFFSET})`);
const port = Number(values.port);
if (!Number.isInteger(port) || port < 1024 || port + CLIENT_PORT_OFFSET + 1 > 65535) fail(`--port must be an integer 1024–${65534 - CLIENT_PORT_OFFSET}, got ${values.port}`);
if (Object.values(KNOWN_PORTS).includes(port)) fail(`port ${port} is taken (known: ${known})`);
if (port === PLACEHOLDER.serverPort) fail(`port ${port} is the template's own; pick another`);
if (!/^[A-Za-z][A-Za-z0-9]*$/.test(values.theme)) fail(`--theme must be one word, got "${values.theme}"`);

const forms = { ...nameForms(name), ...(values.title !== undefined && { title: values.title }) };
const dir = resolve(values.dir ?? join(KIT, "..", name));
if (existsSync(dir) && readdirSync(dir).length > 0) fail(`${dir} exists and is not empty`);

/** The kit version: --kit, else the newest v* tag of this checkout; `local` packs this checkout. */
function kitVersion() {
  if (values.kit === "local") return { spec: "local", label: `${JSON.parse(readFileSync(join(KIT, "packages/protocol/package.json"), "utf8")).version} (local)` };
  const version = values.kit ?? execSync('git tag --list "v*" --sort=-v:refname', { cwd: KIT, encoding: "utf8" }).split("\n")[0]?.trim().replace(/^v/, "");
  if (!version || !/^\d+\.\d+\.\d+$/.test(version)) fail(`--kit must be a version like 0.1.0 or local, got ${values.kit ?? "no v* tag"}`);
  return { spec: version, label: version };
}
const kit = kitVersion();

const clientPort = port + CLIENT_PORT_OFFSET;
const templateClient = PLACEHOLDER.serverPort + CLIENT_PORT_OFFSET;
const replacements = [
  [PLACEHOLDER.kebab, forms.kebab],
  [PLACEHOLDER.camel, forms.camel],
  [PLACEHOLDER.pascal, forms.pascal],
  [PLACEHOLDER.title, forms.title],
  [new RegExp(`\\b${PLACEHOLDER.serverPort}\\b`, "g"), String(port)],
  [new RegExp(`\\b${templateClient}\\b`, "g"), String(clientPort)],
  [new RegExp(`\\b${templateClient + 1}\\b`, "g"), String(clientPort + 1)],
  [new RegExp(`\\b${PLACEHOLDER.theme}\\b`, "g"), values.theme],
];
const replaced = (text) => replacements.reduce((out, [from, to]) => out.replaceAll(from, to), text);

const files = listFiles(TEMPLATE);
for (const file of files) {
  const target = join(dir, replaced(file));
  mkdirSync(dirname(target), { recursive: true });
  if (BINARY.test(file)) copyFileSync(join(TEMPLATE, file), target);
  else writeFileSync(target, replaced(readFileSync(join(TEMPLATE, file), "utf8")));
}
console.log(`Copied ${files.length} files to ${dir}`);

const leftovers = findLeftovers(dir);
if (leftovers.length > 0) fail(`placeholder leftovers in the new game:\n  ${leftovers.join("\n  ")}`);

const run = (command) => execSync(command, { cwd: dir, stdio: "inherit" });
run(kit.spec === "local" ? `npm run kit:use -- local "${KIT}"` : `npm run kit:use -- ${kit.spec}`);

const hasIdentity = (() => {
  try {
    return execSync("git config user.name", { cwd: KIT, encoding: "utf8" }).trim() !== "";
  } catch {
    return false;
  }
})();
const identity = hasIdentity ? "" : '-c user.name="game-kit" -c user.email="game-kit@users.noreply.github.com" ';
run("git init -q -b main");
run("git add -A");
run(`git ${identity}commit -q -m "chore: create ${name} from game-kit template v${kit.label}"`);

console.log(`
${forms.title} is ready in ${dir} (server ${port}, client ${clientPort}, kit ${kit.label}).

Next:
  cd ${dir}
  npm run dev                      then open http://localhost:${clientPort}
  In Claude: /opsx:propose theme   agree the real theme first (openspec/context/roadmap.md)

Setup checklist (docs/operations.md → Setup checklist; each step can wait until you deploy):
  1. GitHub: gh repo create <owner>/${name} --public --source . --push
  2. GitHub Pages: source "GitHub Actions"; repo variable VITE_SERVER_URL = the Render URL
  3. Render: new Blueprint from render.yaml; deploy hook URL into repo secret RENDER_DEPLOY_HOOK_URL;
     check ALLOWED_ORIGINS
  4. Axiom: dataset ${name} (EU); ingest token into Render's AXIOM_TOKEN; import tools/axiom/dashboard.json
  5. Run the prod-smoke workflow once by hand
`);
