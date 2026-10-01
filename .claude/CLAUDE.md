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
