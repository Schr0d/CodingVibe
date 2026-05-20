import type { WorkflowState } from "../types.js";

const modes: Array<WorkflowState["workflow"]> = [
  {
    mode: "planning",
    phase: "reading_plan",
    momentum: "moving",
    confidence: 0.64,
    signals: ["plan file active", "no test failures"]
  },
  {
    mode: "debugging",
    phase: "test_failed",
    momentum: "blocked",
    confidence: 0.78,
    signals: ["tests failed twice", "same module edited repeatedly"]
  },
  {
    mode: "waiting_ci",
    phase: "ci_running",
    momentum: "waiting",
    confidence: 0.72,
    signals: ["checks running", "no input for 5min"]
  },
  {
    mode: "writing",
    phase: "docs_active",
    momentum: "moving",
    confidence: 0.69,
    signals: ["documentation files active", "steady edits"]
  },
  {
    mode: "deep_work",
    phase: "refactor",
    momentum: "moving",
    confidence: 0.74,
    signals: ["large refactor detected", "multiple related files changed"]
  }
];

export function createFakeState(index: number, now = new Date()): WorkflowState {
  return {
    schema_version: "1.0.0",
    producer: "coding-vibe",
    generated_at: now.toISOString(),
    ttl_ms: 30000,
    workflow: modes[index % modes.length],
    safety: {
      redactions_applied: [],
      forbidden_fields_seen: false
    }
  };
}
