import { createRequire } from "node:module";
import type { SafeCandidate } from "../types.js";

const require = createRequire(import.meta.url);
const netease = require("NeteaseCloudMusicApi") as NetEaseApi;

type NetEaseApi = {
  cloudsearch(params: Record<string, unknown>): Promise<NetEaseResponse>;
  login_qr_check(params: Record<string, unknown>): Promise<NetEaseResponse>;
  login_qr_create(params: Record<string, unknown>): Promise<NetEaseResponse>;
  login_qr_key(params: Record<string, unknown>): Promise<NetEaseResponse>;
  song_url(params: Record<string, unknown>): Promise<NetEaseResponse>;
  song_url_v1(params: Record<string, unknown>): Promise<NetEaseResponse>;
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
  level?: string;
  type?: string;
  time?: number;
  freeTrialInfo?: unknown;
  freeTrialPrivilege?: unknown;
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
  preview_only: boolean;
  reason?: string;
  url?: string;
  bitrate?: number;
  level?: string;
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

  async songUrl(id: string, level = "standard"): Promise<NetEasePlayableUrl> {
    const response = await netease.song_url_v1({ id, level, cookie: this.cookie });
    const urls = readUrls(response.body);
    const match = urls.find((item) => String(item.id) === String(id)) ?? urls[0];

    if (!match?.url) {
      const fallback = await this.legacySongUrl(id);
      if (fallback.playable) return fallback;
      return { id, playable: false, preview_only: false, reason: "no playable URL returned" };
    }

    return {
      id,
      playable: true,
      preview_only: isPreviewOnly(match),
      reason: isPreviewOnly(match) ? "NetEase returned a free-trial or short preview URL" : undefined,
      url: match.url,
      bitrate: match.br,
      level: match.level,
      type: match.type
    };
  }

  async firstPlayableFromSearch(keywords: string, limit: number): Promise<NetEasePlayableUrl | undefined> {
    const results = await this.search(keywords, limit);

    for (const result of results) {
      const playable = await this.songUrl(result.id);
      if (playable.playable && !playable.preview_only) return playable;
    }

    for (const result of results) {
      const playable = await this.songUrl(result.id);
      if (playable.playable) return playable;
    }

    return undefined;
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

  async createQrLogin(): Promise<{ key: string; url: string; imageDataUrl?: string }> {
    const keyResponse = await netease.login_qr_key({});
    const key = readQrKey(keyResponse.body);
    const qrResponse = await netease.login_qr_create({ key, qrimg: true });
    const data = readQrCreateData(qrResponse.body);
    return { key, url: data.qrurl, imageDataUrl: data.qrimg };
  }

  async checkQrLogin(key: string): Promise<{ code?: number; message?: string; cookie?: string }> {
    const response = await netease.login_qr_check({ key });
    const code = typeof response.body.code === "number" ? response.body.code : undefined;
    const message = typeof response.body.message === "string" ? response.body.message : undefined;
    const cookie = typeof response.body.cookie === "string" ? response.body.cookie : undefined;
    return { code, message, cookie };
  }

  private async legacySongUrl(id: string): Promise<NetEasePlayableUrl> {
    const response = await netease.song_url({ id, br: 320000, cookie: this.cookie });
    const urls = readUrls(response.body);
    const match = urls.find((item) => String(item.id) === String(id)) ?? urls[0];

    if (!match?.url) return { id, playable: false, preview_only: false, reason: "legacy endpoint returned no playable URL" };

    return {
      id,
      playable: true,
      preview_only: isPreviewOnly(match),
      reason: isPreviewOnly(match) ? "NetEase returned a free-trial or short preview URL" : undefined,
      url: match.url,
      bitrate: match.br,
      level: match.level,
      type: match.type
    };
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

function isPreviewOnly(value: NetEaseUrl): boolean {
  return Boolean(value.freeTrialInfo || value.freeTrialPrivilege || (typeof value.time === "number" && value.time > 0 && value.time <= 35000));
}

function artistName(song: NetEaseSong): string {
  const artists = song.ar ?? song.artists ?? [];
  return artists.map((artist) => artist.name).filter(Boolean).join("/") || "unknown";
}

function readQrKey(body: Record<string, unknown>): string {
  const data = body.data;
  if (data && typeof data === "object" && typeof (data as Record<string, unknown>).unikey === "string") {
    return (data as Record<string, string>).unikey;
  }
  throw new Error("NetEase QR login did not return a unikey.");
}

function readQrCreateData(body: Record<string, unknown>): { qrurl: string; qrimg?: string } {
  const data = body.data;
  if (data && typeof data === "object" && typeof (data as Record<string, unknown>).qrurl === "string") {
    const record = data as Record<string, unknown>;
    return {
      qrurl: String(record.qrurl),
      qrimg: typeof record.qrimg === "string" ? record.qrimg : undefined
    };
  }
  throw new Error("NetEase QR login did not return a QR URL.");
}
