import { mkdir } from "node:fs/promises";
import { FakeAdapter } from "../adapters/fake-adapter.js";
import { readJson, writeJson } from "../json.js";
import { ADAPTER_LOG_FILE, CANDIDATES_FILE, DECISION_FILE, POLICY_FILE, STATE_FILE, vibePath } from "../paths.js";
import { evaluatePolicy } from "../policy/evaluate-policy.js";
import { atomicWriteJson } from "../state/atomic-write.js";
import type { CandidateFile, PolicyDecision, PolicyFile, SafeCandidate, WorkflowState } from "../types.js";
import { createFakeState } from "../watcher/fake-watcher.js";

type DevOptions = {
  fake?: boolean;
};

type DevRuntime = {
  state: WorkflowState;
  decision: PolicyDecision;
  candidate: SafeCandidate;
  settingsOpen: boolean;
};

export async function devCommand(options: DevOptions): Promise<void> {
  if (!options.fake) {
    throw new Error("V1 only supports dev --fake.");
  }

  await mkdir(vibePath(), { recursive: true });

  const policy = await readJson<PolicyFile>(vibePath(POLICY_FILE));
  const candidates = await readJson<CandidateFile>(vibePath(CANDIDATES_FILE));
  const adapter = new FakeAdapter(candidates, vibePath(ADAPTER_LOG_FILE));
  let tick = 0;
  let runtime = await updateRuntime(tick, policy, adapter);
  render(runtime, adapter.isPlaying());

  const interval = setInterval(async () => {
    tick += 1;
    runtime = await updateRuntime(tick, policy, adapter);
    render(runtime, adapter.isPlaying());
  }, 5000);

  process.stdin.setRawMode?.(true);
  process.stdin.resume();
  process.stdin.setEncoding("utf8");

  process.stdin.on("data", async (key) => {
    if (key === "q" || key === "\u0003") {
      clearInterval(interval);
      process.stdin.setRawMode?.(false);
      process.stdout.write("\n");
      process.exit(0);
    }

    if (key === " ") adapter.togglePlay();
    if (key === "n") runtime.candidate = adapter.next(runtime.state);
    if (key === ",") runtime.settingsOpen = !runtime.settingsOpen;
    if (key === "e") renderExplain(runtime);
    if (key === "s") renderState(runtime.state);

    await adapter.logDecision(runtime.state, runtime.decision, runtime.candidate);
    render(runtime, adapter.isPlaying());
  });
}

async function updateRuntime(tick: number, policy: PolicyFile, adapter: FakeAdapter): Promise<DevRuntime> {
  const state = createFakeState(tick);
  const decision = evaluatePolicy(policy, state);
  const candidate = adapter.currentCandidate(state);
  await atomicWriteJson(vibePath(STATE_FILE), state);
  await writeJson(vibePath(DECISION_FILE), decision);
  await adapter.logDecision(state, decision, candidate);
  return { state, decision, candidate, settingsOpen: false };
}

function render(runtime: DevRuntime, playing: boolean): void {
  const state = runtime.state.workflow;
  const playState = playing ? "playing" : "paused";
  const line1 = `${state.mode}  ${state.confidence.toFixed(2)}  ${state.momentum ?? "unknown"}  fake:${playState}`;
  const line2 = `now ${runtime.decision.adapter_action.mood}  ${runtime.candidate.id}`;
  process.stdout.write("\x1Bc");
  process.stdout.write(`┌─ Vibe ─────────────────────────────────┐\n`);
  process.stdout.write(`│ ${pad(line1, 38)} │\n`);
  process.stdout.write(`│ ${pad(line2, 38)} │\n`);
  process.stdout.write(`│ ${pad("space play/pause  n next  , settings", 38)} │\n`);
  process.stdout.write(`└────────────────────────────────────────┘\n`);

  if (runtime.settingsOpen) renderSettings();
}

function renderSettings(): void {
  process.stdout.write(`┌─ Settings ───────────────┐\n`);
  process.stdout.write(`│ adapter   fake           │\n`);
  process.stdout.write(`│ volume    simulated      │\n`);
  process.stdout.write(`│ mode      compact        │\n`);
  process.stdout.write(`│ privacy   strict         │\n`);
  process.stdout.write(`│ , close                  │\n`);
  process.stdout.write(`└──────────────────────────┘\n`);
}

function renderExplain(runtime: DevRuntime): void {
  process.stdout.write("\n");
  process.stdout.write(`matched_rule=${runtime.decision.matched_rule_id}\n`);
  process.stdout.write(`reason=${runtime.decision.reason}\n`);
  process.stdout.write(`candidate=${runtime.candidate.id}\n`);
}

function renderState(state: WorkflowState): void {
  process.stdout.write("\n");
  process.stdout.write(JSON.stringify(state, null, 2));
  process.stdout.write("\n");
}

function pad(value: string, length: number): string {
  return value.length > length ? value.slice(0, length) : value.padEnd(length, " ");
}
