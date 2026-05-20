import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { agentVibeGuidance } from "./agent-guidance.js";
import { explainPolicyText, getWorkflowStateText, listAvailableVibesText, setVibe } from "./tools.js";
import type { WorkflowMode } from "../types.js";

const toolResult = (text: string) => ({
  content: [{ type: "text" as const, text }]
});

export async function startMcpServer(): Promise<void> {
  const server = new McpServer({
    name: "coding-vibe",
    version: "0.0.0"
  });

  server.tool("get_workflow_state", "Read the current safe workflow-state summary.", {}, async () => toolResult(await getWorkflowStateText()));

  server.tool("explain_policy", "Explain the latest safe policy decision.", {}, async () => toolResult(await explainPolicyText()));

  server.tool("list_available_vibes", "List workflow modes supported by the local fake adapter.", {}, async () => toolResult(listAvailableVibesText()));

  server.tool(
    "set_vibe",
    "Set the local workflow vibe. This writes only safe local state and does not directly call any music provider.",
    {
      vibe: z.enum(["unknown", "deep_work", "planning", "debugging", "reviewing", "writing", "waiting_ci", "idle"]),
      reason: z.string().max(120).optional()
    },
    async ({ vibe, reason }) => toolResult(await setVibe(vibe as WorkflowMode, reason))
  );

  server.prompt("coding_vibe_agent_guidance", "Instructions for coding agents to choose workflow vibes safely.", () => ({
    description: "Use the coding agent's existing model to choose Coding Vibe workflow modes without exposing private context.",
    messages: [
      {
        role: "user" as const,
        content: {
          type: "text" as const,
          text: agentVibeGuidance
        }
      }
    ]
  }));

  const transport = new StdioServerTransport();
  await server.connect(transport);
}
