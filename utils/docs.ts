import { google } from "googleapis";

export default class GoogleDocs {
  private docs: any;

  constructor(authClient: any) {
    this.docs = google.docs({ version: "v1", auth: authClient });
  }

  async getDocument(documentId: string) {
    try {
      const response = await this.docs.documents.get({ documentId });
      const doc = response.data;

      const text = this.extractText(doc.body?.content || []);

      return `Document: ${doc.title}\nID: ${doc.documentId}\n\n${text}`;
    } catch (error) {
      throw new Error(
        `Failed to get document: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  async createDocument(title: string, content?: string) {
    try {
      const createResponse = await this.docs.documents.create({
        requestBody: { title },
      });

      const documentId = createResponse.data.documentId;

      if (content) {
        await this.docs.documents.batchUpdate({
          documentId,
          requestBody: {
            requests: [
              {
                insertText: {
                  location: { index: 1 },
                  text: content,
                },
              },
            ],
          },
        });
      }

      return `Created document: ${title}\nID: ${documentId}\nURL: https://docs.google.com/document/d/${documentId}/edit`;
    } catch (error) {
      throw new Error(
        `Failed to create document: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  async appendText(documentId: string, text: string) {
    try {
      // Get current document to find the end index
      const doc = await this.docs.documents.get({ documentId });
      const endIndex = doc.data.body.content.slice(-1)[0]?.endIndex || 1;
      const insertIndex = endIndex - 1;

      await this.docs.documents.batchUpdate({
        documentId,
        requestBody: {
          requests: [
            {
              insertText: {
                location: { index: insertIndex },
                text,
              },
            },
          ],
        },
      });

      return `Appended ${text.length} characters to document "${doc.data.title}".`;
    } catch (error) {
      throw new Error(
        `Failed to append text: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  async replaceText(
    documentId: string,
    findText: string,
    replaceText: string,
    matchCase: boolean = true
  ) {
    try {
      const response = await this.docs.documents.batchUpdate({
        documentId,
        requestBody: {
          requests: [
            {
              replaceAllText: {
                containsText: {
                  text: findText,
                  matchCase,
                },
                replaceText,
              },
            },
          ],
        },
      });

      const occurrences =
        response.data.replies?.[0]?.replaceAllText?.occurrencesChanged || 0;
      return `Replaced ${occurrences} occurrence(s) of "${findText}" with "${replaceText}".`;
    } catch (error) {
      throw new Error(
        `Failed to replace text: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  async insertText(documentId: string, text: string, index: number) {
    try {
      await this.docs.documents.batchUpdate({
        documentId,
        requestBody: {
          requests: [
            {
              insertText: {
                location: { index },
                text,
              },
            },
          ],
        },
      });

      return `Inserted ${text.length} characters at index ${index}.`;
    } catch (error) {
      throw new Error(
        `Failed to insert text: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  private extractText(content: any[]): string {
    const parts: string[] = [];

    for (const element of content) {
      if (element.paragraph) {
        const paragraphText = (element.paragraph.elements || [])
          .map((e: any) => e.textRun?.content || "")
          .join("");
        parts.push(paragraphText);
      } else if (element.table) {
        for (const row of element.table.tableRows || []) {
          const cells = (row.tableCells || []).map((cell: any) => {
            const cellContent = (cell.content || [])
              .map((c: any) =>
                (c.paragraph?.elements || [])
                  .map((e: any) => e.textRun?.content?.trim() || "")
                  .join("")
              )
              .join("");
            return cellContent;
          });
          parts.push(cells.join(" | "));
        }
      }
    }

    return parts.join("");
  }
}
