import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import policy from "../examples/policy.default.json" with { type: "json" };
import state from "../examples/workflow-state.full.json" with { type: "json" };
import { explainPolicyText, getWorkflowStateText, listAvailableVibesText, setFakeVibe } from "../src/mcp/tools.js";

let originalCwd: string;
let tempDir: string;

beforeEach(async () => {
  originalCwd = process.cwd();
  tempDir = await mkdtemp(join(tmpdir(), "vibe-mcp-test-"));
  process.chdir(tempDir);
  await writeFile("package.json", "{}", "utf8");
  await import("node:fs/promises").then(async ({ mkdir }) => mkdir(".vibe"));
  await writeFile(".vibe/policy.json", JSON.stringify(policy), "utf8");
  await writeFile(".vibe/vibe-state.json", JSON.stringify({ ...state, generated_at: new Date().toISOString() }), "utf8");
});

afterEach(async () => {
  process.chdir(originalCwd);
  await rm(tempDir, { recursive: true, force: true });
});

describe("MCP safe tools", () => {
  it("lists available vibes", () => {
    expect(listAvailableVibesText()).toContain("debugging");
    expect(listAvailableVibesText()).toContain("waiting_ci");
  });

  it("reads workflow state as a summary", async () => {
    const text = await getWorkflowStateText();

    expect(text).toContain("mode=debugging");
    expect(text).toContain("signals:");
  });

  it("sets a fake vibe and writes a policy decision", async () => {
    const text = await setFakeVibe("waiting_ci", "CI is running");
    const explanation = await explainPolicyText();

    expect(text).toContain("set vibe=waiting_ci");
    expect(explanation).toContain("matched_rule=waiting-ci");
  });
});
