# game-kit

Shared pieces for turn-based browser games (Colyseus server, React client, bots in a Web Worker).
A game implements the **game contract**; the kit runs everything around it.

| Package | What |
|---|---|
| `@game-kit/protocol` | The contract's rules part (`GameRules`: seats, start, turn, play, end, fallback move …), generic codes, payloads and their zod schemas, turn rules, client log events. `@game-kit/protocol/testing`: a minimal Connect Four, the kit's own test game. |
| `@game-kit/server` | `LoggedRoom` (readable room ids, one audit line per command), server logging (pino → Axiom), the watch route, and `KitGameRoom`: seats, host, bots and the host's bot runner with a server fallback, turn clock, kick, autoplay, spectators, rematch, options. A game adds its `GameServerDefinition` (move/options schemas, synced child schema). |
| `@game-kit/client` | `useKitSession` (online games), `LocalRoom` (device games with undo and a versioned save), the lobby view, the bot runner, stores, server wake-up, client logging. A game adds its `GameClientDefinition` and calls `configureKit`. |
| `@game-kit/bots` | Game-independent bot brains: a game interface, time/node budgets, greedy, best-reply search and MCTS players, the Web Worker harness (`@game-kit/bots/worker`), tournaments and Elo. No dependencies. |

Peers the game provides (one shared copy): `react`, `colyseus`, `@colyseus/schema`,
`@colyseus/sdk`, `zod`.

## Develop

```sh
npm install
npm run check   # lint, typecheck, test, build
```

Every suite runs over the Connect Four test game; no package knows a real game. Inside this repo
the packages resolve each other's TypeScript source (the `source` export condition), no build
needed.

## Release

```sh
npm run release -- 0.2.0
```

Sets the version in all four packages (one version for all), runs the check chain, commits, tags
`v0.2.0` and pushes. The tag's workflow packs the packages (`npm run pack`: `dist/` only, internal
dependencies pointing at the same release) and attaches the tarballs to the GitHub Release. Never
re-tag: fix forward with a new patch version.

## Start a new game

```sh
npm run create-game -- <kebab-name> --port <server-port> [--title "<UI title>"] [--theme <name>]
                       [--dir <path>] [--kit <version>|local]
```

Copies [`template/`](template/) (a complete game project) to `--dir` (default `../<name>`),
replaces the placeholder names and ports, points the game at a kit release (default: this
checkout's newest `v*` tag; `local` packs this checkout), runs `npm install` and makes the first
commit. Then it prints the next steps and the setup checklist.

- `<kebab-name>`, e.g. `connect-four`: the npm scope (`@connect-four/server`), storage prefix,
  Render service, Axiom dataset, Pages path. `--title` (UI and docs) defaults to the name in title
  case; `--theme` to `Placeholder` until the game's `theme` change.
- `--port` is required: a server port no other game uses (Labyrinth 2567, Palikka 2577, Neljän suora 2587); the
  client gets port + 2606, the preview client + 1.
- It creates nothing outside `--dir`: no GitHub repo, Render service, Axiom dataset or Pages site.
  Those are the generated game's `docs/operations.md` → Setup checklist.
- The new game is ready for spec work: OpenSpec (generic specs of what the kit already does, a
  starter roadmap beginning with `theme`), the docs wiki, `.claude` (autopilot off), CI, deploy,
  E2E smoke and the bot tournament.

The template is written as a game called **Starter Game** (`starter-game`, `starterGame`,
`StarterGame`, ports 2597/5203) playing a placeholder **Ristinolla** (tic-tac-toe) through the
whole game contract: rules, protocol, server definition, client definition and board, bot adapter,
tournament and strength requirement. `create-game` refuses to finish when a placeholder form, a
template port or another game's name is left in the new game.

**Keeping it working:** `npm run template:check` generates a game against this checkout's packages
and runs its lint, typecheck, tests, build, bundle size and E2E smoke; the CI job `template` runs
the same on every push. **Keeping it current:** a generic improvement made in a game is ported to
`template/` in the same piece of work when cheap, otherwise noted as a kit TODO in the game's
`tasks.md`. Existing games are never re-generated.

Later idea: the "as is" client components (ui, settings, motion, generic game controls) are copies
in every game; once two real games share them, they may move to a `@game-kit/ui` package.

## Use in a game

A game depends on the release tarballs, e.g.
`https://github.com/Jukkakot/game-kit/releases/download/v0.1.0/game-kit-server-0.1.0.tgz`, through
its `kit:use` script (Palikka: `tools/kit/use.mjs`):

- `npm run kit:use -- 0.2.0` — switch to a release.
- `npm run kit:use -- local` — use a local checkout at `../game-kit` (runs `npm run pack -- --local`
  there and installs those tarballs) to try kit changes in the game before releasing. Run it again
  after each kit edit; the game's lint refuses to commit a local setup.
