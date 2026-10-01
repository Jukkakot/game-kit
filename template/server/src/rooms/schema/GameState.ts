import { schema, t, type SchemaType } from "@colyseus/schema";
import type { LobbyState } from "@game-kit/server";

/** Starter Game's synced game data: `state.game` in the kit's lobby state. */
export const StarterGameState = schema({
  /** The mark of every cell (0 = empty, else the seat), row-major, 3×3. */
  cells: t.array("uint8"),
  /** The winning line's cells once someone has three in a row; empty otherwise. */
  line: t.array("uint8"),
});
export type StarterGameState = SchemaType<typeof StarterGameState>;

/** The whole synced state of a Starter Game room. */
export type GameState = LobbyState<StarterGameState>;
