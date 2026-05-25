import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { agentVibeGuidance } from "./agent-guidance.js";
import { explainPolicyText, getMusicProviderText, getWorkflowStateText, listAvailableVibesText, requestNextTrack, requestVolume, setFakeVibe, setMusicProvider, setMusicQuery, setVibe } from "./tools.js";
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

  server.tool("list_available_vibes", "List workflow modes supported by Coding Vibe adapters.", {}, async () => toolResult(listAvailableVibesText()));

  server.tool("get_music_provider", "Read the selected local music provider. This does not call provider APIs.", {}, async () => toolResult(await getMusicProviderText()));

  server.tool(
    "set_music_provider",
    "Select the local music provider for adapter processes. This writes settings only and does not call provider APIs.",
    {
      provider: z.enum(["fake", "netease"])
    },
    async ({ provider }) => toolResult(await setMusicProvider(provider))
  );

  server.tool("next_track", "Ask the local adapter daemon to switch to the next track. This writes settings only and does not call provider APIs.", {}, async () => toolResult(await requestNextTrack()));

  server.tool(
    "set_music_query",
    "Set the local NetEase search query for adapter processes. This writes settings only and does not call provider APIs.",
    { query: z.string().min(1).max(120) },
    async ({ query }) => toolResult(await setMusicQuery(query))
  );

  server.tool(
    "set_volume",
    "Ask the local adapter daemon to set playback volume from 0 to 100. This writes settings only and does not call provider APIs.",
    { volume: z.number().min(0).max(100) },
    async ({ volume }) => toolResult(await requestVolume(volume))
  );

  server.tool(
    "set_vibe",
    "Set the current workflow vibe. This writes only safe local workflow state and policy output.",
    {
      vibe: z.enum(["unknown", "deep_work", "planning", "debugging", "reviewing", "writing", "waiting_ci", "idle"]),
      reason: z.string().max(120).optional()
    },
    async ({ vibe, reason }) => toolResult(await setVibe(vibe as WorkflowMode, reason))
  );

  server.tool(
    "set_fake_vibe",
    "Deprecated alias for set_vibe. Use set_vibe for new agents.",
    {
      vibe: z.enum(["unknown", "deep_work", "planning", "debugging", "reviewing", "writing", "waiting_ci", "idle"]),
      reason: z.string().max(120).optional()
    },
    async ({ vibe, reason }) => toolResult(await setFakeVibe(vibe as WorkflowMode, reason))
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
