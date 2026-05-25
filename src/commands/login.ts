import { neteaseCommand } from "./netease.js";

type LoginProvider = "netease";

export async function loginCommand(provider: LoginProvider): Promise<void> {
  if (provider !== "netease") throw new Error("Only netease login is supported.");
  await neteaseCommand("login-qr", {});
}
