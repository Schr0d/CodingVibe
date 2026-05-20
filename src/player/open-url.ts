import { spawn } from "node:child_process";

export async function openUrl(url: string): Promise<void> {
  const parsed = new URL(url);

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Refusing to open non-http playback URL.");
  }

  const command = commandForPlatform(url);

  await new Promise<void>((resolve, reject) => {
    const child = spawn(command.bin, command.args, { detached: true, stdio: "ignore" });
    child.on("error", reject);
    child.unref();
    resolve();
  });
}

function commandForPlatform(url: string): { bin: string; args: string[] } {
  if (process.platform === "win32") return { bin: "cmd", args: ["/c", "start", "", url] };
  if (process.platform === "darwin") return { bin: "open", args: [url] };
  return { bin: "xdg-open", args: [url] };
}
