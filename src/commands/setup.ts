import { access } from "node:fs/promises";
import { initCommand } from "./init.js";
import { setMusicProvider, setMusicQuery, type MusicProviderSetting } from "../mcp/tools.js";
import { vibePath } from "../paths.js";

type SetupOptions = {
  query?: string;
};

export async function setupCommand(provider: MusicProviderSetting = "fake", options: SetupOptions = {}): Promise<void> {
  await ensureInitialized();
  console.log(await setMusicProvider(provider, "cli"));

  if (provider === "netease" && options.query) {
    console.log(await setMusicQuery(options.query, "cli"));
  }

  console.log("ready");
  if (provider === "netease") {
    console.log("next: node dist/cli.js login netease");
    console.log("then: node dist/cli.js start");
  } else {
    console.log("next: node dist/cli.js start");
  }
}

async function ensureInitialized(): Promise<void> {
  try {
    await access(vibePath("policy.json"));
  } catch {
    await initCommand();
  }
}
