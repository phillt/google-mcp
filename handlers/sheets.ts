import GoogleSheets from "../utils/sheets";
import {
  isGetSpreadsheetArgs,
  isGetValuesArgs,
  isUpdateValuesArgs,
  isAppendValuesArgs,
  isClearValuesArgs,
  isBatchGetValuesArgs,
  isAddSheetArgs,
} from "../utils/helper";

export async function handleSheetsGetSpreadsheet(
  args: any,
  googleSheetsInstance: GoogleSheets
) {
  if (!isGetSpreadsheetArgs(args)) {
    throw new Error("Invalid arguments for google_sheets_get_spreadsheet");
  }
  const { spreadsheetId, includeGridData } = args;
  const result = await googleSheetsInstance.getSpreadsheet(
    spreadsheetId,
    includeGridData
  );
  return {
    content: [{ type: "text", text: result }],
    isError: false,
  };
}

export async function handleSheetsGetValues(
  args: any,
  googleSheetsInstance: GoogleSheets
) {
  if (!isGetValuesArgs(args)) {
    throw new Error("Invalid arguments for google_sheets_get_values");
  }
  const { spreadsheetId, range } = args;
  const result = await googleSheetsInstance.getValues(spreadsheetId, range);
  return {
    content: [{ type: "text", text: result }],
    isError: false,
  };
}

export async function handleSheetsUpdateValues(
  args: any,
  googleSheetsInstance: GoogleSheets
) {
  if (!isUpdateValuesArgs(args)) {
    throw new Error("Invalid arguments for google_sheets_update_values");
  }
  const { spreadsheetId, range, values, valueInputOption } = args;
  const result = await googleSheetsInstance.updateValues(
    spreadsheetId,
    range,
    values,
    valueInputOption
  );
  return {
    content: [{ type: "text", text: result }],
    isError: false,
  };
}

export async function handleSheetsAppendValues(
  args: any,
  googleSheetsInstance: GoogleSheets
) {
  if (!isAppendValuesArgs(args)) {
    throw new Error("Invalid arguments for google_sheets_append_values");
  }
  const { spreadsheetId, range, values, valueInputOption } = args;
  const result = await googleSheetsInstance.appendValues(
    spreadsheetId,
    range,
    values,
    valueInputOption
  );
  return {
    content: [{ type: "text", text: result }],
    isError: false,
  };
}

export async function handleSheetsClearValues(
  args: any,
  googleSheetsInstance: GoogleSheets
) {
  if (!isClearValuesArgs(args)) {
    throw new Error("Invalid arguments for google_sheets_clear_values");
  }
  const { spreadsheetId, range } = args;
  const result = await googleSheetsInstance.clearValues(spreadsheetId, range);
  return {
    content: [{ type: "text", text: result }],
    isError: false,
  };
}

export async function handleSheetsBatchGetValues(
  args: any,
  googleSheetsInstance: GoogleSheets
) {
  if (!isBatchGetValuesArgs(args)) {
    throw new Error("Invalid arguments for google_sheets_batch_get_values");
  }
  const { spreadsheetId, ranges } = args;
  const result = await googleSheetsInstance.batchGetValues(
    spreadsheetId,
    ranges
  );
  return {
    content: [{ type: "text", text: result }],
    isError: false,
  };
}

export async function handleSheetsAddSheet(
  args: any,
  googleSheetsInstance: GoogleSheets
) {
  if (!isAddSheetArgs(args)) {
    throw new Error("Invalid arguments for google_sheets_add_sheet");
  }
  const { spreadsheetId, title } = args;
  const result = await googleSheetsInstance.addSheet(spreadsheetId, title);
  return {
    content: [{ type: "text", text: result }],
    isError: false,
  };
}
