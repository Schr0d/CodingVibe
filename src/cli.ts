#!/usr/bin/env node
import { Command } from "commander";
import { validateCommand } from "./commands/validate.js";
import { mcpCommand } from "./commands/mcp.js";
import { initCommand } from "./commands/init.js";
import { devCommand } from "./commands/dev.js";
import { stateCommand } from "./commands/state.js";
import { explainCommand } from "./commands/explain.js";

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
  .command("init")
  .description("Initialize local vibe-sidecar config.")
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
