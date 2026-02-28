import { type Tool } from "@modelcontextprotocol/sdk/types.js";

export const ACCOUNT_AUTHENTICATE_TOOL: Tool = {
  name: "google_account_authenticate",
  description:
    "Authenticate a new Google account via OAuth. Opens a browser window for the user to log in. Returns the email of the authenticated account, which should then be used as the accountId parameter in all other tools.",
  inputSchema: {
    type: "object",
    properties: {},
  },
};

export const ACCOUNT_LIST_TOOL: Tool = {
  name: "google_account_list",
  description:
    "List all authenticated Google accounts and which one is the default. Use this to discover valid accountId values required by all other tools.",
  inputSchema: {
    type: "object",
    properties: {},
  },
};

export const ACCOUNT_SET_DEFAULT_TOOL: Tool = {
  name: "google_account_set_default",
  description:
    "Set the default Google account. The default is used as a fallback but all service tools require an explicit accountId.",
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
    "Remove an authenticated Google account and delete its stored tokens. The account will no longer be usable as an accountId in other tools.",
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
