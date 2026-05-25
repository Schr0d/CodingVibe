import { mkdir } from "node:fs/promises";
import { FakeAdapter } from "../adapters/fake-adapter.js";
import { createNetEaseAdapterFromEnv } from "../adapters/netease-adapter.js";
import { NetEaseTuiAdapter } from "../adapters/netease-tui-adapter.js";
import { readJson, writeJson } from "../json.js";
import { readActiveMusicProvider } from "../mcp/tools.js";
import { ADAPTER_LOG_FILE, CANDIDATES_FILE, DECISION_FILE, POLICY_FILE, STATE_FILE, vibePath } from "../paths.js";
import { evaluatePolicy } from "../policy/evaluate-policy.js";
import { atomicWriteJson } from "../state/atomic-write.js";
import type { CandidateFile, PolicyDecision, PolicyFile, SafeCandidate, WorkflowState } from "../types.js";
import { createFakeState } from "../watcher/fake-watcher.js";

type DevOptions = {
  fake?: boolean;
  netease?: boolean;
  query?: string;
};

type DevAdapter = FakeAdapter | NetEaseTuiAdapter;

type DevRuntime = {
  state: WorkflowState;
  decision: PolicyDecision;
  candidate: SafeCandidate;
};

type View = "main" | "settings";

type Settings = {
  adapter: "fake" | "netease";
  volume: "simulated" | "muted";
  mode: "compact" | "expanded";
  privacy: "strict" | "inspect";
};

export async function devCommand(options: DevOptions): Promise<void> {
  const selectedAdapter = await selectAdapter(options);

  await mkdir(vibePath(), { recursive: true });

  const policy = await readJson<PolicyFile>(vibePath(POLICY_FILE));
  const adapter = await createDevAdapter(selectedAdapter, options.query);
  let tick = 0;
  let view: View = "main";
  let selectedSetting = 0;
  const settings: Settings = { adapter: selectedAdapter, volume: "simulated", mode: "compact", privacy: "strict" };
  let runtime = await updateRuntime(tick, policy, adapter);
  render(runtime, adapter.isPlaying(), view, settings, selectedSetting);

  const interval = setInterval(async () => {
    tick += 1;
    runtime = await updateRuntime(tick, policy, adapter);
    render(runtime, adapter.isPlaying(), view, settings, selectedSetting);
  }, 5000);

  process.stdin.setRawMode?.(true);
  process.stdin.resume();
  process.stdin.setEncoding("utf8");

  process.stdin.on("data", async (key) => {
    if (key === "q" || key === "\u0003") {
      clearInterval(interval);
      await adapter.destroy?.();
      process.stdin.setRawMode?.(false);
      process.stdout.write("\n");
      process.exit(0);
    }

    if (key === ",") view = view === "settings" ? "main" : "settings";
    else if (key === "\u001b") view = "main";
    else if (view === "settings") {
      if (key === "\u001b[A" || key === "k") selectedSetting = Math.max(0, selectedSetting - 1);
      if (key === "\u001b[B" || key === "j") selectedSetting = Math.min(3, selectedSetting + 1);
      if (key === "\r" || key === " ") toggleSetting(settings, selectedSetting);
    } else {
      if (key === " ") await adapter.togglePlay(runtime.state);
      if (key === "n") runtime.candidate = await adapter.next(runtime.state);
      if (key === "e") renderExplain(runtime);
      if (key === "s") renderState(runtime.state);
    }

    await adapter.logDecision(runtime.state, runtime.decision, runtime.candidate);
    render(runtime, adapter.isPlaying(), view, settings, selectedSetting);
  });
}

async function selectAdapter(options: DevOptions): Promise<"fake" | "netease"> {
  if (options.fake && options.netease) throw new Error("Choose only one adapter: --fake or --netease.");
  if (options.fake) return "fake";
  if (options.netease) return "netease";
  return readActiveMusicProvider();
}

async function createDevAdapter(selectedAdapter: "fake" | "netease", query: string | undefined): Promise<DevAdapter> {
  if (selectedAdapter === "netease") {
    return new NetEaseTuiAdapter(createNetEaseAdapterFromEnv(), vibePath(ADAPTER_LOG_FILE), query);
  }

  const candidates = await readJson<CandidateFile>(vibePath(CANDIDATES_FILE));
  return new FakeAdapter(candidates, vibePath(ADAPTER_LOG_FILE));
}

async function updateRuntime(tick: number, policy: PolicyFile, adapter: DevAdapter): Promise<DevRuntime> {
  const state = createFakeState(tick);
  const decision = evaluatePolicy(policy, state);
  const candidate = await adapter.currentCandidate(state);
  await atomicWriteJson(vibePath(STATE_FILE), state);
  await writeJson(vibePath(DECISION_FILE), decision);
  await adapter.logDecision(state, decision, candidate);
  return { state, decision, candidate };
}

function render(runtime: DevRuntime, playing: boolean, view: View, settings: Settings, selectedSetting: number): void {
  if (view === "settings") {
    renderSettings(settings, selectedSetting);
    return;
  }

  const state = runtime.state.workflow;
  const playState = playing ? "play" : "pause";
  const line1 = `${state.mode}  ${state.confidence.toFixed(2)}  ${state.momentum ?? "unknown"}  ${settings.adapter}:${playState}`;
  const line2 = `now ${runtime.decision.adapter_action.mood}  ${runtime.candidate.id}`;
  process.stdout.write("\x1Bc");
  process.stdout.write(`┌─ Vibe ─────────────────────────────────┐\n`);
  process.stdout.write(`│ ${pad("/\\  workflow-state sidecar", 38)} │\n`);
  process.stdout.write(`│ ${pad(`\\/  no oauth · ${settings.adapter} adapter`, 38)} │\n`);
  process.stdout.write(`├────────────────────────────────────────┤\n`);
  process.stdout.write(`│ ${pad(line1, 38)} │\n`);
  process.stdout.write(`│ ${pad(line2, 38)} │\n`);
  process.stdout.write(`│ ${pad("space play/pause  n next  , settings", 38)} │\n`);
  process.stdout.write(`└────────────────────────────────────────┘\n`);
}

function renderSettings(settings: Settings, selectedSetting: number): void {
  const rows = [
    ["adapter", settings.adapter, "locked"],
    ["volume", settings.volume, "enter toggle"],
    ["mode", settings.mode, "enter toggle"],
    ["privacy", settings.privacy, "enter toggle"]
  ];

  process.stdout.write("\x1Bc");
  process.stdout.write(`┌─ Settings ─────────────────────────────┐\n`);
  process.stdout.write(`│ ${pad("/\\  settings", 38)} │\n`);
  process.stdout.write(`│ ${pad("\\/  local only", 38)} │\n`);
  process.stdout.write(`├────────────────────────────────────────┤\n`);
  for (const [index, row] of rows.entries()) {
    const cursor = index === selectedSetting ? ">" : " ";
    process.stdout.write(`│ ${pad(`${cursor} ${row[0]}  ${row[1]}  ${row[2]}`, 38)} │\n`);
  }
  process.stdout.write(`│ ${pad("j/k or arrows move  enter toggle", 38)} │\n`);
  process.stdout.write(`│ ${pad(", or esc returns", 38)} │\n`);
  process.stdout.write(`└────────────────────────────────────────┘\n`);
}

function toggleSetting(settings: Settings, selectedSetting: number): void {
  if (selectedSetting === 1) settings.volume = settings.volume === "simulated" ? "muted" : "simulated";
  if (selectedSetting === 2) settings.mode = settings.mode === "compact" ? "expanded" : "compact";
  if (selectedSetting === 3) settings.privacy = settings.privacy === "strict" ? "inspect" : "strict";
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
