import { SpotifyApi, type AccessToken, type AudioFeatures, type Track } from "@spotify/web-api-ts-sdk";
import type { SafeCandidate } from "../types.js";

export type SpotifyStatus = {
  provider: "spotify";
  device: string;
  playing: boolean;
  item: string;
};

export class SpotifyAdapter {
  private readonly api: SpotifyApi;

  constructor(accessToken: string, private readonly deviceId?: string) {
    const token: AccessToken = {
      access_token: accessToken,
      token_type: "Bearer",
      expires_in: 3600,
      refresh_token: ""
    };
    this.api = SpotifyApi.withAccessToken("coding-vibe", token);
  }

  capabilities(): string[] {
    return ["pause", "next", "resume", "current_playback", "personalized_seed", "audio_traits"];
  }

  async status(): Promise<SpotifyStatus> {
    const playback = await this.api.player.getPlaybackState();
    const device = playback?.device?.name ?? "unknown";
    const playing = Boolean(playback?.is_playing);
    const item = playback?.item && "type" in playback.item ? playback.item.type : "none";
    return { provider: "spotify", device, playing, item };
  }

  async pause(): Promise<void> {
    await this.api.player.pausePlayback(await this.resolveDeviceId());
  }

  async next(): Promise<void> {
    await this.api.player.skipToNext(await this.resolveDeviceId());
  }

  async resume(): Promise<void> {
    await this.api.player.startResumePlayback(await this.resolveDeviceId());
  }

  async personalizedSeed(limit: number): Promise<SafeCandidate[]> {
    const page = await this.api.currentUser.topItems("tracks", "medium_term", Math.min(Math.max(limit, 1), 20) as 20);
    const tracks = page.items.filter((item): item is Track => item.type === "track");
    const features = await this.safeAudioFeatures(tracks.map((track) => track.id));

    return tracks.map((track, index) => {
      const trait = features[index];
      return {
        id: `spotify-seed-${index + 1}`,
        labels: ["personalized_seed", "liked_by_user", trait?.instrumentalness && trait.instrumentalness > 0.5 ? "instrumental" : "mixed_vocals"],
        traits: {
          energy: energyBand(trait?.energy),
          tempo: tempoBand(trait?.tempo),
          vocals: vocalBand(trait?.instrumentalness),
          familiarity: "familiar"
        },
        source: "personalized_seed"
      } satisfies SafeCandidate;
    });
  }

  private async resolveDeviceId(): Promise<string> {
    if (this.deviceId) return this.deviceId;

    const devices = await this.api.player.getAvailableDevices();
    const active = devices.devices.find((device) => device.is_active) ?? devices.devices[0];

    if (!active?.id) {
      throw new Error("No Spotify device found. Open Spotify on a device, then retry.");
    }

    return active.id;
  }

  private async safeAudioFeatures(ids: string[]): Promise<Array<AudioFeatures | undefined>> {
    if (ids.length === 0) return [];

    try {
      return await this.api.tracks.audioFeatures(ids);
    } catch {
      return ids.map(() => undefined);
    }
  }
}

export function createSpotifyAdapterFromEnv(): SpotifyAdapter {
  const token = process.env.SPOTIFY_ACCESS_TOKEN;

  if (!token) {
    throw new Error("SPOTIFY_ACCESS_TOKEN is required. OAuth broker is not implemented yet, so V1 uses an explicit access token only.");
  }

  return new SpotifyAdapter(token, process.env.SPOTIFY_DEVICE_ID);
}

function energyBand(value?: number): "low" | "medium" | "high" | undefined {
  if (value === undefined) return undefined;
  if (value < 0.35) return "low";
  if (value > 0.7) return "high";
  return "medium";
}

function tempoBand(value?: number): "slow" | "medium" | "fast" | undefined {
  if (value === undefined) return undefined;
  if (value < 90) return "slow";
  if (value > 130) return "fast";
  return "medium";
}

function vocalBand(instrumentalness?: number): "none" | "low" | "medium" | "high" | undefined {
  if (instrumentalness === undefined) return undefined;
  if (instrumentalness > 0.8) return "none";
  if (instrumentalness > 0.5) return "low";
  if (instrumentalness > 0.2) return "medium";
  return "high";
}
