import { readFile } from "node:fs/promises";
import { validateWorkflowState } from "../schema/validate-state.js";

export async function validateCommand(filePath: string): Promise<void> {
  let parsed: unknown;

  try {
    const raw = await readFile(filePath, "utf8");
    parsed = JSON.parse(raw);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Could not read valid JSON from ${filePath}: ${message}`);
  }

  const result = validateWorkflowState(parsed);

  if (!result.ok) {
    throw new Error(`Invalid workflow state:\n${result.errors.map((line) => `- ${line}`).join("\n")}`);
  }

  console.log(`Valid workflow state: ${filePath}`);
}
