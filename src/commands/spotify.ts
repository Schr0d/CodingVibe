import { createSpotifyAdapterFromEnv } from "../adapters/spotify-adapter.js";

type SpotifyAction = "status" | "pause" | "next" | "resume" | "seed";

export async function spotifyCommand(action: SpotifyAction, options: { limit?: string }): Promise<void> {
  const adapter = createSpotifyAdapterFromEnv();

  if (action === "status") {
    const status = await adapter.status();
    console.log(`provider=${status.provider}`);
    console.log(`device=${status.device}`);
    console.log(`playing=${status.playing}`);
    console.log(`item=${status.item}`);
    return;
  }

  if (action === "pause") {
    await adapter.pause();
    console.log("spotify paused");
    return;
  }

  if (action === "next") {
    await adapter.next();
    console.log("spotify skipped to next");
    return;
  }

  if (action === "resume") {
    await adapter.resume();
    console.log("spotify resumed");
    return;
  }

  if (action === "seed") {
    const limit = Number.parseInt(options.limit ?? "5", 10);
    const candidates = await adapter.personalizedSeed(Number.isFinite(limit) ? limit : 5);
    console.log(JSON.stringify({ candidates }, null, 2));
  }
}
