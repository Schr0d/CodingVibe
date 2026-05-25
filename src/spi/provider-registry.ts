import type { MusicProvider, ProviderManifest } from "./music-provider.js";

export class ProviderRegistry {
  private readonly providers = new Map<string, MusicProvider>();

  register(provider: MusicProvider): void {
    if (this.providers.has(provider.manifest.id)) {
      throw new Error(`Provider already registered: ${provider.manifest.id}`);
    }
    this.providers.set(provider.manifest.id, provider);
  }

  get(id: string): MusicProvider | undefined {
    return this.providers.get(id);
  }

  list(): ProviderManifest[] {
    return Array.from(this.providers.values()).map((provider) => provider.manifest);
  }
}
