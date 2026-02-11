import { type Tool } from "@modelcontextprotocol/sdk/types.js";

export const REFRESH_TOKENS_TOOL: Tool = {
  name: "google_oauth_refresh_tokens",
  description: "Refresh OAuth access tokens and update them in the token file",
  inputSchema: {
    type: "object",
    properties: {
      accountId: {
        type: "string",
        description:
          "Email of the Google account to refresh tokens for. If omitted, refreshes the default account.",
      },
    },
  },
};

export const REAUTHENTICATE_TOOL: Tool = {
  name: "google_oauth_reauthenticate",
  description:
    "Delete existing tokens and start fresh OAuth authentication flow",
  inputSchema: {
    type: "object",
    properties: {
      accountId: {
        type: "string",
        description:
          "Email of the Google account to re-authenticate. If omitted, re-authenticates the default account.",
      },
    },
  },
};

export const oauthTools = [REFRESH_TOKENS_TOOL, REAUTHENTICATE_TOOL];
