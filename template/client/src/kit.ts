import { configureKit } from "@game-kit/client";
import { CLIENT_KEY_EVENTS } from "@starter-game/protocol";
import { serverUrl } from "./config.ts";

// The game's own client log events go next to the kit's (and into CLIENT_LOG_EVENTS in protocol):
// declare module "@game-kit/client" {
//   interface GameClientLogEvents {
//     "client.something.happened": true;
//   }
// }

/** Tells the game kit's client about Starter Game: storage keys, server, version and key log events. */
export function configureStarterGameKit(): void {
  configureKit({
    storagePrefix: "starter-game",
    serverUrl,
    clientVersion: () => import.meta.env.VITE_APP_VERSION || "dev",
    keyEvents: CLIENT_KEY_EVENTS,
  });
}

configureStarterGameKit();
