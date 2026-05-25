# Agent Instructions

## Coding Vibe MCP

When the Coding Vibe MCP server is available, agents should keep the local workflow-state sidecar current by calling `set_vibe` when the work phase changes.

Older Coding Vibe builds may expose `set_fake_vibe` instead. Treat that as a deprecated compatibility alias for the same workflow-state setter, not as a statement that the active adapter must be fake.

Use these modes:

- `planning`: reading requirements, deciding scope, or forming an implementation approach.
- `debugging`: reproducing bugs, tracing failures, or investigating root cause.
- `deep_work`: editing code, refactoring, or implementing focused changes.
- `waiting_ci`: running tests, typecheck, build, audit, or other verification commands.
- `reviewing`: reviewing diffs, checking merge readiness, or assessing risk.
- `writing`: updating docs, changelog, plans, or prose-heavy artifacts.
- `idle`: pausing work or waiting on the user.

Keep `reason` short and derived. Do not include source code, raw logs, stack traces, file paths, URLs, tokens, cookies, account data, or secrets in the reason.

Minimum expected calls during non-trivial work:

- Call once at the start of investigation or implementation.
- Call again before long-running verification.
- Call again when switching to review or merge-readiness assessment.

The point is not music control. The point is keeping `vibe-state.json` useful and inspectable during agent-driven coding loops.
