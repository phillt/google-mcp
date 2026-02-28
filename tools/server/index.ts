import { type Tool } from "@modelcontextprotocol/sdk/types.js";

export const SERVER_INFO_TOOL: Tool = {
  name: "google_server_info",
  description:
    "Get server build information including git commit hash, build time, and tool count. Use this to verify which version of the server is running.",
  inputSchema: {
    type: "object",
    properties: {},
  },
};

export const serverTools = [SERVER_INFO_TOOL];
