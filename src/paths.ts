import { join } from "node:path";

export const VIBE_DIR = ".vibe";
export const STATE_FILE = "vibe-state.json";
export const POLICY_FILE = "policy.json";
export const CANDIDATES_FILE = "candidates.fake.json";
export const DECISION_FILE = "last-decision.json";
export const ADAPTER_LOG_FILE = "adapter-log.jsonl";

export function vibePath(...parts: string[]): string {
  return join(process.cwd(), VIBE_DIR, ...parts);
}
