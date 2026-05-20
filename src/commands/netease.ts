import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { createNetEaseAdapterFromEnv } from "../adapters/netease-adapter.js";
import { openUrl } from "../player/open-url.js";
import { vibePath } from "../paths.js";

type NetEaseAction = "search" | "url" | "play" | "seed" | "login-qr" | "capabilities";

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

  if (action === "login-qr") {
    const qr = await adapter.createQrLogin();
    console.log("Open this URL or scan it with the NetEase Cloud Music app:");
    console.log(qr.url);
    await openUrl(qr.url);

    const cookie = await waitForQrCookie(adapter, qr.key);
    await writeCookie(cookie);
    console.log("NetEase login saved to .vibe/auth/netease-cookie.txt");
    console.log("Cookie value was not printed. Restart commands will use it after you export NETEASE_COOKIE or after auth-store integration lands.");
    return;
  }

  if (action === "seed") {
    console.log(JSON.stringify({ candidates: await adapter.seed(parseLimit(options.limit)) }, null, 2));
  }
}

async function waitForQrCookie(adapter: ReturnType<typeof createNetEaseAdapterFromEnv>, key: string): Promise<string> {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    const result = await adapter.checkQrLogin(key);

    if (result.code === 803 && result.cookie) return result.cookie;
    if (result.code === 800) throw new Error("NetEase QR login expired. Run netease login-qr again.");
    if (result.code === 801) console.log("Waiting for scan...");
    if (result.code === 802) console.log("Scanned. Confirm login in the NetEase app...");

    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  throw new Error("Timed out waiting for NetEase QR login.");
}

async function writeCookie(cookie: string): Promise<void> {
  const path = vibePath("auth", "netease-cookie.txt");
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, cookie, { encoding: "utf8", mode: 0o600 });
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
