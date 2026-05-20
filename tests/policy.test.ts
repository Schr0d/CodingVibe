import { describe, expect, it } from "vitest";
import policy from "../examples/policy.default.json" with { type: "json" };
import fullState from "../examples/workflow-state.full.json" with { type: "json" };
import minState from "../examples/workflow-state.min.json" with { type: "json" };
import { evaluatePolicy } from "../src/policy/evaluate-policy.js";
import type { PolicyFile, WorkflowState } from "../src/types.js";

describe("policy evaluator", () => {
  it("uses the first matching rule", () => {
    const decision = evaluatePolicy(policy as PolicyFile, fullState as WorkflowState);

    expect(decision.matched_rule_id).toBe("debugging-caution");
    expect(decision.adapter_action.mood).toBe("low_distraction");
  });

  it("uses fallback when no workflow rule matches", () => {
    const decision = evaluatePolicy(policy as PolicyFile, minState as WorkflowState);

    expect(decision.matched_rule_id).toBe("fallback");
    expect(decision.adapter_action.mood).toBe("neutral_focus");
  });

  it("requires a fallback rule", () => {
    expect(() => evaluatePolicy({ rules: [] }, minState as WorkflowState)).toThrow("fallback");
  });
});
