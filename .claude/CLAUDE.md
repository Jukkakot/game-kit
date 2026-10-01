# game-kit – working instructions

Shared kit for the browser games; see [README.md](../README.md). Changes to the kit are specced in
the game repo that needs them (for now Palikka's OpenSpec), then made here.

- Check chain before every commit: `npm run check`.
- Boundary: no package imports a game, and no relative import leaves its package (lint and
  `packages/protocol/test/boundary.test.ts`). `@game-kit/bots` imports no other kit package.
  Every test runs over the Connect Four test game (`@game-kit/protocol/testing`).
- Keep names generic: no game names in code, tests or docs.
- Commit and push to `main` yourself. Release with `npm run release -- <version>` when a game needs
  the change; one version for all packages, never re-tag.
- A kit API change breaks the games on their next `kit:use`: say so in the commit and fix the
  games in the same piece of work.

## Template

- `template/` is a whole game project with placeholder names (README → Start a new game);
  `npm run create-game` copies it. It is outside the kit's workspaces, lint and typecheck: check it
  with `npm run template:check` (CI job `template`, about the length of a game's CI).
- Upkeep: a generic improvement made in a game (a CI step, a screen fix, a doc rule) is ported to
  `template/` in the same piece of work when cheap, otherwise noted as a kit TODO in the game's
  `tasks.md`. A kit API change updates `template/` in the same commit.
- Hot spots that follow the kit's API: `template/client/src/session/` (client definition, session,
  view model), `template/server/src/rooms/`, `template/packages/rules/src/contract.ts`,
  `template/packages/starter-game-bots/src/`. Never write a real game's name into the template
  (the leftover check refuses Palikka, Kuura and Labyrinth).
