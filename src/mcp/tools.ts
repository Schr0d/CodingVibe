import { mkdir } from "node:fs/promises";
import { readJson, writeJson } from "../json.js";
import { DECISION_FILE, POLICY_FILE, STATE_FILE, vibePath } from "../paths.js";
import { evaluatePolicy } from "../policy/evaluate-policy.js";
import { atomicWriteJson } from "../state/atomic-write.js";
import { readWorkflowState, summarizeState } from "../state/read-state.js";
import type { PolicyDecision, PolicyFile, WorkflowMode, WorkflowState } from "../types.js";

export const availableVibes: WorkflowMode[] = [
  "unknown",
  "deep_work",
  "planning",
  "debugging",
  "reviewing",
  "writing",
  "waiting_ci",
  "idle"
];

export async function getWorkflowStateText(): Promise<string> {
  const state = await readWorkflowState(vibePath(STATE_FILE));
  return summarizeState(state);
}

export async function explainPolicyText(): Promise<string> {
  let decision: PolicyDecision;

  try {
    decision = await readJson<PolicyDecision>(vibePath(DECISION_FILE));
  } catch {
    const state = await readWorkflowState(vibePath(STATE_FILE));
    const policy = await readJson<PolicyFile>(vibePath(POLICY_FILE));
    decision = evaluatePolicy(policy, state);
    await writeJson(vibePath(DECISION_FILE), decision);
  }

  return [`matched_rule=${decision.matched_rule_id}`, `reason=${decision.reason}`, `action=${decision.adapter_action.kind} mood=${decision.adapter_action.mood}`].join("\n");
}

export function listAvailableVibesText(): string {
  return availableVibes.join("\n");
}

export async function setFakeVibe(vibe: WorkflowMode, reason?: string): Promise<string> {
  if (!availableVibes.includes(vibe)) {
    throw new Error(`Unsupported vibe: ${vibe}`);
  }

  await mkdir(vibePath(), { recursive: true });
  const policy = await readJson<PolicyFile>(vibePath(POLICY_FILE));
  const state: WorkflowState = {
    schema_version: "1.0.0",
    producer: "coding-vibe-mcp",
    generated_at: new Date().toISOString(),
    ttl_ms: 30000,
    workflow: {
      mode: vibe,
      phase: "mcp_set_vibe",
      momentum: "unknown",
      confidence: 1,
      signals: [reason ? `mcp reason: ${sanitizeReason(reason)}` : "mcp set_fake_vibe"]
    },
    safety: {
      redactions_applied: reason ? ["reason_truncated"] : [],
      forbidden_fields_seen: false
    }
  };
  const decision = evaluatePolicy(policy, state);

  await atomicWriteJson(vibePath(STATE_FILE), state);
  await writeJson(vibePath(DECISION_FILE), decision);

  return `set vibe=${vibe}\nmatched_rule=${decision.matched_rule_id}\nreason=${decision.reason}`;
}

function sanitizeReason(reason: string): string {
  return reason.replace(/[\r\n\t]+/g, " ").slice(0, 120);
}
