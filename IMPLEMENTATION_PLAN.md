# Ambient Agent Sidecar Implementation Plan

## Decision

Build V1 as a TypeScript CLI-first local sidecar with a small TUI dashboard.

Do not build OAuth, LLM policy, cloud sync, or dynamic plugins in V1. Keep real provider work experimental, opt-in, and outside the default product loop.

The first shippable product is:

```text
sample events -> safe workflow-state -> deterministic policy -> fake/local adapter -> TUI + logs
```

## V1 Product Surface

### Primary UX

Use a compact terminal UI for `vibe dev --fake`.

It should not occupy much space. Default mode should feel like a small status widget, not a full-screen app.

It should show only six things:

- Current workflow state.
- Current ambient intent / fake track.
- Adapter connection status.
- `next` / change round.
- play / pause.
- settings.

This is enough for V1. It proves whether the ambient state loop feels useful without forcing a browser UI or real provider setup.

### TUI Layout

```text
┌─ Vibe ─────────────────────────────────┐
│ debugging  0.78  blocked  fake:ready   │
│ now low-vocal steady  local-ambient-02  │
│ space play/pause  n next  , settings   │
└────────────────────────────────────────┘
```

Expanded debug view is optional and should appear only after pressing `e` or running `vibe explain`.

### V1 Controls

- `space`: play/pause fake adapter state.
- `n`: choose the next candidate from the sanitized fake/local candidate set.
- `,`: open compact settings menu.
- `e`: show policy explanation.
- `s`: print current workflow-state JSON summary.
- `q`: quit.

Settings menu should be tiny:

```text
┌─ Settings ───────────────┐
│ adapter   fake           │
│ volume    simulated      │
│ mode      compact        │
│ privacy   strict         │
│ esc close                │
└──────────────────────────┘
```

V1 settings are local-only and mostly toggles for the fake loop. No provider login appears in settings until provider adapters exist.

### Deferred UI

- No web dashboard in V1.
- No desktop tray in V1.
- No platform connection screen in V1.
- No OAuth UI in V1.

Platform connection can appear later as a disabled status row:

```text
Provider     none  default loop uses fake adapter
```

## Technical Stack

### Language

TypeScript on Node.js.

Reason: best fit for CLI package distribution, JSON schema work, MCP SDK later, and plugin ecosystem.

### Package Manager

Use `npm` metadata and keep the package runnable through `npx`.

Local development can use `pnpm` if desired, but published UX should be:

```bash
npx coding-vibe init
npx coding-vibe dev --fake
```

### CLI Framework

Use `commander`.

Reason: boring, stable, obvious to contributors.

### TUI Framework

Use `ink` only if we actually need live keyboard handling.

Fallback: start with plain terminal rendering using `readline` and `process.stdin.setRawMode`.

Decision for V1: plain terminal first. Add `ink` only if the manual rendering gets messy.

### Schema Validation

Use `ajv` for JSON Schema validation.

Ship `schemas/workflow-state.schema.json`.

### Tests

Use `vitest`.

Required test areas:

- Schema validation.
- Privacy redaction.
- Atomic file handoff.
- Policy precedence.
- Fake adapter behavior.
- CLI command smoke tests.

### Build

Use `tsup` for building CLI output.

Reason: simple TypeScript bundling without heavy config.

### MCP

MCP is implemented as a safe local surface, not a provider-control surface.

Current command:

```bash
vibe mcp
```

It starts a stdio MCP server with tools for local state inspection, policy explanation, listing supported workflow modes, and setting a workflow vibe.

It must not expose:

```text
provider APIs
OAuth tokens
cookies
raw source code
raw logs
browser data
arbitrary shell access
```

Reason: MCP is useful only if it reinforces the trust boundary. It lets an agent express ambient workflow intent without turning Coding Vibe into an arbitrary automation proxy.

## Repository Structure

```text
.
├── package.json
├── tsconfig.json
├── tsup.config.ts
├── vitest.config.ts
├── README.md
├── LICENSE
├── LICENSE.schemas
├── schemas/
│   └── workflow-state.schema.json
├── examples/
│   ├── workflow-state.min.json
│   ├── workflow-state.full.json
│   ├── policy.default.json
│   └── candidates.fake.json
├── src/
│   ├── cli.ts
│   ├── commands/
│   │   ├── init.ts
│   │   ├── dev.ts
│   │   ├── state.ts
│   │   ├── validate.ts
│   │   ├── explain.ts
│   │   └── mcp.ts
│   ├── schema/
│   │   ├── load-schema.ts
│   │   └── validate-state.ts
│   ├── state/
│   │   ├── atomic-write.ts
│   │   ├── read-state.ts
│   │   └── redact.ts
│   ├── watcher/
│   │   └── fake-watcher.ts
│   ├── policy/
│   │   ├── evaluate-policy.ts
│   │   └── default-policy.ts
│   ├── adapters/
│   │   ├── types.ts
│   │   ├── fake-adapter.ts
│   │   └── local-adapter.ts
│   └── tui/
│       ├── dashboard.ts
│       └── keybindings.ts
└── tests/
    ├── schema.test.ts
    ├── privacy.test.ts
    ├── atomic-write.test.ts
    ├── policy.test.ts
    ├── fake-adapter.test.ts
    └── cli.test.ts
```

## Core Types

### Workflow State

```ts
type WorkflowMode =
  | "unknown"
  | "deep_work"
  | "planning"
  | "debugging"
  | "reviewing"
  | "writing"
  | "waiting_ci"
  | "idle";

type WorkflowState = {
  schema_version: "1.0.0";
  producer: "coding-vibe";
  generated_at: string;
  ttl_ms: number;
  workflow: {
    mode: WorkflowMode;
    phase?: string;
    momentum?: "moving" | "blocked" | "waiting" | "unknown";
    confidence: number;
    signals: string[];
  };
  safety: {
    redactions_applied: string[];
    forbidden_fields_seen: boolean;
  };
};
```

### Adapter SPI

```ts
type AdapterCapability =
  | "pause"
  | "next"
  | "candidate_selection"
  | "play_local_file"
  | "personalized_seed"
  | "no_song_level_control";

type SafeCandidate = {
  id: string;
  labels: string[];
  traits: {
    energy?: "low" | "medium" | "high";
    tempo?: "slow" | "medium" | "fast";
    vocals?: "none" | "low" | "medium" | "high";
    familiarity?: "new" | "familiar" | "heavy_rotation";
  };
  source: "fake" | "local_library" | "personalized_seed";
};

type MusicAdapter = {
  id: string;
  stability: "official" | "semi_official" | "unofficial" | "local_only" | "fake";
  capabilities(): AdapterCapability[];
  listCandidates(state: WorkflowState): Promise<SafeCandidate[]>;
  playCandidate(candidateId: string, reason: string): Promise<void>;
  pause(): Promise<void>;
  next(): Promise<SafeCandidate | null>;
};
```

V1 ships only `fake` and maybe `local`.

Provider plugins such as Spotify, NetEase Cloud Music, QQ Music, MPD, and VLC come later.

## Commands

### `vibe init`

Creates:

- `.vibe/policy.json`
- `.vibe/candidates.fake.json`
- `.vibe/vibe-state.json`

It must not inspect source files.

### `vibe dev --fake`

Runs:

- Fake watcher.
- Safe state writer.
- Policy evaluator.
- Fake adapter.
- TUI dashboard.

It cycles through sample workflow events so users can see state transitions immediately.

### `vibe state`

Prints current state summary:

```text
mode=debugging confidence=0.78 generated=21s ago redactions=0
signals: pytest failed twice; same module edited repeatedly
```

### `vibe explain`

Prints why the adapter did what it did:

```text
matched_rule=debugging-caution
reason=workflow.mode=debugging matched rule debugging-caution
action=fake_music_state mood=low_distraction candidate=local-ambient-02
```

### `vibe validate`

Validates:

- State schema.
- Policy file.
- Candidate file.
- Privacy rules.

### `vibe mcp`

Placeholder in first slice. Implement after CLI loop works.

## Implementation Slices

### Slice 1: Project Scaffold

- Create package metadata.
- Add TypeScript config.
- Add Vitest.
- Add `vibe` CLI entrypoint.
- Add `vibe --help`.

Definition of done:

- `npm test` runs.
- `npm run build` runs.
- `node dist/cli.js --help` works.

### Slice 2: Schema And Examples

- Add `workflow-state.schema.json`.
- Add minimal and full example states.
- Add `validate-state` module.

Definition of done:

- Valid examples pass.
- Invalid examples fail with useful messages.

### Slice 3: Policy Engine

- Add ordered first-match policy evaluator.
- Add fallback rule requirement.
- Add explain output.

Definition of done:

- First match wins.
- No match uses fallback.
- Same input produces same output.

### Slice 4: Fake Watcher And Atomic State

- Add fake event source.
- Convert events to safe state.
- Write `vibe-state.json.tmp` then rename.

Definition of done:

- Partial temp file is never read.
- Expired state becomes unknown.
- Forbidden fields are dropped.

### Slice 5: Fake Adapter

- Add fake candidate list.
- Add play/pause/next behavior.
- Write `adapter-log.jsonl`.

Definition of done:

- Adapter never calls network.
- Adapter only receives safe candidate IDs.
- `next` rotates candidates deterministically.

### Slice 6: CLI Commands

- Implement `init`.
- Implement `dev --fake`.
- Implement `state`.
- Implement `explain`.
- Implement `validate`.
- Add `mcp` placeholder.

Definition of done:

- New user can run the quick start from an empty directory.
- Time to first state is under 2 minutes.

### Slice 7: TUI

- Add terminal dashboard.
- Add keybindings: `space`, `n`, `,`, `e`, `s`, `q`.
- Keep output readable without color.
- Keep default UI compact enough to sit beside an editor or terminal pane.

Definition of done:

- TUI works in a normal terminal.
- Non-interactive CLI commands still work in CI.

### Slice 8: README And Validation Script

- Add quick start.
- Add privacy model.
- Add non-goals.
- Add external validation task script.

Definition of done:

- A tester can complete the scripted flow without private explanation.

## UI/UX Decision

TUI is the right V1 front end.

Reason:

- The first users are developers already in terminals.
- It keeps the product local and inspectable.
- It avoids browser UI, auth screens, and styling work.
- It tests the core loop without requiring real provider integration.

The UI is intentionally small:

- Current music or fake candidate.
- Current workflow state.
- Connection status.
- Next round.
- Play/pause.
- Settings.
- Explain.

That is enough. Anything more belongs after V1 validation.

## Risks

- TUI key handling can be flaky on Windows terminals.
- Fake watcher might feel too artificial unless sample events are realistic.
- Users may ask for real provider connection before workflow-state value is proven.
- Experimental provider adapters can blur the V1 trust story if they are presented as default product surface.
- `vibe` package name may be unavailable.

## Open Questions

- Final package name: `coding-vibe`.
- Whether `local` adapter should ship before external provider adapters become more prominent.
- Whether to use `ink` after plain terminal prototype.
- Whether experimental Spotify and NetEase commands should move behind plugin/package boundaries before distribution.

## Next Action

Start Slice 1 and Slice 2.

Do not start OAuth, broad provider plugins, or LLM selection until the CLI/TUI fake loop is validated. Keep the existing MCP server limited to safe local state tools, and keep existing Spotify/NetEase commands clearly labeled experimental.
