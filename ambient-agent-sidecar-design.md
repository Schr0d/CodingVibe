<!-- /autoplan restore point: original document captured in conversation before review -->

# Ambient Agent Sidecar Design

## Position

This is not a music toy. It is a local, auditable workflow-state sidecar for coding agents.

It watches safe development signals, reduces them into a small state object, and maps that state to an ambient work-mode intent. Music control is one possible adapter behind the policy layer, not the product core.

The durable product artifact is the inspectable workflow-state contract.

## Goal

Build an open source / research project that proves two linked hypotheses:

> Usefulness: agent-heavy developers benefit from ambient, glanceable workflow state during coding loops.

> Trust: they will run a local sidecar that observes safe workflow signals if the state is inspectable and does not expose source code, secrets, OAuth tokens, or raw agent context.

The first version validates workflow usefulness and trust boundaries, not provider integrations.

## Demand Hypothesis

Agent-heavy developers lose situational awareness during long-running coding loops: tests run in the background, CI finishes unnoticed, agents stall, docs and writing mode get interrupted, and debugging or refactor phases blur together.

V1 tests whether a local, inspectable workflow-state sidecar is useful enough to keep running even before real music or provider integrations exist.

## Non-Goals For V1

- No Spotify OAuth.
- No Apple Music integration.
- No YouTube Music integration.
- No real music provider adapters.
- No arbitrary provider API proxy.
- No LLM inference.
- No cloud sync.
- No account system.
- No raw coding-agent transcript ingestion.
- No prompt capture.
- No source-code capture.
- No terminal-output capture.
- No browser-history capture.
- No automatic editor-buffer capture.
- No source code sent to an LLM.
- No tokens, cookies, refresh tokens, or credential material in model context.
- No claim that the system detects human emotion.

## License Posture

Use a split license:

- Core daemon / sidecar / policy engine: `AGPL-3.0-or-later`.
- Schemas, examples, sample vibe packs, and fake adapters: permissive license such as `MIT` or `Apache-2.0`.

Reason: the trust boundary should remain auditable and hard to close-source as a hosted service, while the state format and examples should spread easily.

## Product Thesis

The product observes the development process, not the developer's private thoughts.

Useful state examples:

- Tests failing repeatedly.
- CI running.
- Same module edited many times.
- Long idle period while checks run.
- Commit created.
- Documentation files active.
- Large refactor detected.

Unsafe or unnecessary data:

- Full source code.
- Full terminal history.
- Raw agent logs.
- OAuth tokens.
- Browser cookies.
- Private issue text.
- API request payloads.

## Status Quo

Today users rely on fragmented signals: terminal output, IDE badges, CI tabs, agent logs, shell prompts, notifications, and manual playlist or focus switching.

These require active attention, expose too much raw context, or are not aware of agent-driven workflow phases.

This project replaces attention-heavy monitoring with a small local state object and deterministic policy actions.

## First User

The first user is a developer using coding agents daily for long-running loops: debugging, test-fix cycles, CI waits, refactors, docs passes, or parallel worktrees.

They are comfortable running local tools, distrust broad context ingestion, and already lose attention to terminals, CI tabs, or agent logs.

They are not looking for a better music player. They want their development environment to feel aware without becoming invasive.

## V1 Architecture

```text
Explicit sample events / fake watcher
        |
        v
Context Watcher
        |
        v
Safe State Extractor
        |
        | validates against workflow-state.schema.json
        | writes vibe-state.json.tmp
        | atomic rename
        v
vibe-state.json
        |
        v
Vibe Policy Engine
        |
        | ordered first-match rules
        | emits matched_rule_id + reason
        v
Fake Adapter
        |
        v
adapter-log.jsonl / CLI output
```

V1 intentionally excludes OAuth, real provider integrations, LLM inference, cloud sync, and hidden capture of prompts, source code, terminal output, browser state, or editor buffers.

The fake adapter is not a placeholder. It is the validation surface for proving whether workflow-state is useful, understandable, safe, and controllable before any external integration exists.

Console output is acceptable, but a terminal status line, local dashboard, tray indicator, or text-mode now-playing surface is preferred if cheap.

The first adapter prints decisions:

```text
[21:43] Detected: test_failed_loop
Switch ambient intent: debugging / low vocal / 80-100 bpm
Reason: pytest failed 3 times, same module edited repeatedly
```

## Workflow-State Schema

V1 ships `workflow-state.schema.json` as a first-class artifact.

Required top-level fields:

```json
{
  "schema_version": "1.0.0",
  "producer": "coding-vibe",
  "generated_at": "2026-05-20T00:00:00Z",
  "ttl_ms": 30000,
  "workflow": {
    "mode": "unknown | deep_work | planning | debugging | reviewing | idle",
    "phase": "test_failed",
    "momentum": "blocked",
    "confidence": 0.78,
    "signals": [
      "pytest failed twice",
      "same file edited repeatedly",
      "no commits in 45min"
    ]
  },
  "safety": {
    "redactions_applied": [],
    "forbidden_fields_seen": false
  }
}
```

The state object and schema are first-class product artifacts. Users and researchers should be able to inspect, diff, replay, and build adapters against them without running the AGPL daemon.

Compatibility rules:

- Readers must reject unsupported major versions.
- Readers must ignore unknown fields on the same major version.
- Producers must include `generated_at` and `ttl_ms`.
- Consumers must treat expired state as `unknown`.
- Invalid JSON must fail closed to the fallback policy.

State rules:

- Evidence must be short and derived, not copied raw.
- File paths should be optional and redacted by default.
- Command output should be summarized, not stored.
- State should be inspectable on disk before any adapter acts.

## Privacy Rules

Safe State Extractor uses an allowlist model.

Allowed:

- Derived workflow mode.
- Confidence score.
- Coarse activity class.
- Timestamps.
- Redaction metadata.
- Local schema version.

Allowed only if redacted or hashed:

- Repository identifier.
- Branch category.
- Tool name.
- Agent name.

Forbidden in V1:

- Raw prompts.
- Chat transcripts.
- Source code.
- Terminal output.
- Absolute file paths.
- File contents.
- Browser URLs.
- API keys, tokens, cookies, secrets.
- OAuth credentials.
- Provider account identifiers.

If forbidden input is detected, the extractor must drop it, set `safety.forbidden_fields_seen=true`, and include the redaction category without storing the original value.

## Vibe Policy V1

Start with rules, not an LLM.

Policies are ordered rules with first-match semantics.

Each rule has:

- `id`
- `when`
- `then`
- `reason`

If multiple rules could match, the first rule wins. If no rule matches, the engine uses the required fallback rule.

Every policy evaluation emits:

```json
{
  "matched_rule_id": "debugging-caution",
  "reason": "workflow.mode=debugging matched rule debugging-caution",
  "adapter_action": {
    "kind": "fake_music_state",
    "mood": "low_distraction"
  }
}
```

Policy evaluation must be deterministic for the same input state and policy file.

Initial policy:

```text
if tests_failed_repeatedly and same_file_edit_count > 5:
    vibe = "debugging"
elif ci_running and no_user_input_for_5min:
    vibe = "waiting_ci"
elif commit_created or tests_passed:
    vibe = "ship_it"
elif documentation_files_active:
    vibe = "writing"
elif large_refactor_detected:
    vibe = "deep_work"
else:
    vibe = "neutral_focus"
```

LLM use can come later, but only after redaction and feature extraction. The LLM may map safe state to intent. It must not read tokens, raw code, raw logs, or arbitrary command output.

## Failure Modes

| Failure | Expected Behavior | User-Visible Output |
|---|---|---|
| Missing `vibe-state.json` | Use fallback unknown state | `No state file found. Using fallback policy.` |
| Invalid JSON | Fail closed to fallback | `State file is invalid JSON. Run vibe validate.` |
| Unsupported schema major | Reject state | `Unsupported workflow-state schema version.` |
| Expired state | Treat as unknown | `State is stale. Last generated 94s ago.` |
| Policy has no match | Use fallback rule | `No policy matched. Applied fallback.` |
| Adapter fails | Log failure, do not retry forever | `Fake adapter failed. See adapter-log.jsonl.` |
| Forbidden data detected | Redact and continue | `Forbidden input was dropped by Safe State Extractor.` |

## Trust Boundaries

Model can see:

- Available high-level actions.
- Safe state summaries.
- Policy labels.
- Vibe names.

Model cannot see:

- OAuth tokens.
- Refresh tokens.
- Provider API credentials.
- Raw source code.
- Raw logs.
- Browser cookies.
- Arbitrary provider API endpoints.

Provider integrations, when added, go behind an Auth Broker.

```text
Vibe Policy Engine
        ↓
Music MCP Server
        ↓
Auth Broker
        ↓
Music Provider
```

## Music MCP Server Scope

Allowed high-level tools:

```text
list_available_vibes()
set_vibe(vibe, reason?)
skip_track()
lower_energy()
raise_energy()
pause()
```

Disallowed tools:

```text
call_spotify_api(endpoint, payload)
read_token(provider)
refresh_token(provider)
execute_provider_request(raw_request)
```

The model expresses intent. The broker executes provider-specific actions.

V1 MCP should be read-only for state and policy inspection, plus fake-adapter control only. It must have no external side effects.

## Agent Song Selection Boundary

Agents may choose ambient intent. They should not get direct provider API access.

Safe agent-controlled choices:

- `set_vibe(vibe="debugging")`
- `lower_energy()`
- `raise_energy()`
- `pause()`
- `choose_from_candidates(candidate_ids=[...])`

Unsafe agent-controlled choices:

- Raw provider search queries built from private work context.
- Arbitrary playlist mutation.
- Arbitrary provider API calls.
- Direct access to user listening history.
- Direct access to OAuth tokens or provider account identifiers.

If song-level selection ships later, the adapter should expose a sanitized candidate set first:

```json
{
  "capabilities": ["play_playlist", "skip", "pause", "candidate_selection"],
  "candidates": [
    { "id": "local-ambient-01", "labels": ["instrumental", "low_energy", "debugging"] },
    { "id": "local-ambient-02", "labels": ["no_vocals", "steady", "deep_work"] }
  ]
}
```

The agent can pick `local-ambient-01`; it cannot see provider IDs, account data, listening history, or raw search results.

Provider SDK differences are handled by adapter capability profiles. The policy engine asks what the adapter supports, then degrades gracefully.

Capability examples:

- `pause`
- `skip`
- `play_named_playlist`
- `play_local_file`
- `candidate_selection`
- `energy_adjustment`
- `no_song_level_control`

The product should never assume Spotify-class capabilities are universal. Apple Music, YouTube Music, local players, and regional providers may expose different controls, auth models, and API limits.

## Personalized Recommendation Seed

The best version should not start from generic focus music. It should start from the user's actual taste.

After a real provider account is connected, the adapter may use the provider's personalized recommendations as an initial seed for the work persona. This is allowed only through a privacy-reduced recommendation profile, not by putting raw account data into model context.

Allowed model-visible seed data:

- Sanitized candidate IDs.
- Coarse audio traits such as energy, tempo band, vocal density, acoustic/electronic, steadiness, and familiarity.
- User-safe labels such as `liked_by_user`, `often_recommended`, `recently_played_category`, or `work_compatible`.
- Provider capability flags.

Forbidden model-visible seed data:

- OAuth tokens.
- Provider account identifiers.
- Full listening history.
- Private playlists by name unless explicitly allowlisted.
- Raw recommendation API responses.
- Friend/social graph data.
- Location, demographic, or advertising profile data.

Recommended flow:

```text
Provider Recommendation API
        ↓
Provider Adapter
        ↓
Recommendation Sanitizer
        ↓
Personal Taste Profile
        ↓
Policy / Optional LLM Selector
        ↓
Candidate ID Selection
        ↓
Provider Adapter Playback
```

The model can know that candidate `c17` is familiar, low-vocal, medium energy, and frequently recommended to the user. It should not know the provider account, raw track URI, playlist names, or the full listening trail that produced that recommendation.

This makes personalization a feature without collapsing the trust boundary. The product should feel like "your coding music taste," not a generic playlist generator.

## Packaging And Install

V1 ships as a single developer-facing package with CLI and MCP entrypoints.

Primary onboarding path:

```bash
npx coding-vibe init
npx coding-vibe dev --fake
npx coding-vibe state
npx coding-vibe explain
```

Package contents:

- CLI entrypoint.
- MCP server entrypoint.
- `workflow-state.schema.json`.
- Example states.
- Example policies.
- Fake Music Adapter.
- Validation command.

V1 target platforms:

- macOS: supported.
- Linux: supported.
- Windows: supported only if file paths, atomic rename, and watcher behavior are tested in CI.

No native provider integrations ship in V1.

## Developer Experience

Time to first useful output target: under 2 minutes.

Quick Start must show:

1. Install/run command.
2. Generated `vibe-state.json`.
3. Policy decision explanation.
4. Fake adapter output.
5. How to edit one rule and see behavior change.

Required commands:

- `vibe init`: writes example policy and sample state.
- `vibe dev --fake`: runs fake watcher, policy engine, and fake adapter.
- `vibe state`: prints current workflow-state summary.
- `vibe validate`: validates state and policy files.
- `vibe explain`: explains the latest policy decision.
- `vibe mcp`: starts the MCP server.

Every error message must include problem, cause, and fix.

## Test Coverage

Required V1 tests:

Schema:

- Valid minimal state passes.
- Valid full state passes.
- Missing required fields fail.
- Unknown same-major fields are ignored.
- Unsupported major version is rejected.
- Expired state becomes unknown.

Privacy:

- Raw prompt input is dropped.
- Source code input is dropped.
- Absolute paths are redacted.
- Secrets/tokens are redacted.
- Redaction metadata does not contain original sensitive values.

File handoff:

- Atomic write produces valid final JSON.
- Partial temp file is never read as state.
- Missing state file uses fallback.
- Corrupt state file uses fallback.

Policy:

- First matching rule wins.
- Fallback rule is required.
- No-match uses fallback.
- Evaluation emits matched rule and reason.
- Same input produces same output.

MCP:

- Allowed read actions succeed.
- Disallowed write/provider actions fail.
- Error shape is stable.
- MCP cannot access forbidden fields.

CLI:

- Quick Start commands work from a clean checkout/package install.
- `vibe validate` catches schema and policy errors.
- `vibe explain` is understandable without reading docs.

Validation:

- 5-10 agent-heavy developers complete the scripted task.
- Capture time-to-first-state, time-to-first-policy-change, and trust objections.

## V1 Success Criteria

- Runs locally with no cloud dependency.
- User can inspect every state transition and its evidence.
- No sensitive leaks in state, logs, model context, or adapter payloads.
- At least 70% of transitions are judged correct or acceptable by the user.
- User reports at least one concrete workflow benefit: noticed CI/test completion sooner, recognized stuck/debugging state faster, avoided checking raw logs, or maintained focus better.
- At least 3 of 5 external testers would keep the sidecar running for another session with the fake adapter.
- Real provider integration remains unnecessary to validate the core workflow-state hypothesis.

## Validation Plan

Run three internal dogfood sessions:

1. Debugging loop: intentionally fail tests, edit the same module repeatedly, then fix it.
2. CI wait: run a long check with little input and verify `waiting_ci` state.
3. Writing mode: edit docs for 20 minutes and verify lower-energy writing state.

For each session, record:

- Detected states.
- Wrong transitions.
- Missing signals.
- Whether the printed vibe suggestion felt useful.
- Whether any sensitive data leaked into state output.

Then run 5-10 external sessions with agent-heavy developers. Compare against their status quo: terminal watching, CI dashboard, IDE notifications, manual music/focus switching, or no tool.

Measure whether the fake adapter changes behavior, not just whether transitions look plausible.

## External Validation Script

Recruit 5-10 developers who use AI agents heavily.

Each session:

1. Start from no context.
2. Run Quick Start.
3. Inspect generated `vibe-state.json`.
4. Run `vibe explain`.
5. Change one policy rule.
6. Observe fake adapter output change.
7. Break the schema intentionally.
8. Recover using `vibe validate`.
9. Answer whether they would allow this sidecar to run during real work.

Success criteria:

- Median time to first state: under 2 minutes.
- Median time to first policy edit: under 7 minutes.
- At least 7/10 understand what data is and is not captured.
- At least 6/10 say the inspectability makes the ambient behavior trustworthy.
- Zero testers believe V1 connects to real music providers.

## Roadmap

### V1: Fake Adapter Plus Inspectable State

- Context watcher.
- Safe state extractor.
- `workflow-state.schema.json`.
- Example states.
- `vibe-state.json`.
- Atomic file handoff.
- Rule-based vibe policy.
- Console or terminal fake adapter.
- Privacy audit command.
- CLI quick start.
- MCP inspection server.

### V2: Chosen From Validation

Pick the next adapter from user evidence:

- Local dashboard.
- Tray or notification surface.
- Local player adapter.
- Richer adapter ecosystem.

Do not assume local player is the next step unless V1 users explicitly ask for music control.

### V3: Auth Broker

- Add provider OAuth only if users explicitly demand real provider control.
- Store credentials in OS keychain or equivalent.
- Keep tokens fully outside model and MCP tool output.

### V4: Optional LLM Policy

- Let an LLM choose a vibe from safe state only.
- Keep deterministic rule fallback.
- Add redaction replay tests before any LLM policy ships.
- Log every model-visible field for auditability.

## Ecosystem Strategy

AGPL core protects the local daemon and policy engine. Permissive schemas, examples, fake adapters, and vibe packs make it easy for researchers and adapter authors to build around the state format without adopting the daemon license.

The durable interface is not a music API. It is the safe workflow-state schema and policy contract.

Provider integrations should use an SPI/plugin model. Core owns the safe workflow-state schema, policy engine, privacy rules, and adapter contract. Provider-specific adapters live outside core unless they are fake or local reference implementations.

Core should not assume any specific platform capability. Spotify, Apple Music, YouTube Music, NetEase Cloud Music, QQ Music, local players, and regional providers may expose different controls, recommendation surfaces, login flows, and API stability.

Adapter plugins declare:

- Provider kind.
- Stability level: `official`, `semi_official`, `unofficial`, or `local_only`.
- Capabilities.
- Privacy surface.
- Whether personalized seed is supported.
- Whether song-level candidate selection is supported.
- Whether the adapter can play without affecting provider recommendations.

Core degrades behavior from capability declarations. It must not special-case one provider as the universal model.

Reference providers:

- `fake`: validates policy and workflow-state without external side effects.
- `local`: plays local files or user-provided playlists without OAuth.

Future external plugins:

- `spotify`
- `apple_music`
- `youtube_music`
- `netease_cloud_music`
- `qq_music`
- `mpd`
- `vlc`

Non-official adapters, including likely NetEase Cloud Music or QQ Music integrations, should be marked experimental unless they use stable official APIs. They should not be default onboarding paths.

## Sharp Edge To Preserve

Do not let this become an arbitrary automation agent.

The whole project works because it refuses power:

- It does not read everything.
- It does not expose credentials.
- It does not proxy arbitrary APIs.
- It does not pretend to know the user's emotions.
- It only maps safe workflow state to ambient intent.

That restraint is the product.

## GSTACK REVIEW REPORT

| Phase | Scope | Verdict | Key Decisions |
|---|---|---|---|
| CEO | Strategy and scope | PASS WITH CHANGES | Reframed from music sidecar to inspectable workflow-state sidecar; kept fake adapter first. |
| Design | UI/visual | NOT APPLICABLE | No UI scope detected. Future dashboard/tray remains validation-dependent. |
| Engineering | Architecture and safety | PASS WITH CHANGES | Added schema versioning, privacy allowlist, atomic file handoff, deterministic policy semantics, and failure modes. |
| DX | CLI, install, validation | PASS WITH CHANGES | Added 2-minute quick start, CLI commands, packaging target, error-message expectations, and external validation script. |

Auto-decisions applied:

- Preserve AGPL core plus permissive schemas/examples.
- Preserve no OAuth, no provider integration, no LLM in V1.
- Make `workflow-state.schema.json` a first-class artifact.
- Use explicit sample/fake watcher input before real ambient capture.
- Use ordered first-match policy semantics with explain output.
- Keep V1 file-based and inspectable.

Taste decisions surfaced:

- Prefer `workflow-state` as the architecture term, while `vibe-state.json` can remain the default filename.
- Treat fake adapter as a serious validation surface, not throwaway scaffolding.
- Let V2 be chosen by validation rather than assuming local music player integration.
