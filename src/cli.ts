#!/usr/bin/env node
import { Command } from "commander";
import { validateCommand } from "./commands/validate.js";
import { mcpCommand } from "./commands/mcp.js";
import { initCommand } from "./commands/init.js";
import { devCommand } from "./commands/dev.js";
import { stateCommand } from "./commands/state.js";
import { explainCommand } from "./commands/explain.js";
import { spotifyCommand } from "./commands/spotify.js";
import { neteaseCommand } from "./commands/netease.js";
import { providerCommand } from "./commands/provider.js";
import { daemonCommand } from "./commands/daemon.js";
import { setupCommand } from "./commands/setup.js";
import { loginCommand } from "./commands/login.js";

const program = new Command();

program
  .name("vibe")
  .description("Local inspectable workflow-state sidecar for coding agents.")
  .version("0.0.0");

program
  .command("validate")
  .description("Validate a workflow-state JSON file.")
  .argument("<file>", "workflow-state JSON file")
  .action(async (file: string) => {
    await runCommand(() => validateCommand(file));
  });

program
  .command("mcp")
  .description("Start the MCP server.")
  .action(async () => {
    await runCommand(mcpCommand);
  });

program
  .command("spotify")
  .description("Control Spotify with an explicit SPOTIFY_ACCESS_TOKEN. Experimental: no OAuth broker yet.")
  .argument("<action>", "status | pause | next | resume | seed")
  .option("--limit <n>", "candidate count for seed", "5")
  .action(async (action: "status" | "pause" | "next" | "resume" | "seed", options: { limit?: string }) => {
    await runCommand(() => spotifyCommand(action, options));
  });

program
  .command("init")
  .description("Initialize local Coding Vibe config.")
  .action(async () => {
    await runCommand(initCommand);
  });

program
  .command("dev")
  .description("Run fake watcher, policy engine, adapter, and compact TUI.")
  .option("--fake", "use the fake adapter")
  .option("--netease", "use the experimental NetEase adapter")
  .option("--query <text>", "NetEase search query for dev --netease", "ambient focus instrumental")
  .action(async (options: { fake?: boolean; netease?: boolean; query?: string }) => {
    await runCommand(() => devCommand(options));
  });

program
  .command("setup")
  .description("Initialize Coding Vibe and select a local provider.")
  .argument("[provider]", "fake | netease", "fake")
  .option("--query <text>", "NetEase search query", "ambient focus instrumental")
  .action(async (provider: "fake" | "netease", options: { query?: string }) => {
    await runCommand(() => setupCommand(provider, options));
  });

program
  .command("login")
  .description("Login to an experimental provider.")
  .argument("<provider>", "netease")
  .action(async (provider: "netease") => {
    await runCommand(() => loginCommand(provider));
  });

program
  .command("daemon")
  .description("Run the background adapter daemon that consumes MCP workflow state.")
  .option("--interval <ms>", "poll interval in milliseconds", "2000")
  .option("--query <text>", "NetEase search query", "ambient focus instrumental")
  .action(async (options: { interval?: string; query?: string }) => {
    await runCommand(() => daemonCommand(options));
  });

program
  .command("start")
  .description("Start the local adapter daemon.")
  .option("--interval <ms>", "poll interval in milliseconds", "2000")
  .option("--query <text>", "NetEase fallback search query", "ambient focus instrumental")
  .action(async (options: { interval?: string; query?: string }) => {
    await runCommand(() => daemonCommand(options));
  });

program
  .command("state")
  .description("Print current workflow-state summary.")
  .action(async () => {
    await runCommand(stateCommand);
  });

program
  .command("explain")
  .description("Explain latest policy decision.")
  .action(async () => {
    await runCommand(explainCommand);
  });

program
  .command("netease")
  .description("Use the experimental NetEase Cloud Music adapter. Unofficial API; no cookies are persisted.")
  .argument("<action>", "capabilities | search | url | play | seed | login-qr")
  .option("--query <text>", "search query")
  .option("--id <id>", "song id for url")
  .option("--limit <n>", "result count", "5")
  .action(async (action: "capabilities" | "search" | "url" | "play" | "seed" | "login-qr", options: { query?: string; id?: string; limit?: string }) => {
    await runCommand(() => neteaseCommand(action, options));
  });

program
  .command("provider")
  .description("Read or select the local music provider setting.")
  .argument("<action>", "get | set | list | next | volume | query")
  .argument("[value]", "provider name, volume 0-100, or search query")
  .action(async (action: "get" | "set" | "list" | "next" | "volume" | "query", value: string | undefined) => {
    await runCommand(() => providerCommand(action, value));
  });

async function runCommand(command: () => Promise<void>): Promise<void> {
  try {
    await command();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    process.exitCode = 1;
  }
}

program.parseAsync();
