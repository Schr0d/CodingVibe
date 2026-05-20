import { createRequire } from "node:module";
import type { SafeCandidate } from "../types.js";

const require = createRequire(import.meta.url);
const netease = require("NeteaseCloudMusicApi") as NetEaseApi;

type NetEaseApi = {
  cloudsearch(params: Record<string, unknown>): Promise<NetEaseResponse>;
  song_url(params: Record<string, unknown>): Promise<NetEaseResponse>;
  recommend_songs(params: Record<string, unknown>): Promise<NetEaseResponse>;
};

type NetEaseResponse = {
  status: number;
  body: Record<string, unknown>;
};

type NetEaseSong = {
  id: number;
  name: string;
  ar?: Array<{ name?: string }>;
  artists?: Array<{ name?: string }>;
};

type NetEaseUrl = {
  id: number;
  url: string | null;
  br?: number;
  type?: string;
};

export type NetEaseSearchResult = {
  id: string;
  title: string;
  artist: string;
  playable: "unknown";
};

export type NetEasePlayableUrl = {
  id: string;
  playable: boolean;
  url?: string;
  bitrate?: number;
  type?: string;
};

export class NetEaseAdapter {
  constructor(private readonly cookie?: string) {}

  capabilities(): string[] {
    return ["search", "song_url", "personalized_seed_cookie_optional", "experimental_unofficial"];
  }

  async search(keywords: string, limit: number): Promise<NetEaseSearchResult[]> {
    const response = await netease.cloudsearch({ keywords, type: 1, limit, cookie: this.cookie });
    const songs = readSongs(response.body, "result.songs");

    return songs.map((song) => ({
      id: String(song.id),
      title: song.name,
      artist: artistName(song),
      playable: "unknown"
    }));
  }

  async songUrl(id: string): Promise<NetEasePlayableUrl> {
    const response = await netease.song_url({ id, br: 320000, cookie: this.cookie });
    const urls = readUrls(response.body);
    const match = urls.find((item) => String(item.id) === String(id)) ?? urls[0];

    if (!match?.url) return { id, playable: false };

    return {
      id,
      playable: true,
      url: match.url,
      bitrate: match.br,
      type: match.type
    };
  }

  async seed(limit: number): Promise<SafeCandidate[]> {
    if (!this.cookie) {
      const results = await this.search("ambient focus instrumental", limit);
      return results.map((result, index) => toCandidate(result, index, "search_seed"));
    }

    const response = await netease.recommend_songs({ cookie: this.cookie });
    const songs = readSongs(response.body, "data.dailySongs").slice(0, limit);
    return songs.map((song, index) =>
      toCandidate(
        {
          id: String(song.id),
          title: song.name,
          artist: artistName(song),
          playable: "unknown"
        },
        index,
        "personalized_seed"
      )
    );
  }
}

export function createNetEaseAdapterFromEnv(): NetEaseAdapter {
  return new NetEaseAdapter(process.env.NETEASE_COOKIE);
}

function toCandidate(result: NetEaseSearchResult, index: number, seedType: "search_seed" | "personalized_seed"): SafeCandidate {
  return {
    id: `netease-${seedType}-${index + 1}`,
    labels: ["netease", seedType, "experimental", "work_compatible"],
    traits: {
      energy: "medium",
      tempo: "medium",
      vocals: "medium",
      familiarity: seedType === "personalized_seed" ? "familiar" : "new"
    },
    source: seedType === "personalized_seed" ? "personalized_seed" : "fake"
  };
}

function readSongs(body: Record<string, unknown>, path: "result.songs" | "data.dailySongs"): NetEaseSong[] {
  const value = path.split(".").reduce<unknown>((current, key) => {
    if (current && typeof current === "object" && key in current) return (current as Record<string, unknown>)[key];
    return undefined;
  }, body);

  return Array.isArray(value) ? value.filter(isSong) : [];
}

function readUrls(body: Record<string, unknown>): NetEaseUrl[] {
  return Array.isArray(body.data) ? body.data.filter(isUrl) : [];
}

function isSong(value: unknown): value is NetEaseSong {
  return Boolean(value && typeof value === "object" && typeof (value as NetEaseSong).id === "number" && typeof (value as NetEaseSong).name === "string");
}

function isUrl(value: unknown): value is NetEaseUrl {
  return Boolean(value && typeof value === "object" && typeof (value as NetEaseUrl).id === "number" && "url" in value);
}

function artistName(song: NetEaseSong): string {
  const artists = song.ar ?? song.artists ?? [];
  return artists.map((artist) => artist.name).filter(Boolean).join("/") || "unknown";
}
