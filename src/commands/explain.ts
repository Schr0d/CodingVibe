import { DECISION_FILE, vibePath } from "../paths.js";
import { readJson } from "../json.js";
import type { PolicyDecision } from "../types.js";

export async function explainCommand(): Promise<void> {
  let decision: PolicyDecision;

  try {
    decision = await readJson<PolicyDecision>(vibePath(DECISION_FILE));
  } catch {
    throw new Error("No policy decision found. Run `vibe dev --fake` first, then try `vibe explain`.");
  }

  console.log(`matched_rule=${decision.matched_rule_id}`);
  console.log(`reason=${decision.reason}`);
  console.log(`action=${decision.adapter_action.kind} mood=${decision.adapter_action.mood}`);
}
