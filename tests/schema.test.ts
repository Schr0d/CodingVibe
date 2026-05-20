import { describe, expect, it } from "vitest";
import { validateWorkflowState } from "../src/schema/validate-state.js";
import minState from "../examples/workflow-state.min.json" with { type: "json" };
import fullState from "../examples/workflow-state.full.json" with { type: "json" };

describe("workflow-state schema", () => {
  it("accepts the minimal example", () => {
    expect(validateWorkflowState(minState)).toEqual({ ok: true, errors: [] });
  });

  it("accepts the full example", () => {
    expect(validateWorkflowState(fullState)).toEqual({ ok: true, errors: [] });
  });

  it("rejects missing required fields", () => {
    const result = validateWorkflowState({ ...minState, workflow: undefined });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.join("\n")).toContain("workflow");
    }
  });

  it("rejects unsupported major versions", () => {
    const result = validateWorkflowState({ ...minState, schema_version: "2.0.0" });

    expect(result.ok).toBe(false);
  });

  it("allows unknown same-major fields", () => {
    const result = validateWorkflowState({ ...minState, extra_future_field: true });

    expect(result).toEqual({ ok: true, errors: [] });
  });
});
