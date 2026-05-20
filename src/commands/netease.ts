import { createNetEaseAdapterFromEnv } from "../adapters/netease-adapter.js";

type NetEaseAction = "search" | "url" | "seed" | "capabilities";

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

  if (action === "seed") {
    console.log(JSON.stringify({ candidates: await adapter.seed(parseLimit(options.limit)) }, null, 2));
  }
}

function parseLimit(limit: string | undefined): number {
  const parsed = Number.parseInt(limit ?? "5", 10);
  if (!Number.isFinite(parsed)) return 5;
  return Math.min(Math.max(parsed, 1), 20);
}
