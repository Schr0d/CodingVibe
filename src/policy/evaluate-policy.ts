import type { PolicyDecision, PolicyFile, PolicyRule, WorkflowState } from "../types.js";

export function evaluatePolicy(policy: PolicyFile, state: WorkflowState): PolicyDecision {
  const fallback = policy.rules.find((rule) => rule.when.always === true);

  if (!fallback) {
    throw new Error("Policy must include a fallback rule with when.always=true.");
  }

  const matched = policy.rules.find((rule) => matches(rule, state)) ?? fallback;

  return {
    matched_rule_id: matched.id,
    reason: `${formatWhen(matched)}; ${matched.reason}`,
    adapter_action: matched.then
  };
}

function matches(rule: PolicyRule, state: WorkflowState): boolean {
  if (rule.when.always === true) return true;

  return Object.entries(rule.when).every(([path, expected]) => getPath(state, path) === expected);
}

function getPath(value: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((current, key) => {
    if (current && typeof current === "object" && key in current) {
      return (current as Record<string, unknown>)[key];
    }
    return undefined;
  }, value);
}

function formatWhen(rule: PolicyRule): string {
  if (rule.when.always === true) return "fallback matched";
  return Object.entries(rule.when)
    .map(([key, value]) => `${key}=${String(value)}`)
    .join(", ");
}
