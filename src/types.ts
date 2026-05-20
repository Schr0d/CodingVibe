export type WorkflowMode =
  | "unknown"
  | "deep_work"
  | "planning"
  | "debugging"
  | "reviewing"
  | "writing"
  | "waiting_ci"
  | "idle";

export type WorkflowState = {
  schema_version: "1.0.0";
  producer: string;
  generated_at: string;
  ttl_ms: number;
  workflow: {
    mode: WorkflowMode;
    phase?: string;
    momentum?: "moving" | "blocked" | "waiting" | "unknown";
    confidence: number;
    signals: string[];
  };
  safety: {
    redactions_applied: string[];
    forbidden_fields_seen: boolean;
  };
};

export type PolicyRule = {
  id: string;
  when: Record<string, unknown>;
  then: AdapterAction;
  reason: string;
};

export type PolicyFile = {
  rules: PolicyRule[];
};

export type AdapterAction = {
  kind: "fake_music_state";
  mood: string;
};

export type PolicyDecision = {
  matched_rule_id: string;
  reason: string;
  adapter_action: AdapterAction;
};

export type SafeCandidate = {
  id: string;
  labels: string[];
  traits: {
    energy?: "low" | "medium" | "high";
    tempo?: "slow" | "medium" | "fast";
    vocals?: "none" | "low" | "medium" | "high";
    familiarity?: "new" | "familiar" | "heavy_rotation";
  };
  source: "fake" | "local_library" | "personalized_seed";
};

export type CandidateFile = {
  candidates: SafeCandidate[];
};
