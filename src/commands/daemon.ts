import { mkdir } from "node:fs/promises";
import { FakeAdapter } from "../adapters/fake-adapter.js";
import { createNetEaseAdapterFromEnv } from "../adapters/netease-adapter.js";
import { NetEaseTuiAdapter } from "../adapters/netease-tui-adapter.js";
import { readJson, writeJson } from "../json.js";
import { readMusicProviderSettings, type MusicProviderSetting } from "../mcp/tools.js";
import { ADAPTER_LOG_FILE, CANDIDATES_FILE, DECISION_FILE, PLAYER_COMMAND_FILE, POLICY_FILE, STATE_FILE, vibePath } from "../paths.js";
import { evaluatePolicy } from "../policy/evaluate-policy.js";
import { readWorkflowState, isExpired } from "../state/read-state.js";
import type { CandidateFile, PolicyFile, SafeCandidate, WorkflowState } from "../types.js";

type DaemonOptions = {
  interval?: string;
  query?: string;
};

type DaemonAdapter = FakeAdapter | NetEaseTuiAdapter;

type RuntimeAdapter = {
  provider: MusicProviderSetting;
  query: string | undefined;
  adapter: DaemonAdapter;
};

type PlayerCommand = { command?: string; value?: number; requested_at?: string };

export async function daemonCommand(options: DaemonOptions): Promise<void> {
  await mkdir(vibePath(), { recursive: true });
  const policy = await readJson<PolicyFile>(vibePath(POLICY_FILE));
  const intervalMs = parseInterval(options.interval);
  let runtime: RuntimeAdapter | undefined;
  let lastSignature = "";
  let lastPlayerCommand = commandId(await readPlayerCommand()) ?? "";
  let tickRunning = false;

  process.stdout.write(`coding-vibe daemon polling every ${intervalMs}ms\n`);

  const stop = async () => {
    await runtime?.adapter.destroy?.();
    process.exit(0);
  };
  process.once("SIGINT", () => void stop());
  process.once("SIGTERM", () => void stop());

  await tick();
  setInterval(() => void tick(), intervalMs);

  async function tick(): Promise<void> {
    if (tickRunning) return;
    tickRunning = true;

    try {
      const settings = await readMusicProviderSettings();
      const query = settings.netease_query ?? options.query;
      runtime = await ensureAdapter(runtime, settings.active_provider, query);
      const state = await readWorkflowState(vibePath(STATE_FILE));

      if (isExpired(state)) {
        if (runtime.adapter.isPlaying()) await runtime.adapter.togglePlay(state);
        return;
      }

      const decision = evaluatePolicy(policy, state);
      let candidate = await runtime.adapter.currentCandidate(state);
      const playerCommand = await readPlayerCommand();
      const playerCommandId = commandId(playerCommand);
      if (playerCommandId && playerCommandId !== lastPlayerCommand) {
        lastPlayerCommand = playerCommandId;
        if (playerCommand?.command === "next") {
          candidate = await runtime.adapter.next(state);
        }
        if (playerCommand?.command === "volume" && typeof playerCommand.value === "number" && "setVolume" in runtime.adapter) {
          await runtime.adapter.setVolume(playerCommand.value);
        }
      }
      await writeJson(vibePath(DECISION_FILE), decision);

      const signature = signatureFor(settings.active_provider, state, candidate.id, runtime.adapter.isPlaying());
      if (signature !== lastSignature) {
        await runtime.adapter.logDecision(state, decision, candidate);
        lastSignature = signature;
      }

      if (!runtime.adapter.isPlaying()) {
        await runtime.adapter.togglePlay(state);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      process.stderr.write(`[daemon] ${message}\n`);
    } finally {
      tickRunning = false;
    }
  }
}

async function readPlayerCommand(): Promise<PlayerCommand | undefined> {
  try {
    return await readJson<PlayerCommand>(vibePath(PLAYER_COMMAND_FILE));
  } catch {
    return undefined;
  }
}

function commandId(command: PlayerCommand | undefined): string | undefined {
  if (!command?.command || typeof command.requested_at !== "string") return undefined;
  return `${command.command}:${command.requested_at}`;
}

async function ensureAdapter(current: RuntimeAdapter | undefined, provider: MusicProviderSetting, query: string | undefined): Promise<RuntimeAdapter> {
  if (current?.provider === provider && current.query === query) return current;

  await current?.adapter.destroy?.();

  if (provider === "netease") {
    return {
      provider,
      query,
      adapter: new NetEaseTuiAdapter(createNetEaseAdapterFromEnv(), vibePath(ADAPTER_LOG_FILE), query)
    };
  }

  const candidates = await readJson<CandidateFile>(vibePath(CANDIDATES_FILE));
  return {
    provider,
    query,
    adapter: new FakeAdapter(candidates, vibePath(ADAPTER_LOG_FILE))
  };
}

function parseInterval(value: string | undefined): number {
  const parsed = Number.parseInt(value ?? "2000", 10);
  if (!Number.isFinite(parsed)) return 2000;
  return Math.min(Math.max(parsed, 500), 60000);
}

function signatureFor(provider: MusicProviderSetting, state: WorkflowState, candidateId: SafeCandidate["id"], playing: boolean): string {
  return [provider, state.generated_at, state.workflow.mode, candidateId, playing ? "playing" : "paused"].join(":");
}
