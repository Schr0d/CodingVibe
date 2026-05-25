import { getMusicProviderText, requestNextTrack, requestVolume, setMusicProvider, setMusicQuery } from "../mcp/tools.js";

type ProviderAction = "get" | "set" | "list" | "next" | "volume" | "query";

export async function providerCommand(action: ProviderAction, value?: string): Promise<void> {
  if (action === "get") {
    console.log(await getMusicProviderText());
    return;
  }

  if (action === "list") {
    console.log("fake\nnetease");
    return;
  }

  if (action === "next") {
    console.log(await requestNextTrack("cli"));
    return;
  }

  if (action === "volume") {
    const volume = Number.parseInt(value ?? "", 10);
    if (!Number.isFinite(volume)) throw new Error("volume value is required for provider volume.");
    console.log(await requestVolume(volume, "cli"));
    return;
  }

  if (action === "query") {
    if (!value) throw new Error("query text is required for provider query.");
    console.log(await setMusicQuery(value, "cli"));
    return;
  }

  if (value !== "fake" && value !== "netease") throw new Error("provider must be fake or netease for provider set.");
  console.log(await setMusicProvider(value, "cli"));
}
