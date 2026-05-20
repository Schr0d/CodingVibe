import { STATE_FILE, vibePath } from "../paths.js";
import { readWorkflowState, summarizeState } from "../state/read-state.js";

export async function stateCommand(): Promise<void> {
  const state = await readWorkflowState(vibePath(STATE_FILE));
  console.log(summarizeState(state));
}
