import { describe, expect, it } from "vitest";
import { createFakeState } from "../src/watcher/fake-watcher.js";
import { validateWorkflowState } from "../src/schema/validate-state.js";

describe("fake watcher", () => {
  it("creates valid workflow states", () => {
    for (let index = 0; index < 5; index += 1) {
      expect(validateWorkflowState(createFakeState(index))).toEqual({ ok: true, errors: [] });
    }
  });

  it("cycles through useful workflow modes", () => {
    const modes = new Set(Array.from({ length: 5 }, (_, index) => createFakeState(index).workflow.mode));

    expect(modes).toContain("debugging");
    expect(modes).toContain("waiting_ci");
    expect(modes).toContain("writing");
  });
});
