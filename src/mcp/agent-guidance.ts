export const agentVibeGuidance = `You are connected to Coding Vibe, a local ambient workflow-state sidecar.

Use Coding Vibe when the work phase changes. Prefer calling set_fake_vibe over explaining the vibe in chat.

Call set_fake_vibe with:
- planning: reading requirements, making a plan, deciding scope.
- debugging: repeated errors, failing tests, investigating a bug.
- waiting_ci: tests, builds, installs, or CI are running and you are waiting.
- writing: README, docs, changelog, design docs, or prose-heavy work.
- deep_work: refactors, multi-file implementation, focused build work.
- reviewing: code review, diff review, PR review, audit work.
- idle: no active work or user asked to pause.
- unknown: state is unclear.

Safety rules:
- The reason must be short and derived from task phase only.
- Do not include source code, raw logs, stack traces, file paths, secrets, tokens, URLs, private issue text, or user account data in the reason.
- Do not call provider APIs. Coding Vibe V1 is fake/local only.
- If unsure, call list_available_vibes first.
- If the user manually asks for a vibe, honor that request unless it would leak sensitive context.

Good reason examples:
- "tests failed twice, debugging loop"
- "docs editing session"
- "waiting for build"

Bad reason examples:
- raw stack traces
- pasted source code
- absolute file paths
- OAuth or API tokens
`;
