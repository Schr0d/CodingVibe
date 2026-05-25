import { appendFile } from "node:fs/promises";
import { NetEaseAdapter } from "./netease-adapter.js";
import { NativeAudioPlayer } from "../player/native-audio-player.js";
import type { PolicyDecision, SafeCandidate, WorkflowState } from "../types.js";

type NetEaseTuiCandidate = {
  candidate: SafeCandidate;
  songId: string;
  title: string;
  artist: string;
  url: string;
};

export class NetEaseTuiAdapter {
  private index = 0;
  private playing = false;
  private player: NativeAudioPlayer | undefined;
  private candidates: NetEaseTuiCandidate[] = [];
  private lastError: string | undefined;

  constructor(
    private readonly adapter: NetEaseAdapter,
    private readonly logPath: string,
    private readonly query = "ambient focus instrumental",
    private readonly limit = 10
  ) {}

  async currentCandidate(_state: WorkflowState): Promise<SafeCandidate> {
    await this.ensureCandidates();
    return this.current().candidate;
  }

  isPlaying(): boolean {
    return this.playing;
  }

  status(): string {
    if (this.lastError) return "error";
    return this.playing ? "playing" : "ready";
  }

  async togglePlay(state: WorkflowState): Promise<boolean> {
    if (this.playing) {
      await this.player?.pause();
      this.playing = false;
      return this.playing;
    }

    if (this.player) {
      this.playing = true;
      this.startPlayer();
      return this.playing;
    }

    await this.openCurrent(state);
    return this.playing;
  }

  async next(state: WorkflowState): Promise<SafeCandidate> {
    await this.ensureCandidates();
    this.index = (this.index + 1) % Math.max(this.candidates.length, 1);
    await this.openCurrent(state);
    return this.current().candidate;
  }

  async logDecision(state: WorkflowState, decision: PolicyDecision, candidate: SafeCandidate): Promise<void> {
    const current = this.candidates.find((entry) => entry.candidate.id === candidate.id);
    const entry = {
      ts: new Date().toISOString(),
      adapter: "netease",
      mode: state.workflow.mode,
      matched_rule_id: decision.matched_rule_id,
      mood: decision.adapter_action.mood,
      candidate_id: candidate.id,
      song_id: current?.songId,
      playing: this.playing,
      error: this.lastError
    };
    await appendFile(this.logPath, `${JSON.stringify(entry)}\n`, "utf8");
  }

  private async openCurrent(state: WorkflowState): Promise<void> {
    await this.ensureCandidates();
    const current = this.current();
    await this.player?.destroy();
    this.player = new NativeAudioPlayer();
    this.playing = true;
    this.lastError = undefined;
    this.startPlayer(current.url);
    await this.logPlayback(state, current);
  }

  private startPlayer(url?: string): void {
    const player = this.player;
    if (!player) return;

    const action = url ? player.open(url) : player.play();
    void action.catch((error: unknown) => {
      this.playing = false;
      this.lastError = error instanceof Error ? error.message : String(error);
    });
  }

  async destroy(): Promise<void> {
    await this.player?.destroy();
    this.player = undefined;
    this.playing = false;
  }

  private async ensureCandidates(): Promise<void> {
    if (this.candidates.length > 0) return;

    const results = await this.adapter.search(this.query, this.limit);
    const candidates: NetEaseTuiCandidate[] = [];

    for (const result of results) {
      const playable = await this.adapter.songUrl(result.id);
      if (!playable.playable || playable.preview_only || !playable.url) continue;
      candidates.push({
        songId: result.id,
        title: result.title,
        artist: result.artist,
        url: playable.url,
        candidate: {
          id: `netease-${result.id}`,
          labels: ["netease", "experimental", "work_compatible"],
          traits: {
            energy: "medium",
            tempo: "medium",
            vocals: "medium",
            familiarity: "new"
          },
          source: "fake"
        }
      });
    }

    if (candidates.length === 0) {
      this.lastError = `no playable NetEase results for query: ${this.query}`;
      throw new Error(this.lastError);
    }

    this.candidates = candidates;
  }

  private current(): NetEaseTuiCandidate {
    return this.candidates[this.index % this.candidates.length];
  }

  private async logPlayback(state: WorkflowState, current: NetEaseTuiCandidate): Promise<void> {
    const entry = {
      ts: new Date().toISOString(),
      adapter: "netease",
      event: "open_url",
      mode: state.workflow.mode,
      candidate_id: current.candidate.id,
      song_id: current.songId,
      title: current.title,
      artist: current.artist
    };
    await appendFile(this.logPath, `${JSON.stringify(entry)}\n`, "utf8");
  }
}
