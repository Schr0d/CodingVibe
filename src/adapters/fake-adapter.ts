import { appendFile } from "node:fs/promises";
import type { CandidateFile, PolicyDecision, SafeCandidate, WorkflowState } from "../types.js";

export class FakeAdapter {
  private index = 0;
  private playing = true;

  constructor(
    private readonly candidateFile: CandidateFile,
    private readonly logPath: string
  ) {}

  currentCandidate(state: WorkflowState): SafeCandidate {
    const candidates = this.matchCandidates(state);
    return candidates[this.index % candidates.length] ?? this.candidateFile.candidates[0];
  }

  isPlaying(): boolean {
    return this.playing;
  }

  togglePlay(): boolean {
    this.playing = !this.playing;
    return this.playing;
  }

  next(state: WorkflowState): SafeCandidate {
    const candidates = this.matchCandidates(state);
    this.index = (this.index + 1) % Math.max(candidates.length, 1);
    return this.currentCandidate(state);
  }

  async logDecision(state: WorkflowState, decision: PolicyDecision, candidate: SafeCandidate): Promise<void> {
    const entry = {
      ts: new Date().toISOString(),
      mode: state.workflow.mode,
      matched_rule_id: decision.matched_rule_id,
      mood: decision.adapter_action.mood,
      candidate_id: candidate.id,
      playing: this.playing
    };
    await appendFile(this.logPath, `${JSON.stringify(entry)}\n`, "utf8");
  }

  private matchCandidates(state: WorkflowState): SafeCandidate[] {
    const exact = this.candidateFile.candidates.filter((candidate) => candidate.labels.includes(state.workflow.mode));
    return exact.length > 0 ? exact : this.candidateFile.candidates;
  }
}
