import { type Tool } from "@modelcontextprotocol/sdk/types.js";

export const ACCOUNT_AUTHENTICATE_TOOL: Tool = {
  name: "google_account_authenticate",
  description:
    "Authenticate a new Google account via OAuth. Opens a browser window for the user to log in. Returns the email of the authenticated account.",
  inputSchema: {
    type: "object",
    properties: {},
  },
};

export const ACCOUNT_LIST_TOOL: Tool = {
  name: "google_account_list",
  description:
    "List all authenticated Google accounts, showing which one is the current default.",
  inputSchema: {
    type: "object",
    properties: {},
  },
};

export const ACCOUNT_SET_DEFAULT_TOOL: Tool = {
  name: "google_account_set_default",
  description:
    "Set the default Google account used when no accountId is specified in tool calls.",
  inputSchema: {
    type: "object",
    properties: {
      accountId: {
        type: "string",
        description: "Email of the Google account to set as the default.",
      },
    },
    required: ["accountId"],
  },
};

export const ACCOUNT_REMOVE_TOOL: Tool = {
  name: "google_account_remove",
  description:
    "Remove an authenticated Google account and delete its stored tokens.",
  inputSchema: {
    type: "object",
    properties: {
      accountId: {
        type: "string",
        description: "Email of the Google account to remove.",
      },
    },
    required: ["accountId"],
  },
};

export const accountTools = [
  ACCOUNT_AUTHENTICATE_TOOL,
  ACCOUNT_LIST_TOOL,
  ACCOUNT_SET_DEFAULT_TOOL,
  ACCOUNT_REMOVE_TOOL,
];
