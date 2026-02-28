import GoogleDocs from "../utils/docs";
import {
  isGetDocumentArgs,
  isCreateDocumentArgs,
  isAppendTextArgs,
  isReplaceTextArgs,
  isInsertTextArgs,
} from "../utils/helper";

export async function handleDocsGetDocument(
  args: any,
  googleDocsInstance: GoogleDocs
) {
  if (!isGetDocumentArgs(args)) {
    throw new Error("Invalid arguments for google_docs_get_document");
  }
  const { documentId } = args;
  const result = await googleDocsInstance.getDocument(documentId);
  return {
    content: [{ type: "text", text: result }],
    isError: false,
  };
}

export async function handleDocsCreateDocument(
  args: any,
  googleDocsInstance: GoogleDocs
) {
  if (!isCreateDocumentArgs(args)) {
    throw new Error("Invalid arguments for google_docs_create_document");
  }
  const { title, content } = args;
  const result = await googleDocsInstance.createDocument(title, content);
  return {
    content: [{ type: "text", text: result }],
    isError: false,
  };
}

export async function handleDocsAppendText(
  args: any,
  googleDocsInstance: GoogleDocs
) {
  if (!isAppendTextArgs(args)) {
    throw new Error("Invalid arguments for google_docs_append_text");
  }
  const { documentId, text } = args;
  const result = await googleDocsInstance.appendText(documentId, text);
  return {
    content: [{ type: "text", text: result }],
    isError: false,
  };
}

export async function handleDocsReplaceText(
  args: any,
  googleDocsInstance: GoogleDocs
) {
  if (!isReplaceTextArgs(args)) {
    throw new Error("Invalid arguments for google_docs_replace_text");
  }
  const { documentId, findText, replaceText, matchCase } = args;
  const result = await googleDocsInstance.replaceText(
    documentId,
    findText,
    replaceText,
    matchCase
  );
  return {
    content: [{ type: "text", text: result }],
    isError: false,
  };
}

export async function handleDocsInsertText(
  args: any,
  googleDocsInstance: GoogleDocs
) {
  if (!isInsertTextArgs(args)) {
    throw new Error("Invalid arguments for google_docs_insert_text");
  }
  const { documentId, text, index } = args;
  const result = await googleDocsInstance.insertText(documentId, text, index);
  return {
    content: [{ type: "text", text: result }],
    isError: false,
  };
}
