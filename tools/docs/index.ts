import { type Tool } from "@modelcontextprotocol/sdk/types.js";

const accountIdProperty = {
  accountId: {
    type: "string",
    description:
      "Required. Email address of the Google account to use. Use google_account_list to see authenticated accounts, or google_account_authenticate to add a new account.",
  },
};

export const GET_DOCUMENT_TOOL: Tool = {
  name: "google_docs_get_document",
  description:
    "Get a Google Doc's title and full plain-text content (including table text)",
  inputSchema: {
    type: "object",
    properties: {
      documentId: {
        type: "string",
        description: "ID of the Google Doc",
      },
      ...accountIdProperty,
    },
    required: ["documentId", "accountId"],
  },
};

export const CREATE_DOCUMENT_TOOL: Tool = {
  name: "google_docs_create_document",
  description:
    "Create a new Google Doc with an optional initial text body",
  inputSchema: {
    type: "object",
    properties: {
      title: {
        type: "string",
        description: "Title of the new document",
      },
      content: {
        type: "string",
        description: "Optional initial text content to insert into the document",
      },
      ...accountIdProperty,
    },
    required: ["title", "accountId"],
  },
};

export const APPEND_TEXT_TOOL: Tool = {
  name: "google_docs_append_text",
  description: "Append text to the end of a Google Doc",
  inputSchema: {
    type: "object",
    properties: {
      documentId: {
        type: "string",
        description: "ID of the Google Doc",
      },
      text: {
        type: "string",
        description: "Text to append at the end of the document",
      },
      ...accountIdProperty,
    },
    required: ["documentId", "text", "accountId"],
  },
};

export const REPLACE_TEXT_TOOL: Tool = {
  name: "google_docs_replace_text",
  description:
    "Find and replace all occurrences of a text string in a Google Doc. Useful for template filling.",
  inputSchema: {
    type: "object",
    properties: {
      documentId: {
        type: "string",
        description: "ID of the Google Doc",
      },
      findText: {
        type: "string",
        description: "Text to search for",
      },
      replaceText: {
        type: "string",
        description: "Text to replace with",
      },
      matchCase: {
        type: "boolean",
        description: "Whether the search is case-sensitive (default: true)",
      },
      ...accountIdProperty,
    },
    required: ["documentId", "findText", "replaceText", "accountId"],
  },
};

export const INSERT_TEXT_TOOL: Tool = {
  name: "google_docs_insert_text",
  description:
    "Insert text at a specific character index in a Google Doc. Index 1 is the start of the document body.",
  inputSchema: {
    type: "object",
    properties: {
      documentId: {
        type: "string",
        description: "ID of the Google Doc",
      },
      text: {
        type: "string",
        description: "Text to insert",
      },
      index: {
        type: "number",
        description:
          "Character index to insert at (1 = start of document body)",
      },
      ...accountIdProperty,
    },
    required: ["documentId", "text", "index", "accountId"],
  },
};

export const docsTools = [
  GET_DOCUMENT_TOOL,
  CREATE_DOCUMENT_TOOL,
  APPEND_TEXT_TOOL,
  REPLACE_TEXT_TOOL,
  INSERT_TEXT_TOOL,
];
