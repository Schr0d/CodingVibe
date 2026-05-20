import type { SafeCandidate, WorkflowState } from "../types.js";

export type ProviderStability = "official" | "semi_official" | "unofficial" | "local_only" | "fake";

export type ProviderCapability =
  | "search"
  | "candidate_seed"
  | "personalized_seed"
  | "playable_url"
  | "playback_status"
  | "play"
  | "pause"
  | "resume"
  | "next"
  | "audio_traits"
  | "requires_account"
  | "experimental";

export type ProviderPrivacySurface = {
  storesCredentials: boolean;
  printsCredentials: boolean;
  sendsRawWorkflowContext: boolean;
  usesAccountRecommendations: boolean;
  notes: string[];
};

export type ProviderManifest = {
  id: string;
  displayName: string;
  stability: ProviderStability;
  capabilities: ProviderCapability[];
  privacy: ProviderPrivacySurface;
};

export type SeedInput = {
  workflow: WorkflowState;
  limit: number;
};

export type Playable =
  | {
      kind: "url";
      id: string;
      url: string;
      previewOnly?: boolean;
      reason?: string;
    }
  | {
      kind: "provider_ref";
      provider: string;
      id: string;
      previewOnly?: boolean;
      reason?: string;
    }
  | {
      kind: "fake";
      id: string;
      label: string;
    };

export type PlaybackStatus = {
  provider: string;
  playing: boolean;
  item?: string;
  device?: string;
};

export type MusicProvider = {
  manifest: ProviderManifest;
  seed(input: SeedInput): Promise<SafeCandidate[]>;
  resolve?(candidateId: string): Promise<Playable>;
};

export type PlaybackController = {
  id: string;
  supports(playable: Playable): boolean;
  play(playable: Playable): Promise<void>;
  pause?(): Promise<void>;
  resume?(): Promise<void>;
  next?(): Promise<void>;
  status?(): Promise<PlaybackStatus>;
};
