import { KitGameRoom, type GameServerDefinition } from "@game-kit/server";
import { moveSchema, optionsSchema } from "@starter-game/protocol";
import { CELLS, DEFAULT_OPTIONS, starterGameRules, type Game, type Move, type StarterGameOptions } from "@starter-game/rules";
import { StarterGameState } from "./schema/GameState.js";

export { BOT_DELAY_MS, BOT_RUNNER_GRACE_MS, MAX_OPEN_GAMES } from "@game-kit/server";

/** Starter Game's server part of the game contract: the rules, the wire and the synced board. */
export const starterGameServer: GameServerDefinition<Game, Move, StarterGameOptions, StarterGameState> = {
  rules: starterGameRules,
  moveSchema,
  optionsSchema,
  defaultOptions: DEFAULT_OPTIONS,
  Child: StarterGameState,

  /** The waiting room: an empty board. */
  reset(_options, child) {
    child.cells.clear();
    child.cells.push(...Array.from({ length: CELLS }, () => 0));
    child.line.clear();
  },

  /** Mirrors the rules' game: the marks and the winning line. */
  sync({ cells, line }, child) {
    cells.forEach((owner, i) => {
      if (child.cells[i] !== owner) child.cells[i] = owner;
    });
    if (child.line.length !== line.length) {
      child.line.clear();
      child.line.push(...line);
    }
  },

  stateFacts: (child) => ({ marks: child.cells.filter((c) => c !== 0).length }),
};

/**
 * One Starter Game game: a board and two seated players, on the kit's game room. It starts in the
 * waiting room, where players take seats; the host (the first to join) starts the game.
 */
export class GameRoom extends KitGameRoom<Game, Move, StarterGameOptions, StarterGameState> {
  constructor() {
    super(starterGameServer);
  }
}
