import { spawn } from "node:child_process";

export async function openPath(path: string): Promise<void> {
  const command = commandForPlatform(path);

  await new Promise<void>((resolve, reject) => {
    const child = spawn(command.bin, command.args, { detached: true, stdio: "ignore" });
    child.on("error", reject);
    child.unref();
    resolve();
  });
}

function commandForPlatform(path: string): { bin: string; args: string[] } {
  if (process.platform === "win32") return { bin: "cmd", args: ["/c", "start", "", path] };
  if (process.platform === "darwin") return { bin: "open", args: [path] };
  return { bin: "xdg-open", args: [path] };
}
