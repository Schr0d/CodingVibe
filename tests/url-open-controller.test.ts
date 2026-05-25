import { describe, expect, it } from "vitest";
import { UrlOpenController } from "../src/player/url-open-controller.js";
import type { Playable } from "../src/spi/music-provider.js";

describe("URL open playback controller", () => {
  it("supports non-preview http URL playables", () => {
    const controller = new UrlOpenController();
    const playable: Playable = { kind: "url", id: "test", url: "https://example.com/test.mp3" };

    expect(controller.supports(playable)).toBe(true);
  });

  it("rejects preview-only URL playables", () => {
    const controller = new UrlOpenController();
    const playable: Playable = { kind: "url", id: "test", url: "https://example.com/preview.mp3", previewOnly: true };

    expect(controller.supports(playable)).toBe(false);
  });

  it("rejects non-http URL playables", () => {
    const controller = new UrlOpenController();
    const playable: Playable = { kind: "url", id: "test", url: "file:///tmp/test.mp3" };

    expect(controller.supports(playable)).toBe(false);
  });
});
