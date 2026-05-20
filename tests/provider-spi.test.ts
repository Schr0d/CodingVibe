import { describe, expect, it } from "vitest";
import candidates from "../examples/candidates.fake.json" with { type: "json" };
import state from "../examples/workflow-state.full.json" with { type: "json" };
import { FakeProvider } from "../src/adapters/fake-provider.js";
import { ProviderRegistry } from "../src/spi/provider-registry.js";
import type { CandidateFile, WorkflowState } from "../src/types.js";

describe("provider SPI", () => {
  it("registers providers by manifest", () => {
    const registry = new ProviderRegistry();
    const provider = new FakeProvider(candidates as CandidateFile);

    registry.register(provider);

    expect(registry.get("fake")).toBe(provider);
    expect(registry.list()[0]?.id).toBe("fake");
  });

  it("rejects duplicate provider ids", () => {
    const registry = new ProviderRegistry();
    const provider = new FakeProvider(candidates as CandidateFile);

    registry.register(provider);

    expect(() => registry.register(provider)).toThrow("Provider already registered");
  });

  it("seeds fake candidates from workflow state", async () => {
    const provider = new FakeProvider(candidates as CandidateFile);
    const seeded = await provider.seed({ workflow: state as WorkflowState, limit: 5 });

    expect(seeded.length).toBeGreaterThan(0);
    expect(seeded[0]?.id).toContain("local-ambient");
  });
});
