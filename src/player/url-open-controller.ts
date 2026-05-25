import { spawn } from "node:child_process";
import type { Playable, PlaybackController } from "../spi/music-provider.js";

export class UrlOpenController implements PlaybackController {
  readonly id = "url-open";

  supports(playable: Playable): boolean {
    return playable.kind === "url" && isHttpUrl(playable.url) && playable.previewOnly !== true;
  }

  async play(playable: Playable): Promise<void> {
    if (playable.kind !== "url") {
      throw new Error("url-open controller only supports URL playables.");
    }

    if (playable.previewOnly) {
      throw new Error(`Refusing to open preview-only playable ${playable.id}.`);
    }

    if (!isHttpUrl(playable.url)) {
      throw new Error("Refusing to open non-http playback URL.");
    }

    const command = commandForPlatform(playable.url);
    await new Promise<void>((resolve, reject) => {
      const child = spawn(command.bin, command.args, { detached: true, stdio: "ignore" });
      child.on("error", reject);
      child.unref();
      resolve();
    });
  }
}

function isHttpUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function commandForPlatform(url: string): { bin: string; args: string[] } {
  if (process.platform === "win32") return { bin: "cmd", args: ["/c", "start", "", url] };
  if (process.platform === "darwin") return { bin: "open", args: [url] };
  return { bin: "xdg-open", args: [url] };
}
