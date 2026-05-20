import { describe, expect, it } from "vitest";
import { createNetEaseAdapterFromEnv } from "../src/adapters/netease-adapter.js";

describe("NetEase adapter", () => {
  it("declares experimental capabilities", () => {
    const adapter = createNetEaseAdapterFromEnv();

    expect(adapter.capabilities()).toContain("experimental_unofficial");
    expect(adapter.capabilities()).toContain("search");
    expect(adapter.capabilities()).toContain("song_url");
  });
});
