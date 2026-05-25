# Coding Vibe

![Coding Vibe logo](assets/logo.svg)

Local, inspectable workflow-state sidecar for coding agents.

Coding Vibe watches safe development signals, reduces them into an auditable workflow-state document, and maps that state to ambient work intent. Music is an adapter, not the core product.

The core V1 path is CLI-first and fake-adapter first. It does not require real music providers, OAuth, cloud services, or LLMs. Experimental provider adapters exist behind explicit commands and are not part of the default onboarding path.

## Why

Agent-heavy developers lose situational awareness during long coding loops: tests run in the background, CI finishes unnoticed, agents stall, docs mode gets interrupted, and debugging or refactor phases blur together.

Coding Vibe tests whether a local, inspectable workflow-state sidecar can make those phases visible without reading source code, prompts, raw logs, OAuth tokens, or account data.

## What V1 Does

- Defines `workflow-state.schema.json` as the safe state contract.
- Validates workflow-state JSON with a CLI command.
- Ships example workflow states, policies, and fake candidates.
- Runs a fake watcher, deterministic policy engine, fake adapter, and compact terminal UI.
- Exposes a stdio MCP server for safe local workflow-state inspection and vibe control.
- Keeps provider integrations isolated as experimental, opt-in commands.

## What V1 Does Not Do

- No default Spotify, Apple Music, YouTube Music, NetEase Cloud Music, or QQ Music onboarding.
- No OAuth broker, token refresh, or OS keychain integration.
- No LLM policy.
- No cloud sync.
- No source-code capture.
- No prompt capture.
- No terminal-output capture.
- No browser-history capture.
- No arbitrary provider API proxy through MCP.

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
node dist/cli.js setup netease
node dist/cli.js login netease
node dist/cli.js start
```

That path is intentionally git-friendly: an AI agent can clone the repo, run `npm install`, build, set the provider, and start the daemon. `login netease` is the only human step because it opens a QR code for the NetEase mobile app.

For a no-provider smoke test:

```bash
node dist/cli.js setup fake
node dist/cli.js start
```

To verify schemas without starting playback:

```bash
node dist/cli.js validate examples/workflow-state.min.json
```

Expected validation output: `Valid workflow state: examples/workflow-state.min.json`.

Current commands:

```bash
node dist/cli.js init
node dist/cli.js setup netease
node dist/cli.js login netease
node dist/cli.js start
node dist/cli.js dev --fake
node dist/cli.js dev --netease --query "ambient focus instrumental"
node dist/cli.js daemon
node dist/cli.js state
node dist/cli.js explain
node dist/cli.js validate examples/workflow-state.min.json
node dist/cli.js mcp
node dist/cli.js spotify status
node dist/cli.js netease capabilities
node dist/cli.js provider get
node dist/cli.js provider set netease
node dist/cli.js provider query "lofi focus"
node dist/cli.js provider next
node dist/cli.js provider volume 80
```

`node dist/cli.js mcp` starts a stdio MCP server with safe local tools:

- `get_workflow_state`: read the current safe workflow-state summary.
- `explain_policy`: explain the latest local policy decision.
- `list_available_vibes`: list supported workflow modes.
- `get_music_provider`: read the selected local music provider.
- `set_music_provider`: select `fake` or `netease` for local adapter processes without calling provider APIs.
- `set_music_query`: set the local NetEase search query for adapter processes without calling provider APIs.
- `next_track`: ask the local adapter daemon to switch to the next track without calling provider APIs through MCP.
- `set_volume`: ask the local adapter daemon to set playback volume without calling provider APIs through MCP.
- `set_vibe`: write a local workflow vibe and policy decision.
- `set_fake_vibe`: deprecated compatibility alias for `set_vibe`.

The MCP server does not expose provider APIs, OAuth tokens, raw source code, raw logs, browser data, or arbitrary shell access.

It also exposes the `coding_vibe_agent_guidance` prompt. Use it to tell a coding agent when to call `set_vibe` with its existing large model, without running a second model inside Coding Vibe.

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

- Call `set_vibe` when the work phase changes.
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

During `dev --netease`, the same compact TUI uses the local sample workflow-state watcher but plays NetEase Cloud Music URLs through a native player path. Windows uses `System.Windows.Media.MediaPlayer`; macOS downloads the URL to a temp file and uses `afplay`; Linux downloads the URL to a temp file and requires `ffplay`, `mpg123`, or `mpv`. This is experimental and opt-in.

If no `dev` adapter flag is passed, `dev` uses `.vibe/provider-settings.json`. Agents can update that local setting through `set_music_provider`, but MCP still never calls provider APIs directly.

For the normal ambient loop, run the daemon and leave it running:

```bash
node dist/cli.js provider set netease
node dist/cli.js start
```

The daemon polls `.vibe/vibe-state.json` and `.vibe/provider-settings.json`, evaluates local policy, and drives the selected adapter. MCP remains a safe control plane: agents set workflow intent and provider selection, while the daemon owns playback side effects.

Common playback controls:

```bash
node dist/cli.js provider query "lofi focus"
node dist/cli.js provider next
node dist/cli.js provider volume 100
```

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

Provider integrations are experimental adapter work. Core owns the workflow-state schema, privacy rules, policy engine, and adapter contract. Provider-specific adapters should remain isolated unless they are fake or local reference implementations.

The provider SPI is split into two contracts:

- `MusicProvider`: declares capabilities, privacy surface, and safe candidate seed/resolve behavior.
- `PlaybackController`: plays a resolved `Playable`, such as a URL, provider reference, or fake candidate.

This keeps provider data access separate from playback control. NetEase can produce URL playables, Spotify can produce provider references and playback controls, and fake/local adapters can stay entirely local.

The package includes a tiny `url-open` playback controller. It opens non-preview `http`/`https` playables with the OS default handler. It is intentionally minimal: no embedded decoder, no provider credentials, no playlist management, and no pause/next control. The experimental NetEase TUI path uses a native mini-player separately while the provider SPI evolves.

Potential adapter targets:

- local files
- MPD
- VLC
- Spotify
- Apple Music
- YouTube Music
- NetEase Cloud Music
- QQ Music

Non-official adapters should be marked experimental and must declare their capabilities and privacy surface. They should not be default onboarding paths.

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

- Coding Vibe does not print cookies.
- Coding Vibe only persists NetEase cookies after explicit `netease login-qr`.
- `NETEASE_COOKIE` takes precedence over the local QR login cookie.
- `netease login-qr` saves the NetEase cookie to `.vibe/auth/netease-cookie.txt` with restrictive file permissions where supported.
- `netease login-qr` also writes a temporary local QR page at `.vibe/auth/netease-login.html` so the NetEase app has an actual QR code to scan.
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
