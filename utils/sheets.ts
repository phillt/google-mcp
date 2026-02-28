import { google } from "googleapis";

export default class GoogleSheets {
  private sheets: any;

  constructor(authClient: any) {
    this.sheets = google.sheets({ version: "v4", auth: authClient });
  }

  async getSpreadsheet(spreadsheetId: string, includeGridData: boolean = false) {
    try {
      const response = await this.sheets.spreadsheets.get({
        spreadsheetId,
        includeGridData,
      });

      const { properties, sheets, spreadsheetUrl } = response.data;
      const sheetList = (sheets || []).map((s: any) => {
        const p = s.properties;
        return `  - "${p.title}" (sheetId: ${p.sheetId}, ${p.gridProperties?.rowCount}x${p.gridProperties?.columnCount})`;
      });

      return `Spreadsheet: ${properties.title}\nURL: ${spreadsheetUrl}\nLocale: ${properties.locale}\nSheets:\n${sheetList.join("\n")}`;
    } catch (error) {
      throw new Error(
        `Failed to get spreadsheet: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  async getValues(spreadsheetId: string, range: string) {
    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId,
        range,
      });

      const rows = response.data.values;
      if (!rows || rows.length === 0) {
        return `Range "${range}": No data found.`;
      }

      const formatted = rows
        .map((row: any[], i: number) => `Row ${i + 1}: ${row.join(" | ")}`)
        .join("\n");

      return `Range "${range}" (${rows.length} rows):\n${formatted}`;
    } catch (error) {
      throw new Error(
        `Failed to get values: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  async updateValues(
    spreadsheetId: string,
    range: string,
    values: any[][],
    valueInputOption: string = "USER_ENTERED"
  ) {
    try {
      const response = await this.sheets.spreadsheets.values.update({
        spreadsheetId,
        range,
        valueInputOption,
        requestBody: { values },
      });

      return `Updated ${response.data.updatedCells} cells in range "${response.data.updatedRange}".`;
    } catch (error) {
      throw new Error(
        `Failed to update values: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  async appendValues(
    spreadsheetId: string,
    range: string,
    values: any[][],
    valueInputOption: string = "USER_ENTERED"
  ) {
    try {
      const response = await this.sheets.spreadsheets.values.append({
        spreadsheetId,
        range,
        valueInputOption,
        requestBody: { values },
      });

      const updates = response.data.updates;
      return `Appended ${updates.updatedCells} cells to range "${updates.updatedRange}".`;
    } catch (error) {
      throw new Error(
        `Failed to append values: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  async clearValues(spreadsheetId: string, range: string) {
    try {
      const response = await this.sheets.spreadsheets.values.clear({
        spreadsheetId,
        range,
        requestBody: {},
      });

      return `Cleared range "${response.data.clearedRange}".`;
    } catch (error) {
      throw new Error(
        `Failed to clear values: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  async batchGetValues(spreadsheetId: string, ranges: string[]) {
    try {
      const response = await this.sheets.spreadsheets.values.batchGet({
        spreadsheetId,
        ranges,
      });

      const results = (response.data.valueRanges || []).map((vr: any) => {
        const rows = vr.values;
        if (!rows || rows.length === 0) {
          return `Range "${vr.range}": No data found.`;
        }
        const formatted = rows
          .map((row: any[], i: number) => `  Row ${i + 1}: ${row.join(" | ")}`)
          .join("\n");
        return `Range "${vr.range}" (${rows.length} rows):\n${formatted}`;
      });

      return results.join("\n\n");
    } catch (error) {
      throw new Error(
        `Failed to batch get values: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  async addSheet(spreadsheetId: string, title: string) {
    try {
      const response = await this.sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [
            {
              addSheet: {
                properties: { title },
              },
            },
          ],
        },
      });

      const newSheet = response.data.replies[0].addSheet.properties;
      return `Added sheet "${newSheet.title}" (sheetId: ${newSheet.sheetId}) to spreadsheet.`;
    } catch (error) {
      throw new Error(
        `Failed to add sheet: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }
}
