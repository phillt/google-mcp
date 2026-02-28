import { type Tool } from "@modelcontextprotocol/sdk/types.js";

const accountIdProperty = {
  accountId: {
    type: "string",
    description:
      "Required. Email address of the Google account to use. Use google_account_list to see authenticated accounts, or google_account_authenticate to add a new account.",
  },
};

export const GET_SPREADSHEET_TOOL: Tool = {
  name: "google_sheets_get_spreadsheet",
  description:
    "Get spreadsheet metadata including title, URL, and list of sheets with their dimensions",
  inputSchema: {
    type: "object",
    properties: {
      spreadsheetId: {
        type: "string",
        description: "ID of the spreadsheet",
      },
      includeGridData: {
        type: "boolean",
        description:
          "Whether to include grid data (cell contents). Default: false",
      },
      ...accountIdProperty,
    },
    required: ["spreadsheetId", "accountId"],
  },
};

export const GET_VALUES_TOOL: Tool = {
  name: "google_sheets_get_values",
  description:
    "Read cell values from a spreadsheet range using A1 notation (e.g., 'Sheet1!A1:D10')",
  inputSchema: {
    type: "object",
    properties: {
      spreadsheetId: {
        type: "string",
        description: "ID of the spreadsheet",
      },
      range: {
        type: "string",
        description:
          "A1 notation range to read (e.g., 'Sheet1!A1:D10', 'A1:B5')",
      },
      ...accountIdProperty,
    },
    required: ["spreadsheetId", "range", "accountId"],
  },
};

export const UPDATE_VALUES_TOOL: Tool = {
  name: "google_sheets_update_values",
  description:
    "Write a 2D array of values to a spreadsheet range. Overwrites existing data in the range.",
  inputSchema: {
    type: "object",
    properties: {
      spreadsheetId: {
        type: "string",
        description: "ID of the spreadsheet",
      },
      range: {
        type: "string",
        description: "A1 notation range to write to (e.g., 'Sheet1!A1:D3')",
      },
      values: {
        type: "array",
        items: {
          type: "array",
          items: {},
        },
        description:
          'A 2D array of values to write (rows × columns), e.g., [["Name","Age"],["Alice",30]]',
      },
      valueInputOption: {
        type: "string",
        description:
          "How to interpret input values: 'USER_ENTERED' (default, parses formulas/dates) or 'RAW'",
      },
      ...accountIdProperty,
    },
    required: ["spreadsheetId", "range", "values", "accountId"],
  },
};

export const APPEND_VALUES_TOOL: Tool = {
  name: "google_sheets_append_values",
  description:
    "Append rows after the last row with data in a spreadsheet range",
  inputSchema: {
    type: "object",
    properties: {
      spreadsheetId: {
        type: "string",
        description: "ID of the spreadsheet",
      },
      range: {
        type: "string",
        description:
          "A1 notation range indicating the table to append to (e.g., 'Sheet1!A:D')",
      },
      values: {
        type: "array",
        items: {
          type: "array",
          items: {},
        },
        description:
          'Rows to append as a 2D array, e.g., [["Alice",30],["Bob",25]]',
      },
      valueInputOption: {
        type: "string",
        description:
          "How to interpret input values: 'USER_ENTERED' (default) or 'RAW'",
      },
      ...accountIdProperty,
    },
    required: ["spreadsheetId", "range", "values", "accountId"],
  },
};

export const CLEAR_VALUES_TOOL: Tool = {
  name: "google_sheets_clear_values",
  description:
    "Clear cell values in a range (preserves formatting). Does not delete rows/columns.",
  inputSchema: {
    type: "object",
    properties: {
      spreadsheetId: {
        type: "string",
        description: "ID of the spreadsheet",
      },
      range: {
        type: "string",
        description: "A1 notation range to clear (e.g., 'Sheet1!A1:D10')",
      },
      ...accountIdProperty,
    },
    required: ["spreadsheetId", "range", "accountId"],
  },
};

export const BATCH_GET_VALUES_TOOL: Tool = {
  name: "google_sheets_batch_get_values",
  description: "Read multiple ranges from a spreadsheet in a single request",
  inputSchema: {
    type: "object",
    properties: {
      spreadsheetId: {
        type: "string",
        description: "ID of the spreadsheet",
      },
      ranges: {
        type: "array",
        items: { type: "string" },
        description:
          "Array of A1 notation ranges to read (e.g., ['Sheet1!A1:B5', 'Sheet2!A1:C3'])",
      },
      ...accountIdProperty,
    },
    required: ["spreadsheetId", "ranges", "accountId"],
  },
};

export const ADD_SHEET_TOOL: Tool = {
  name: "google_sheets_add_sheet",
  description: "Add a new sheet (tab) to an existing spreadsheet",
  inputSchema: {
    type: "object",
    properties: {
      spreadsheetId: {
        type: "string",
        description: "ID of the spreadsheet",
      },
      title: {
        type: "string",
        description: "Name for the new sheet tab",
      },
      ...accountIdProperty,
    },
    required: ["spreadsheetId", "title", "accountId"],
  },
};

export const sheetsTools = [
  GET_SPREADSHEET_TOOL,
  GET_VALUES_TOOL,
  UPDATE_VALUES_TOOL,
  APPEND_VALUES_TOOL,
  CLEAR_VALUES_TOOL,
  BATCH_GET_VALUES_TOOL,
  ADD_SHEET_TOOL,
];
