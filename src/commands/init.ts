import { mkdir, writeFile } from "node:fs/promises";
import minState from "../../examples/workflow-state.min.json" with { type: "json" };
import policy from "../../examples/policy.default.json" with { type: "json" };
import candidates from "../../examples/candidates.fake.json" with { type: "json" };
import { CANDIDATES_FILE, POLICY_FILE, STATE_FILE, VIBE_DIR, vibePath } from "../paths.js";
import { writeJson } from "../json.js";

export async function initCommand(): Promise<void> {
  await mkdir(vibePath(), { recursive: true });
  await writeJson(vibePath(POLICY_FILE), policy);
  await writeJson(vibePath(CANDIDATES_FILE), candidates);
  await writeJson(vibePath(STATE_FILE), { ...minState, generated_at: new Date().toISOString() });
  await writeFile(vibePath("README.txt"), "Coding Vibe local state. This directory is gitignored by default.\n", "utf8");

  console.log(`Initialized ${VIBE_DIR}/`);
  console.log(`- ${POLICY_FILE}`);
  console.log(`- ${CANDIDATES_FILE}`);
  console.log(`- ${STATE_FILE}`);
}
