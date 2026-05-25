import type { CandidateFile, SafeCandidate, WorkflowState } from "../types.js";
import type { MusicProvider, ProviderManifest, SeedInput } from "../spi/music-provider.js";

export class FakeProvider implements MusicProvider {
  readonly manifest: ProviderManifest = {
    id: "fake",
    displayName: "Fake Provider",
    stability: "fake",
    capabilities: ["candidate_seed", "play"],
    privacy: {
      storesCredentials: false,
      printsCredentials: false,
      sendsRawWorkflowContext: false,
      usesAccountRecommendations: false,
      notes: ["Uses local example candidates only."]
    }
  };

  constructor(private readonly candidateFile: CandidateFile) {}

  async seed(input: SeedInput): Promise<SafeCandidate[]> {
    return this.matchCandidates(input.workflow);
  }

  private matchCandidates(state: WorkflowState): SafeCandidate[] {
    const exact = this.candidateFile.candidates.filter((candidate) => candidate.labels.includes(state.workflow.mode));
    return exact.length > 0 ? exact : this.candidateFile.candidates;
  }
}
