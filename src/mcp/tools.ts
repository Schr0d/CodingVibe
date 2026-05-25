import { mkdir } from "node:fs/promises";
import { readJson, writeJson } from "../json.js";
import { DECISION_FILE, PLAYER_COMMAND_FILE, POLICY_FILE, PROVIDER_SETTINGS_FILE, STATE_FILE, vibePath } from "../paths.js";
import { evaluatePolicy } from "../policy/evaluate-policy.js";
import { atomicWriteJson } from "../state/atomic-write.js";
import { readWorkflowState, summarizeState } from "../state/read-state.js";
import type { PolicyDecision, PolicyFile, WorkflowMode, WorkflowState } from "../types.js";

export const availableVibes: WorkflowMode[] = [
  "unknown",
  "deep_work",
  "planning",
  "debugging",
  "reviewing",
  "writing",
  "waiting_ci",
  "idle"
];

export type MusicProviderSetting = "fake" | "netease";

export const availableMusicProviders: MusicProviderSetting[] = ["fake", "netease"];

type ProviderSettings = {
  active_provider: MusicProviderSetting;
  netease_query?: string;
  updated_at: string;
  source: "mcp" | "cli" | "default";
};

type PlayerCommand =
  | { command: "next"; requested_at: string; source: "mcp" | "cli" }
  | { command: "volume"; value: number; requested_at: string; source: "mcp" | "cli" }
  | { command: "query"; query: string; requested_at: string; source: "mcp" | "cli" };

export async function getWorkflowStateText(): Promise<string> {
  const state = await readWorkflowState(vibePath(STATE_FILE));
  return summarizeState(state);
}

export async function explainPolicyText(): Promise<string> {
  let decision: PolicyDecision;

  try {
    decision = await readJson<PolicyDecision>(vibePath(DECISION_FILE));
  } catch {
    const state = await readWorkflowState(vibePath(STATE_FILE));
    const policy = await readJson<PolicyFile>(vibePath(POLICY_FILE));
    decision = evaluatePolicy(policy, state);
    await writeJson(vibePath(DECISION_FILE), decision);
  }

  return [`matched_rule=${decision.matched_rule_id}`, `reason=${decision.reason}`, `action=${decision.adapter_action.kind} mood=${decision.adapter_action.mood}`].join("\n");
}

export function listAvailableVibesText(): string {
  return availableVibes.join("\n");
}

export async function getMusicProviderText(): Promise<string> {
  const settings = await readProviderSettings();
  return [`active_provider=${settings.active_provider}`, `netease_query=${settings.netease_query ?? "ambient focus instrumental"}`, `available=${availableMusicProviders.join(",")}`].join("\n");
}

export async function setMusicProvider(provider: MusicProviderSetting, source: "mcp" | "cli" = "mcp"): Promise<string> {
  if (!availableMusicProviders.includes(provider)) {
    throw new Error(`Unsupported music provider: ${provider}`);
  }

  const current = await readProviderSettings();
  await writeProviderSettings({
    ...current,
    active_provider: provider,
    updated_at: new Date().toISOString(),
    source
  });

  return `set music_provider=${provider}\navailable=${availableMusicProviders.join(",")}`;
}

export async function readActiveMusicProvider(): Promise<MusicProviderSetting> {
  return (await readProviderSettings()).active_provider;
}

export async function readMusicProviderSettings(): Promise<ProviderSettings> {
  return readProviderSettings();
}

export async function setMusicQuery(query: string, source: "mcp" | "cli" = "mcp"): Promise<string> {
  const sanitized = sanitizeReason(query);
  if (!sanitized) throw new Error("Music query cannot be empty.");
  const settings = await readProviderSettings();
  await writeProviderSettings({ ...settings, netease_query: sanitized, updated_at: new Date().toISOString(), source });
  await writePlayerCommand({ command: "query", query: sanitized, requested_at: new Date().toISOString(), source });
  return `set music_query=${sanitized}`;
}

export async function requestNextTrack(source: "mcp" | "cli" = "mcp"): Promise<string> {
  await writePlayerCommand({ command: "next", requested_at: new Date().toISOString(), source });
  return "requested player_command=next";
}

export async function requestVolume(volume: number, source: "mcp" | "cli" = "mcp"): Promise<string> {
  const clamped = Math.min(Math.max(Math.round(volume), 0), 100);
  await writePlayerCommand({ command: "volume", value: clamped, requested_at: new Date().toISOString(), source });
  return `requested player_command=volume value=${clamped}`;
}

export async function setVibe(vibe: WorkflowMode, reason?: string): Promise<string> {
  if (!availableVibes.includes(vibe)) {
    throw new Error(`Unsupported vibe: ${vibe}`);
  }

  await mkdir(vibePath(), { recursive: true });
  const policy = await readJson<PolicyFile>(vibePath(POLICY_FILE));
  const state: WorkflowState = {
    schema_version: "1.0.0",
    producer: "coding-vibe-mcp",
    generated_at: new Date().toISOString(),
    ttl_ms: 30000,
    workflow: {
      mode: vibe,
      phase: "mcp_set_vibe",
      momentum: "unknown",
      confidence: 1,
      signals: [reason ? `mcp reason: ${sanitizeReason(reason)}` : "mcp set_vibe"]
    },
    safety: {
      redactions_applied: reason ? ["reason_truncated"] : [],
      forbidden_fields_seen: false
    }
  };
  const decision = evaluatePolicy(policy, state);

  await atomicWriteJson(vibePath(STATE_FILE), state);
  await writeJson(vibePath(DECISION_FILE), decision);

  return `set vibe=${vibe}\nmatched_rule=${decision.matched_rule_id}\nreason=${decision.reason}`;
}

export async function setFakeVibe(vibe: WorkflowMode, reason?: string): Promise<string> {
  return setVibe(vibe, reason);
}

async function readProviderSettings(): Promise<ProviderSettings> {
  try {
    const settings = await readJson<Partial<ProviderSettings>>(vibePath(PROVIDER_SETTINGS_FILE));
    if (settings.active_provider && availableMusicProviders.includes(settings.active_provider)) {
      return {
        active_provider: settings.active_provider,
        netease_query: typeof settings.netease_query === "string" && settings.netease_query.length > 0 ? settings.netease_query : undefined,
        updated_at: typeof settings.updated_at === "string" ? settings.updated_at : new Date(0).toISOString(),
        source: settings.source === "mcp" || settings.source === "cli" ? settings.source : "default"
      };
    }
  } catch {
    // Missing or invalid settings should degrade to the local fake provider.
  }

  return { active_provider: "fake", updated_at: new Date(0).toISOString(), source: "default" };
}

async function writeProviderSettings(settings: ProviderSettings): Promise<void> {
  await mkdir(vibePath(), { recursive: true });
  await writeJson(vibePath(PROVIDER_SETTINGS_FILE), settings);
}

async function writePlayerCommand(command: PlayerCommand): Promise<void> {
  await mkdir(vibePath(), { recursive: true });
  await writeJson(vibePath(PLAYER_COMMAND_FILE), command);
}

function sanitizeReason(reason: string): string {
  return reason.replace(/[\r\n\t]+/g, " ").slice(0, 120);
}
