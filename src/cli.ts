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
  .action(async (options: { fake?: boolean }) => {
    await runCommand(() => devCommand(options));
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
  .argument("<action>", "capabilities | search | url | play | seed")
  .option("--query <text>", "search query")
  .option("--id <id>", "song id for url")
  .option("--limit <n>", "result count", "5")
  .action(async (action: "capabilities" | "search" | "url" | "play" | "seed", options: { query?: string; id?: string; limit?: string }) => {
    await runCommand(() => neteaseCommand(action, options));
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
