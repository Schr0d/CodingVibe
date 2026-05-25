import { describe, expect, it } from "vitest";
import { createNetEaseAdapterFromEnv, isPreviewOnly } from "../src/adapters/netease-adapter.js";

describe("NetEase adapter", () => {
  it("declares experimental capabilities", () => {
    const adapter = createNetEaseAdapterFromEnv();

    expect(adapter.capabilities()).toContain("experimental_unofficial");
    expect(adapter.capabilities()).toContain("search");
    expect(adapter.capabilities()).toContain("song_url");
  });

  it("does not treat every freeTrialPrivilege object as preview-only", () => {
    expect(
      isPreviewOnly({
        time: 319782,
        freeTrialPrivilege: { resConsumable: false, userConsumable: false },
        freeTimeTrialPrivilege: { resConsumable: false, userConsumable: false }
      })
    ).toBe(false);

    expect(
      isPreviewOnly({
        time: 30040,
        freeTrialInfo: { fragmentType: -1 },
        freeTrialPrivilege: { resConsumable: true, userConsumable: false }
      })
    ).toBe(true);
  });
});
