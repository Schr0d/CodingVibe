import { createNetEaseAdapterFromEnv } from "../adapters/netease-adapter.js";
import { openUrl } from "../player/open-url.js";

type NetEaseAction = "search" | "url" | "play" | "seed" | "capabilities";

export async function neteaseCommand(action: NetEaseAction, options: { query?: string; id?: string; limit?: string }): Promise<void> {
  const adapter = createNetEaseAdapterFromEnv();

  if (action === "capabilities") {
    console.log(adapter.capabilities().join("\n"));
    return;
  }

  if (action === "search") {
    if (!options.query) throw new Error("--query is required for netease search.");
    const results = await adapter.search(options.query, parseLimit(options.limit));
    console.log(JSON.stringify({ results }, null, 2));
    return;
  }

  if (action === "url") {
    if (!options.id) throw new Error("--id is required for netease url.");
    console.log(JSON.stringify(await adapter.songUrl(options.id), null, 2));
    return;
  }

  if (action === "play") {
    const result = options.id ? await adapter.songUrl(options.id) : await playableFromQuery(adapter, options.query, parseLimit(options.limit));
    if (!result) throw new Error("--id or --query is required for netease play.");

    if (!result.playable || !result.url) throw new Error(`NetEase song ${result.id} did not return a playable URL.`);
    if (result.preview_only) {
      throw new Error(`NetEase song ${result.id} appears to be preview-only. Try setting NETEASE_COOKIE or choosing another song.`);
    }

    await openUrl(result.url);
    console.log(`opened netease song ${result.id}`);
    return;
  }

  if (action === "seed") {
    console.log(JSON.stringify({ candidates: await adapter.seed(parseLimit(options.limit)) }, null, 2));
  }
}

async function playableFromQuery(adapter: ReturnType<typeof createNetEaseAdapterFromEnv>, query: string | undefined, limit: number) {
  if (!query) return undefined;
  return adapter.firstPlayableFromSearch(query, limit);
}

function parseLimit(limit: string | undefined): number {
  const parsed = Number.parseInt(limit ?? "5", 10);
  if (!Number.isFinite(parsed)) return 5;
  return Math.min(Math.max(parsed, 1), 20);
}
