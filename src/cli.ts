#!/usr/bin/env node
import { Command } from "commander";
import { validateCommand } from "./commands/validate.js";
import { mcpCommand } from "./commands/mcp.js";

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
  .description("Initialize local vibe-sidecar config. Planned for the next implementation slice.")
  .action(() => {
    console.log("vibe init is planned for the next implementation slice.");
  });

program
  .command("dev")
  .description("Run fake watcher, policy engine, adapter, and compact TUI. Planned for the next implementation slice.")
  .option("--fake", "use the fake adapter")
  .action(() => {
    console.log("vibe dev --fake is planned for the next implementation slice.");
  });

program
  .command("state")
  .description("Print current workflow-state summary. Planned for the next implementation slice.")
  .action(() => {
    console.log("vibe state is planned for the next implementation slice.");
  });

program
  .command("explain")
  .description("Explain latest policy decision. Planned for the next implementation slice.")
  .action(() => {
    console.log("vibe explain is planned for the next implementation slice.");
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
