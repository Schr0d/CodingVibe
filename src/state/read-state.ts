import { readJson } from "../json.js";
import type { WorkflowState } from "../types.js";
import { validateWorkflowState } from "../schema/validate-state.js";

export async function readWorkflowState(filePath: string): Promise<WorkflowState> {
  const state = await readJson<WorkflowState>(filePath);
  const result = validateWorkflowState(state);

  if (!result.ok) {
    throw new Error(`Invalid workflow state:\n${result.errors.map((line) => `- ${line}`).join("\n")}`);
  }

  return state;
}

export function isExpired(state: WorkflowState, now = Date.now()): boolean {
  const generated = Date.parse(state.generated_at);
  return Number.isNaN(generated) || now - generated > state.ttl_ms;
}

export function summarizeState(state: WorkflowState, now = Date.now()): string {
  const ageMs = now - Date.parse(state.generated_at);
  const age = Number.isFinite(ageMs) ? `${Math.max(0, Math.round(ageMs / 1000))}s ago` : "unknown age";
  const redactions = state.safety.redactions_applied.length;
  return `mode=${state.workflow.mode} confidence=${state.workflow.confidence.toFixed(2)} generated=${age} redactions=${redactions}\nsignals: ${state.workflow.signals.join("; ") || "none"}`;
}
