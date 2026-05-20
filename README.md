# Coding Vibe

![Coding Vibe logo](assets/logo.svg)

Local, inspectable workflow-state sidecar for coding agents.

Coding Vibe watches safe development signals, reduces them into an auditable workflow-state document, and maps that state to ambient work intent. Music is an adapter, not the core product.

V1 is CLI-first and fake-adapter only. It does not connect to real music providers, OAuth, cloud services, or LLMs.

## Why

Agent-heavy developers lose situational awareness during long coding loops: tests run in the background, CI finishes unnoticed, agents stall, docs mode gets interrupted, and debugging or refactor phases blur together.

Coding Vibe tests whether a local, inspectable workflow-state sidecar can make those phases visible without reading source code, prompts, raw logs, OAuth tokens, or account data.

## What V1 Does

- Defines `workflow-state.schema.json` as the safe state contract.
- Validates workflow-state JSON with a CLI command.
- Ships example workflow states, policies, and fake candidates.
- Keeps provider integrations out of V1.
- Keeps MCP as a planned V1.1 surface, not the first implementation risk.

## What V1 Does Not Do

- No Spotify, Apple Music, YouTube Music, NetEase Cloud Music, or QQ Music integration.
- No OAuth.
- No LLM policy.
- No cloud sync.
- No source-code capture.
- No prompt capture.
- No terminal-output capture.
- No browser-history capture.

## Architecture

```text
sample events / fake watcher
        ↓
safe state extractor
        ↓
vibe-state.json
        ↓
deterministic policy
        ↓
fake/local adapter
        ↓
compact terminal UI / logs
```

The trust boundary is the product: all adapter actions should be explainable from the local workflow-state file and policy result.

![Coding Vibe compact terminal UI](assets/product-shot.svg)

## Quick Start

```bash
npm install
npm run build
node dist/cli.js --help
node dist/cli.js validate examples/workflow-state.min.json
```

Expected validation output:

```text
Valid workflow state: examples/workflow-state.min.json
```

Current commands:

```bash
node dist/cli.js init
node dist/cli.js dev --fake
node dist/cli.js state
node dist/cli.js explain
node dist/cli.js validate examples/workflow-state.min.json
node dist/cli.js mcp
node dist/cli.js spotify status
node dist/cli.js netease capabilities
```

`node dist/cli.js mcp` starts a stdio MCP server with safe local tools:

- `get_workflow_state`: read the current safe workflow-state summary.
- `explain_policy`: explain the latest local policy decision.
- `list_available_vibes`: list supported fake workflow modes.
- `set_fake_vibe`: write a local fake vibe and policy decision.

The MCP server does not expose provider APIs, OAuth tokens, raw source code, raw logs, browser data, or arbitrary shell access.

It also exposes the `coding_vibe_agent_guidance` prompt. Use it to tell a coding agent when to call `set_fake_vibe` with its existing large model, without running a second model inside Coding Vibe.

Example MCP config:

```json
{
  "mcpServers": {
    "coding-vibe": {
      "command": "node",
      "args": ["C:/Users/T480/Documents/CodingVibe/dist/cli.js", "mcp"]
    }
  }
}
```

Agent behavior policy:

- Call `set_fake_vibe` when the work phase changes.
- Use `debugging` for repeated errors or failing tests.
- Use `writing` for docs, README, changelog, or prose-heavy work.
- Use `waiting_ci` while tests/builds/CI are running.
- Use `deep_work` for focused implementation or refactors.
- Use `reviewing` for code review or audit work.
- Keep `reason` short and derived.
- Never include code, raw logs, stack traces, paths, secrets, URLs, tokens, or account data in `reason`.

During `dev --fake`:

- `space`: play/pause fake adapter state.
- `n`: next candidate.
- `,`: settings.
- `e`: explain current policy decision.
- `s`: print current workflow state JSON.
- `q`: quit.

## Core Artifact

The durable interface is `workflow-state.schema.json`: a safe, local, inspectable summary of coding workflow state.

Minimal state:

```json
{
  "schema_version": "1.0.0",
  "producer": "coding-vibe",
  "generated_at": "2026-05-20T00:00:00.000Z",
  "ttl_ms": 30000,
  "workflow": {
    "mode": "unknown",
    "confidence": 0,
    "signals": []
  },
  "safety": {
    "redactions_applied": [],
    "forbidden_fields_seen": false
  }
}
```

## Privacy Model

Allowed model-visible data:

- Derived workflow mode.
- Confidence score.
- Coarse activity class.
- Timestamps.
- Redaction metadata.
- Local schema version.

Forbidden in V1:

- Raw prompts.
- Chat transcripts.
- Source code.
- Terminal output.
- Absolute file paths.
- Browser URLs.
- API keys, tokens, cookies, and secrets.
- OAuth credentials.
- Provider account identifiers.

## UI Direction

The V1 front end is a compact terminal widget, not a full-screen dashboard:

```text
┌─ Vibe ─────────────────────────────────┐
│ debugging  0.78  blocked  fake:ready   │
│ now low-vocal steady  local-ambient-02  │
│ space play/pause  n next  , settings   │
└────────────────────────────────────────┘
```

The first UI only needs current workflow state, current fake/local candidate, connection status, next, play/pause, settings, and explain.

## Provider Plugins

Provider integrations are future plugin/SPI work. Core owns the workflow-state schema, privacy rules, policy engine, and adapter contract. Provider-specific adapters should live outside core unless they are fake or local reference implementations.

Potential future adapters:

- local files
- MPD
- VLC
- Spotify
- Apple Music
- YouTube Music
- NetEase Cloud Music
- QQ Music

Non-official adapters should be marked experimental and must declare their capabilities and privacy surface.

## Spotify Adapter

Spotify support is experimental and uses the official `@spotify/web-api-ts-sdk` package.

This first adapter does not implement OAuth. It only accepts an explicit access token through the environment:

```bash
set SPOTIFY_ACCESS_TOKEN=your_access_token
node dist/cli.js spotify status
node dist/cli.js spotify pause
node dist/cli.js spotify resume
node dist/cli.js spotify next
node dist/cli.js spotify seed --limit 5
```

Optional device selection:

```bash
set SPOTIFY_DEVICE_ID=your_device_id
```

Required Spotify scopes depend on the command:

- Playback: `user-read-playback-state`, `user-modify-playback-state`.
- Personalized seed: `user-top-read`.

Safety boundaries:

- Coding Vibe does not persist Spotify tokens.
- Coding Vibe does not print tokens.
- `spotify seed` prints sanitized candidate IDs and coarse audio traits only.
- `spotify seed` does not print raw track URIs, account identifiers, listening history, playlist names, or provider recommendation responses.
- OAuth broker, token refresh, and OS keychain storage are future work.

## NetEase Cloud Music Adapter

NetEase support is experimental and uses the unofficial `NeteaseCloudMusicApi` package.

Commands:

```bash
node dist/cli.js netease capabilities
node dist/cli.js netease search --query "ambient focus" --limit 5
node dist/cli.js netease url --id 123456
node dist/cli.js netease play --id 123456
node dist/cli.js netease play --query "ambient focus"
node dist/cli.js netease seed --limit 5
node dist/cli.js netease login-qr
```

Optional login cookie:

```bash
set NETEASE_COOKIE=your_cookie
node dist/cli.js netease seed --limit 5
```

Safety boundaries:

- Coding Vibe does not persist NetEase cookies.
- Coding Vibe does not print cookies.
- `netease login-qr` saves the NetEase cookie to `.vibe/auth/netease-cookie.txt` with restrictive file permissions where supported.
- `netease seed` emits safe candidate IDs and coarse traits only.
- Without `NETEASE_COOKIE`, `netease seed` falls back to anonymous search seed.
- With `NETEASE_COOKIE`, `netease seed` can use daily recommendation data through the unofficial API.
- `netease play` opens the resolved playback URL with the OS default handler. It does not embed a player yet.
- `netease play --query` probes search results and skips preview-only URLs when possible.
- If NetEase returns only a 30-second preview, set `NETEASE_COOKIE` or choose another song.
- This adapter is not a default onboarding path.

Known risks:

- The NetEase integration is unofficial and may break or be rate-limited.
- Login, cookies, playback URLs, and availability can be affected by account state, region, copyright, and platform risk controls.
- The package currently introduces npm audit findings; keep it isolated as experimental provider work.

## Development

```bash
npm install
npm run typecheck
npm test
npm run build
```

## Roadmap

- Slice 1: TypeScript CLI scaffold and schema validation. Done.
- Slice 2: Policy engine and explain output.
- Slice 3: Fake watcher and atomic `vibe-state.json` writes.
- Slice 4: Fake adapter and `adapter-log.jsonl`.
- Slice 5: Compact TUI.
- Slice 6: External validation script.

## License

Core daemon, CLI, policy engine, and sidecar code: `AGPL-3.0-or-later`.

Schemas, examples, sample vibe packs, and fake adapter sample data are intended to use a permissive license before distribution.
