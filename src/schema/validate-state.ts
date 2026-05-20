import Ajv2020Module, { type ErrorObject } from "ajv/dist/2020.js";
import addFormatsModule from "ajv-formats";
import schema from "../../schemas/workflow-state.schema.json" with { type: "json" };

export type ValidationResult =
  | { ok: true; errors: [] }
  | { ok: false; errors: string[] };

const Ajv2020 = Ajv2020Module.default;
const addFormats = addFormatsModule.default;
const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);

const validate = ajv.compile(schema);

export function validateWorkflowState(value: unknown): ValidationResult {
  const ok = validate(value);

  if (ok) {
    return { ok: true, errors: [] };
  }

  const errors = (validate.errors ?? []).map((error: ErrorObject) => {
    const path = error.instancePath || "/";
    return `${path} ${error.message ?? "is invalid"}`;
  });

  return { ok: false, errors };
}
