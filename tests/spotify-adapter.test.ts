import { describe, expect, it } from "vitest";
import { createSpotifyAdapterFromEnv } from "../src/adapters/spotify-adapter.js";

describe("Spotify adapter", () => {
  it("requires an explicit access token", () => {
    const previous = process.env.SPOTIFY_ACCESS_TOKEN;
    delete process.env.SPOTIFY_ACCESS_TOKEN;

    expect(() => createSpotifyAdapterFromEnv()).toThrow("SPOTIFY_ACCESS_TOKEN");

    process.env.SPOTIFY_ACCESS_TOKEN = previous;
  });
});
