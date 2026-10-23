import { google } from "googleapis";
import * as path from "path";
import {
  FileUtils,
  type FileAttachment,
  type EmailAttachment,
} from "./fileUtils";

interface Attachment {
  filePath?: string;
  driveFileId?: string;
  filename?: string;
  mimeType?: string;
}

/**
 * RFC 2047 encoded-word for a message header value.
 *
 * RFC 5322 requires header fields to be US-ASCII. Putting raw UTF-8 in a
 * `Subject:` line is not merely sloppy — every hop downstream is entitled to
 * interpret those bytes in its own default single-byte code page, which is how a
 * plain em dash becomes a run of Latin-1 gibberish: one UTF-8-to-CP1252 round
 * trip per hop. Observed in the wild on mail this server sent, and it compounds —
 * a thread that was sent and read back several times accumulated FOUR generations
 * of the corruption.
 *
 * The message BODY was never affected, because every body part correctly declares
 * `charset=utf-8`. Only the headers lacked an encoding, which is exactly why the
 * symptom was subject-only and looked like a mystery.
 *
 * ASCII passes through untouched, deliberately: an encoded-word is unreadable in
 * transit and in logs, and the overwhelming majority of subjects are ASCII.
 *
 * Encoded-words are capped at 75 characters INCLUDING the `=?UTF-8?B?...?=`
 * wrapper (RFC 2047 s.2), so a long non-ASCII value is split across several
 * space-separated words. Splitting happens on whole UTF-8 characters, never mid
 * sequence — a split multi-byte character would reintroduce the very corruption
 * this exists to prevent.
 *
 * Apply this to HEADERS only. The `Subject:` lines this file builds for DISPLAY
 * (in `listEmails`, `getEmail`) must stay human-readable.
 */
export function encodeHeaderWord(value: string): string {
  if (!/[^\x00-\x7F]/.test(value)) return value;

  const PREFIX = "=?UTF-8?B?";
  const SUFFIX = "?=";
  // 75 total minus the wrapper; base64 turns 3 bytes into 4 chars, so round the
  // payload budget down to a whole number of 3-byte groups.
  const budget = 75 - PREFIX.length - SUFFIX.length;
  const maxBytes = Math.floor(budget / 4) * 3;

  const words: string[] = [];
  let chunk: number[] = [];
  for (const char of value) {
    const bytes = [...Buffer.from(char, "utf8")];
    if (chunk.length + bytes.length > maxBytes && chunk.length > 0) {
      words.push(PREFIX + Buffer.from(chunk).toString("base64") + SUFFIX);
      chunk = [];
    }
    chunk.push(...bytes);
  }
  if (chunk.length > 0) {
    words.push(PREFIX + Buffer.from(chunk).toString("base64") + SUFFIX);
  }
  return words.join(" ");
}

/**
 * Repair the mistakes models make when writing a Gmail `q`.
 *
 * Models routinely fold the result limit into the query (`is:unread
 * maxResults=5`) and use `since:`/`until:`, which are not Gmail operators.
 * Gmail treats all of these as literal search terms, so the search quietly
 * returns nothing and the caller keeps rephrasing instead of fixing the call.
 *
 * The limit is pulled out and returned as `maxResults`; `since:`/`until:`
 * become `after:`/`before:`, and ISO dates on those become YYYY/MM/DD. Quoted
 * phrases are left exactly as written.
 */
export function normalizeGmailQuery(query?: string): {
  query?: string;
  maxResults?: number;
  rewritten: boolean;
} {
  if (!query) return { query, rewritten: false };

  let maxResults: number | undefined;
  // Odd indexes of the split are the quoted phrases.
  const parts = query.split(/("[^"]*")/).map((part, i) => {
    if (i % 2 === 1) return part;
    return part
      .replace(/\bmax_?results\s*[=:]\s*(\d+)\b/gi, (_, n) => {
        maxResults = parseInt(n, 10);
        return " ";
      })
      // Anchored at a token start so `label:until:foo` is left alone.
      .replace(/(^|[\s(-])since:/gi, "$1after:")
      .replace(/(^|[\s(-])until:/gi, "$1before:")
      // Gmail documents YYYY/MM/DD; models write ISO dates.
      .replace(
        /\b(after|before):(\d{4})-(\d{2})-(\d{2})\b/gi,
        "$1:$2/$3/$4"
      );
  });
  const normalized = parts.join("").replace(/\s+/g, " ").trim();

  return {
    query: normalized || undefined,
    maxResults,
    rewritten: normalized !== query.replace(/\s+/g, " ").trim(),
  };
}

export default class GoogleGmail {
  private gmail: any;
  private drive: any;
  private recentEmails: { id: string; subject: string }[] = [];

  constructor(authClient: any) {
    this.gmail = google.gmail({ version: "v1", auth: authClient });
    this.drive = google.drive({ version: "v3", auth: authClient });
  }

  async listLabels() {
    try {
      const response = await this.gmail.users.labels.list({
        userId: "me",
      });

      return response.data.labels.map((label: any) => ({
        id: label.id,
        name: label.name,
        type: label.type,
      }));
    } catch (error) {
      throw new Error(
        `Failed to list labels: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Fetch Subject/From/Date and snippet for each listed message, in order.
   * Requests run in parallel, capped so a 50-message list neither waits on 50
   * sequential round trips nor bursts past Gmail's per-user rate limit.
   */
  private async getMessageSummaries(
    messages: { id: string }[],
    concurrency: number = 10
  ) {
    const results: {
      id: string;
      subject: string;
      from: string;
      date: string;
      snippet: string;
    }[] = new Array(messages.length);
    let next = 0;

    const worker = async () => {
      while (next < messages.length) {
        const i = next++;
        const msgDetails = await this.gmail.users.messages.get({
          userId: "me",
          id: messages[i].id,
          format: "metadata",
          metadataHeaders: ["Subject", "From", "Date"],
        });

        const headers = msgDetails.data.payload.headers;
        results[i] = {
          id: messages[i].id,
          subject:
            headers.find((h: any) => h.name === "Subject")?.value ||
            "(No subject)",
          from: headers.find((h: any) => h.name === "From")?.value || "",
          date: headers.find((h: any) => h.name === "Date")?.value || "",
          snippet: msgDetails.data.snippet,
        };
      }
    };

    await Promise.all(
      Array.from({ length: Math.min(concurrency, messages.length) }, worker)
    );
    return results;
  }

  async listEmails(
    labelIds?: string[],
    maxResults?: number,
    query?: string
  ) {
    try {
      const normalized = normalizeGmailQuery(query);
      const response = await this.gmail.users.messages.list({
        userId: "me",
        labelIds: labelIds,
        maxResults: maxResults ?? normalized.maxResults ?? 50,
        q: normalized.query,
      });

      if (!response.data.messages || response.data.messages.length === 0) {
        this.recentEmails = [];
        return normalized.rewritten
          ? `No messages found. (Searched for: ${normalized.query ?? "(all mail)"})`
          : "No messages found.";
      }

      const results = await this.getMessageSummaries(response.data.messages);
      // Store message data for reference
      this.recentEmails = results.map(({ id, subject }) => ({ id, subject }));

      // Format results with index numbers
      let output = results
        .map(
          (msg, index) =>
            `[${index + 1}] ID: ${msg.id}\nFrom: ${msg.from}\nDate: ${
              msg.date
            }\nSubject: ${msg.subject}\nSnippet: ${msg.snippet}`
        )
        .join("\n\n---\n\n");

      if (response.data.nextPageToken) {
        output += `\n\n===\nShowing ${results.length} emails; more exist. Narrow the query or raise maxResults.`;
      }
      return output;
    } catch (error) {
      throw new Error(
        `Failed to list emails: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  async listUnreadEmails(
    maxResults: number = 50,
    additionalLabelIds?: string[]
  ) {
    try {
      const labelIds = ["UNREAD", ...(additionalLabelIds || [])];

      const response = await this.gmail.users.messages.list({
        userId: "me",
        labelIds: labelIds,
        maxResults: maxResults,
      });

      const nextPageToken = response.data.nextPageToken;
      const resultSizeEstimate = response.data.resultSizeEstimate || 0;

      if (!response.data.messages || response.data.messages.length === 0) {
        return "No unread messages found.";
      }

      const results = await this.getMessageSummaries(response.data.messages);

      let output = results
        .map(
          (msg, index) =>
            `[${index + 1}] ID: ${msg.id}\nFrom: ${msg.from}\nDate: ${
              msg.date
            }\nSubject: ${msg.subject}\nSnippet: ${msg.snippet}`
        )
        .join("\n\n---\n\n");

      // Append pagination footer
      output += `\n\n===\nShowing ${results.length} unread email(s) (estimated ${resultSizeEstimate} total unread)`;
      if (nextPageToken) {
        output += `\nMore unread emails exist beyond this set. Raise maxResults to get them.`;
      }

      return output;
    } catch (error) {
      throw new Error(
        `Failed to list unread emails: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  getMessageIdByIndex(index: number): string {
    if (index < 1 || index > this.recentEmails.length) {
      throw new Error(
        `Invalid email index: ${index}. Available range: 1-${this.recentEmails.length}`
      );
    }
    return this.recentEmails[index - 1].id;
  }

  async getEmail(messageId: string, format: string = "full") {
    try {
      const response = await this.gmail.users.messages.get({
        userId: "me",
        id: messageId,
        format: format,
      });

      const { payload, snippet, labelIds, threadId, id } = response.data;
      const headers = payload.headers;

      // Extract common headers
      const subject =
        headers.find((h: any) => h.name === "Subject")?.value || "(No subject)";
      const from = headers.find((h: any) => h.name === "From")?.value || "";
      const to = headers.find((h: any) => h.name === "To")?.value || "";
      const date = headers.find((h: any) => h.name === "Date")?.value || "";

      // Extract message body
      let body = "";
      if (payload.parts) {
        body = this.extractBodyFromParts(payload.parts);
      } else if (payload.body && payload.body.data) {
        // Simple message
        body = Buffer.from(payload.body.data, "base64").toString();
      }

      // Get attachment information
      const attachments = await this.getEmailAttachments(messageId);

      // Format the result
      let result = `Subject: ${subject}\n`;
      result += `From: ${from}\n`;
      result += `To: ${to}\n`;
      result += `Date: ${date}\n`;
      result += `Labels: ${labelIds.join(", ")}\n`;
      result += `Thread ID: ${threadId}\n`;
      result += `Message ID: ${id}\n\n`;
      result += `Snippet: ${snippet}\n\n`;

      if (attachments.length > 0) {
        result += `Attachments (${attachments.length}):\n`;
        attachments.forEach((att, index) => {
          result += `  ${index + 1}. ${att.filename} (${
            att.mimeType
          }, ${FileUtils.formatFileSize(att.size)})\n`;
        });
        result += `\nUse google_gmail_download_attachments to download all attachments.\n\n`;
      }

      const MAX_BODY_LENGTH = 10000;
      if (body.length > MAX_BODY_LENGTH) {
        body = body.substring(0, MAX_BODY_LENGTH) + "\n... (truncated)";
      }
      result += `Body: \n${body}`;

      return result;
    } catch (error) {
      throw new Error(
        `Failed to get email: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  private extractBodyFromParts(parts: any[]): string {
    let plainText = "";
    let htmlText = "";

    for (const part of parts) {
      if (part.parts && Array.isArray(part.parts)) {
        // Recursively handle nested multipart structures
        const nested = this.extractBodyFromParts(part.parts);
        if (nested) {
          // Use nested result as fallback, preserving any direct-level matches
          if (!plainText) plainText = nested;
        }
      } else if (part.mimeType === "text/plain" && part.body?.data) {
        plainText = Buffer.from(part.body.data, "base64").toString();
      } else if (part.mimeType === "text/html" && part.body?.data) {
        htmlText = Buffer.from(part.body.data, "base64").toString();
      }
    }

    return plainText || htmlText;
  }

  private async processAttachments(
    attachments: Attachment[]
  ): Promise<FileAttachment[]> {
    const processedAttachments: FileAttachment[] = [];

    for (const attachment of attachments) {
      if (attachment.filePath) {
        // Handle local file
        FileUtils.validateFilePath(attachment.filePath);
        const fileAttachment = await FileUtils.readFileAsBase64(
          attachment.filePath,
          attachment.filename
        );

        // Override MIME type if specified
        if (attachment.mimeType) {
          fileAttachment.mimeType = attachment.mimeType;
        }

        processedAttachments.push(fileAttachment);
      } else if (attachment.driveFileId) {
        // Handle Google Drive file
        try {
          // Get file metadata
          const metadataResponse = await this.drive.files.get({
            fileId: attachment.driveFileId,
            fields: "name,mimeType,size",
            supportsAllDrives: true,
          });

          const { name, mimeType, size } = metadataResponse.data;

          // Check file size
          if (size && parseInt(size) > 25 * 1024 * 1024) {
            throw new Error(
              `Drive file size (${FileUtils.formatFileSize(
                parseInt(size)
              )}) exceeds Gmail's 25MB attachment limit`
            );
          }

          // Get file content
          const fileResponse = await this.drive.files.get(
            {
              fileId: attachment.driveFileId,
              alt: "media",
              supportsAllDrives: true,
            },
            { responseType: "arraybuffer" }
          );

          const base64Data = Buffer.from(fileResponse.data as ArrayBuffer).toString("base64");

          processedAttachments.push({
            filename: attachment.filename || name,
            mimeType:
              attachment.mimeType || mimeType || "application/octet-stream",
            data: base64Data,
            size: size ? parseInt(size) : 0,
          });
        } catch (error) {
          throw new Error(
            `Failed to fetch Drive file ${attachment.driveFileId}: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        }
      } else {
        throw new Error(
          "Invalid attachment: must provide either 'filePath' or 'driveFileId'"
        );
      }
    }

    return processedAttachments;
  }

  // LLM tool-call bodies may contain literal backslash-escaped sequences
  // (e.g. "\\n" as two chars) when the model serialises newlines in JSON
  // string values. This normalises them to real control characters.
  private normalizeEmailBody(body: string): string {
    return body
      .replace(/\\r\\n/g, '\r\n')
      .replace(/\\n/g, '\n')
      .replace(/\\t/g, '\t');
  }

  private async createMultipartEmail(
    to: string[],
    subject: string,
    body: string,
    cc?: string[],
    bcc?: string[],
    isHtml: boolean = false,
    attachments?: FileAttachment[],
    extraHeaders?: Record<string, string>
  ): Promise<string> {
    const boundary = "boundary_" + Math.random().toString(36).substr(2, 9);
    const emailLines = [];

    // Add headers
    emailLines.push(`To: ${to.join(", ")}`);
    if (cc && cc.length) {
      emailLines.push(`Cc: ${cc.join(", ")}`);
    }
    if (bcc && bcc.length) {
      emailLines.push(`Bcc: ${bcc.join(", ")}`);
    }
    emailLines.push(`Subject: ${encodeHeaderWord(subject)}`);
    if (extraHeaders) {
      for (const [key, value] of Object.entries(extraHeaders)) {
        emailLines.push(`${key}: ${encodeHeaderWord(value)}`);
      }
    }
    emailLines.push(`MIME-Version: 1.0`);
    emailLines.push(`Content-Type: multipart/mixed; boundary="${boundary}"`);
    emailLines.push("");

    // Add body part
    emailLines.push(`--${boundary}`);
    emailLines.push(
      `Content-Type: ${isHtml ? "text/html" : "text/plain"}; charset=utf-8`
    );
    emailLines.push("");
    emailLines.push(body);
    emailLines.push("");

    // Add attachments
    if (attachments && attachments.length > 0) {
      for (const attachment of attachments) {
        emailLines.push(`--${boundary}`);
        emailLines.push(`Content-Type: ${attachment.mimeType}`);
        emailLines.push(`Content-Transfer-Encoding: base64`);
        emailLines.push(
          `Content-Disposition: attachment; filename="${attachment.filename}"`
        );
        emailLines.push("");

        // Split base64 data into 76-character lines (RFC 2045)
        const base64Lines = attachment.data.match(/.{1,76}/g) || [];
        emailLines.push(...base64Lines);
        emailLines.push("");
      }
    }

    // Close the boundary
    emailLines.push(`--${boundary}--`);

    return emailLines.join("\r\n");
  }

  async sendEmail(
    to: string[],
    subject: string,
    body: string,
    cc?: string[],
    bcc?: string[],
    isHtml: boolean = false,
    attachments?: Attachment[]
  ) {
    try {
      body = this.normalizeEmailBody(body);
      let processedAttachments: FileAttachment[] = [];

      // Process attachments if provided
      if (attachments && attachments.length > 0) {
        processedAttachments = await this.processAttachments(attachments);
      }

      let email: string;

      if (processedAttachments.length > 0) {
        // Use multipart email for attachments
        email = await this.createMultipartEmail(
          to,
          subject,
          body,
          cc,
          bcc,
          isHtml,
          processedAttachments
        );
      } else {
        // Use simple email format for no attachments
        const emailLines = [];
        emailLines.push(`To: ${to.join(", ")}`);
        if (cc && cc.length) {
          emailLines.push(`Cc: ${cc.join(", ")}`);
        }
        if (bcc && bcc.length) {
          emailLines.push(`Bcc: ${bcc.join(", ")}`);
        }
        emailLines.push(`Subject: ${encodeHeaderWord(subject)}`);
        emailLines.push(
          `Content-Type: ${isHtml ? "text/html" : "text/plain"}; charset=utf-8`
        );
        emailLines.push("");
        emailLines.push(body);
        email = emailLines.join("\r\n");
      }

      // Encode the email
      const encodedEmail = Buffer.from(email)
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");

      // Send the email
      const res = await this.gmail.users.messages.send({
        userId: "me",
        requestBody: {
          raw: encodedEmail,
        },
      });

      let result = `Email sent successfully. Message ID: ${res.data.id}`;
      if (processedAttachments.length > 0) {
        result += `\nAttachments: ${processedAttachments.length} file(s) attached`;
        result += `\nAttachment details:`;
        processedAttachments.forEach((att, index) => {
          result += `\n  ${index + 1}. ${att.filename} (${
            att.mimeType
          }, ${FileUtils.formatFileSize(att.size)})`;
        });
      }

      return result;
    } catch (error) {
      throw new Error(
        `Failed to send email: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  async draftEmail(
    to: string[],
    subject: string,
    body: string,
    cc?: string[],
    bcc?: string[],
    isHtml: boolean = false,
    attachments?: Attachment[]
  ) {
    try {
      body = this.normalizeEmailBody(body);
      let processedAttachments: FileAttachment[] = [];

      // Process attachments if provided
      if (attachments && attachments.length > 0) {
        processedAttachments = await this.processAttachments(attachments);
      }

      let email: string;

      if (processedAttachments.length > 0) {
        // Use multipart email for attachments
        email = await this.createMultipartEmail(
          to,
          subject,
          body,
          cc,
          bcc,
          isHtml,
          processedAttachments
        );
      } else {
        // Use simple email format for no attachments
        const emailLines = [];
        emailLines.push(`To: ${to.join(", ")}`);
        if (cc && cc.length) {
          emailLines.push(`Cc: ${cc.join(", ")}`);
        }
        if (bcc && bcc.length) {
          emailLines.push(`Bcc: ${bcc.join(", ")}`);
        }
        emailLines.push(`Subject: ${encodeHeaderWord(subject)}`);
        emailLines.push(
          `Content-Type: ${isHtml ? "text/html" : "text/plain"}; charset=utf-8`
        );
        emailLines.push("");
        emailLines.push(body);
        email = emailLines.join("\r\n");
      }

      // Encode the email
      const encodedEmail = Buffer.from(email)
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");

      // Create the draft
      const res = await this.gmail.users.drafts.create({
        userId: "me",
        requestBody: {
          message: {
            raw: encodedEmail,
          },
        },
      });

      let result = `Draft created successfully. Draft ID: ${res.data.id}`;
      if (processedAttachments.length > 0) {
        result += `\nAttachments: ${processedAttachments.length} file(s) attached`;
        result += `\nAttachment details:`;
        processedAttachments.forEach((att, index) => {
          result += `\n  ${index + 1}. ${att.filename} (${
            att.mimeType
          }, ${FileUtils.formatFileSize(att.size)})`;
        });
      }

      return result;
    } catch (error) {
      throw new Error(
        `Failed to create draft: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  async deleteEmail(messageId: string, permanently: boolean = false) {
    try {
      if (permanently) {
        await this.gmail.users.messages.delete({
          userId: "me",
          id: messageId,
        });
        return `Message ${messageId} permanently deleted.`;
      } else {
        await this.gmail.users.messages.trash({
          userId: "me",
          id: messageId,
        });
        return `Message ${messageId} moved to trash.`;
      }
    } catch (error) {
      throw new Error(
        `Failed to delete message: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  async modifyLabels(
    messageId: string,
    addLabelIds?: string[],
    removeLabelIds?: string[]
  ) {
    try {
      await this.gmail.users.messages.modify({
        userId: "me",
        id: messageId,
        requestBody: {
          addLabelIds: addLabelIds || [],
          removeLabelIds: removeLabelIds || [],
        },
      });

      let result = `Successfully modified labels for message ${messageId}.`;
      if (addLabelIds && addLabelIds.length > 0) {
        result += `\nAdded labels: ${addLabelIds.join(", ")}`;
      }
      if (removeLabelIds && removeLabelIds.length > 0) {
        result += `\nRemoved labels: ${removeLabelIds.join(", ")}`;
      }

      return result;
    } catch (error) {
      throw new Error(
        `Failed to modify labels: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  async batchModifyLabels(
    messageIds: string[],
    addLabelIds?: string[],
    removeLabelIds?: string[]
  ) {
    try {
      if (!messageIds || messageIds.length === 0) {
        throw new Error("messageIds array must not be empty");
      }
      if (messageIds.length > 1000) {
        throw new Error(
          `Too many message IDs (${messageIds.length}). Gmail API allows a maximum of 1000 per batch request.`
        );
      }

      await this.gmail.users.messages.batchModify({
        userId: "me",
        requestBody: {
          ids: messageIds,
          addLabelIds: addLabelIds || [],
          removeLabelIds: removeLabelIds || [],
        },
      });

      let result = `Successfully modified labels for ${messageIds.length} message(s).`;
      if (addLabelIds && addLabelIds.length > 0) {
        result += `\nAdded labels: ${addLabelIds.join(", ")}`;
      }
      if (removeLabelIds && removeLabelIds.length > 0) {
        result += `\nRemoved labels: ${removeLabelIds.join(", ")}`;
      }

      return result;
    } catch (error) {
      throw new Error(
        `Failed to batch modify labels: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  async batchDeleteEmails(messageIds: string[]) {
    try {
      if (!messageIds || messageIds.length === 0) {
        throw new Error("messageIds array must not be empty");
      }
      if (messageIds.length > 1000) {
        throw new Error(
          `Too many message IDs (${messageIds.length}). Gmail API allows a maximum of 1000 per batch request.`
        );
      }

      await this.gmail.users.messages.batchDelete({
        userId: "me",
        requestBody: {
          ids: messageIds,
        },
      });

      return `Permanently deleted ${messageIds.length} message(s). This action cannot be undone.`;
    } catch (error) {
      throw new Error(
        `Failed to batch delete emails: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  async getEmailAttachments(messageId: string): Promise<EmailAttachment[]> {
    try {
      const response = await this.gmail.users.messages.get({
        userId: "me",
        id: messageId,
        format: "full",
      });

      const attachments: EmailAttachment[] = [];
      const payload = response.data.payload;

      const extractAttachments = (part: any) => {
        // Check if this part is an attachment
        if (part.body && part.body.attachmentId) {
          const filename = part.filename || "unnamed_attachment";
          const size = part.body.size || 0;
          const attachmentId = part.body.attachmentId;

          attachments.push({
            attachmentId: attachmentId,
            filename: filename,
            mimeType: part.mimeType || "application/octet-stream",
            size: parseInt(size.toString()) || 0,
          });
        }

        // Also check for Content-Disposition header indicating attachment
        if (part.headers) {
          const contentDisposition = part.headers.find(
            (h: any) => h.name.toLowerCase() === "content-disposition"
          );

          if (
            contentDisposition &&
            contentDisposition.value.includes("attachment")
          ) {
            if (part.body && part.body.attachmentId) {
              const filename =
                part.filename ||
                this.extractFilenameFromDisposition(contentDisposition.value) ||
                "unnamed_attachment";
              const size = part.body.size || 0;
              const attachmentId = part.body.attachmentId;

              // Avoid duplicates
              const exists = attachments.find(
                (att) => att.attachmentId === attachmentId
              );
              if (!exists) {
                attachments.push({
                  attachmentId: attachmentId,
                  filename: filename,
                  mimeType: part.mimeType || "application/octet-stream",
                  size: parseInt(size.toString()) || 0,
                });
              }
            }
          }
        }

        // Recursively check nested parts
        if (part.parts && Array.isArray(part.parts)) {
          for (const subPart of part.parts) {
            extractAttachments(subPart);
          }
        }
      };

      // Start extraction from the root payload
      if (payload.parts && Array.isArray(payload.parts)) {
        for (const part of payload.parts) {
          extractAttachments(part);
        }
      } else {
        // Single part message
        extractAttachments(payload);
      }

      return attachments;
    } catch (error) {
      throw new Error(
        `Failed to get email attachments: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  private extractFilenameFromDisposition(disposition: string): string | null {
    const filenameMatch = disposition.match(
      /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/
    );
    if (filenameMatch) {
      let filename = filenameMatch[1];
      // Remove quotes if present
      if (filename.startsWith('"') && filename.endsWith('"')) {
        filename = filename.slice(1, -1);
      }
      return filename;
    }
    return null;
  }

  async downloadAttachments(
    messageId: string,
    downloadPath?: string
  ): Promise<string> {
    try {
      // Get all attachments from the email
      const emailAttachments = await this.getEmailAttachments(messageId);

      if (emailAttachments.length === 0) {
        return "No attachments found in this email.";
      }

      // Use default download path if not provided
      const targetPath = downloadPath || FileUtils.getDefaultDownloadPath();

      const downloadedFiles: string[] = [];
      let totalSize = 0;
      const errors: string[] = [];

      for (const attachment of emailAttachments) {
        try {
          // Get the attachment data
          const attachmentResponse =
            await this.gmail.users.messages.attachments.get({
              userId: "me",
              messageId: messageId,
              id: attachment.attachmentId,
            });

          // Sanitize filename to prevent issues
          const sanitizedFilename = FileUtils.sanitizeFilename(
            attachment.filename
          );

          // Save the attachment
          const filePath = await FileUtils.saveBase64File(
            attachmentResponse.data.data,
            sanitizedFilename,
            targetPath
          );

          downloadedFiles.push(filePath);
          totalSize += attachment.size;
        } catch (error) {
          const errorMsg = `Failed to download ${attachment.filename}: ${
            error instanceof Error ? error.message : String(error)
          }`;
          errors.push(errorMsg);
        }
      }

      if (downloadedFiles.length === 0) {
        let result = "Failed to download any attachments.";
        if (errors.length > 0) {
          result += "\n\nErrors:\n" + errors.join("\n");
        }
        return result;
      }

      let result = `Successfully downloaded ${downloadedFiles.length} attachment(s)`;
      if (errors.length > 0) {
        result += ` (${errors.length} failed)`;
      }
      result += `\nTotal size: ${FileUtils.formatFileSize(totalSize)}`;
      result += `\nDownload location: ${targetPath}`;
      result += `\n\nDownloaded files:`;
      downloadedFiles.forEach((filePath, index) => {
        const filename = path.basename(filePath);
        result += `\n  ${index + 1}. ${filename}`;
      });

      if (errors.length > 0) {
        result += `\n\nErrors:\n` + errors.join("\n");
      }

      return result;
    } catch (error) {
      throw new Error(
        `Failed to download attachments: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  private async getReplyContext(messageId: string) {
    const response = await this.gmail.users.messages.get({
      userId: "me",
      id: messageId,
      format: "metadata",
      metadataHeaders: ["Subject", "From", "Message-ID", "References"],
    });

    const headers = response.data.payload.headers;
    const subject =
      headers.find((h: any) => h.name === "Subject")?.value || "";
    const from = headers.find((h: any) => h.name === "From")?.value || "";
    const originalMessageId =
      headers.find((h: any) => h.name === "Message-ID")?.value || "";
    const references =
      headers.find((h: any) => h.name === "References")?.value || "";
    const threadId = response.data.threadId;

    return { threadId, subject, from, originalMessageId, references };
  }

  async replyEmail(
    messageId: string,
    body: string,
    to?: string[],
    cc?: string[],
    bcc?: string[],
    isHtml: boolean = false,
    attachments?: Attachment[]
  ) {
    try {
      body = this.normalizeEmailBody(body);
      const context = await this.getReplyContext(messageId);

      // Build threading headers
      const extraHeaders: Record<string, string> = {};
      if (context.originalMessageId) {
        extraHeaders["In-Reply-To"] = context.originalMessageId;
        extraHeaders["References"] = context.references
          ? `${context.references} ${context.originalMessageId}`
          : context.originalMessageId;
      }

      // Default to replying to original sender
      const recipients = to && to.length > 0 ? to : [context.from];

      // Add Re: prefix if not already present
      const subject = context.subject.startsWith("Re: ")
        ? context.subject
        : `Re: ${context.subject}`;

      let processedAttachments: FileAttachment[] = [];
      if (attachments && attachments.length > 0) {
        processedAttachments = await this.processAttachments(attachments);
      }

      let email: string;

      if (processedAttachments.length > 0) {
        email = await this.createMultipartEmail(
          recipients,
          subject,
          body,
          cc,
          bcc,
          isHtml,
          processedAttachments,
          extraHeaders
        );
      } else {
        const emailLines = [];
        emailLines.push(`To: ${recipients.join(", ")}`);
        if (cc && cc.length) {
          emailLines.push(`Cc: ${cc.join(", ")}`);
        }
        if (bcc && bcc.length) {
          emailLines.push(`Bcc: ${bcc.join(", ")}`);
        }
        emailLines.push(`Subject: ${encodeHeaderWord(subject)}`);
        for (const [key, value] of Object.entries(extraHeaders)) {
          emailLines.push(`${key}: ${encodeHeaderWord(value)}`);
        }
        emailLines.push(
          `Content-Type: ${isHtml ? "text/html" : "text/plain"}; charset=utf-8`
        );
        emailLines.push("");
        emailLines.push(body);
        email = emailLines.join("\r\n");
      }

      const encodedEmail = Buffer.from(email)
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");

      const res = await this.gmail.users.messages.send({
        userId: "me",
        requestBody: {
          raw: encodedEmail,
          threadId: context.threadId,
        },
      });

      let result = `Reply sent successfully. Message ID: ${res.data.id}`;
      result += `\nThread ID: ${context.threadId}`;
      if (processedAttachments.length > 0) {
        result += `\nAttachments: ${processedAttachments.length} file(s) attached`;
        result += `\nAttachment details:`;
        processedAttachments.forEach((att, index) => {
          result += `\n  ${index + 1}. ${att.filename} (${
            att.mimeType
          }, ${FileUtils.formatFileSize(att.size)})`;
        });
      }

      return result;
    } catch (error) {
      throw new Error(
        `Failed to send reply: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  async draftReply(
    messageId: string,
    body: string,
    to?: string[],
    cc?: string[],
    bcc?: string[],
    isHtml: boolean = false,
    attachments?: Attachment[]
  ) {
    try {
      body = this.normalizeEmailBody(body);
      const context = await this.getReplyContext(messageId);

      // Build threading headers
      const extraHeaders: Record<string, string> = {};
      if (context.originalMessageId) {
        extraHeaders["In-Reply-To"] = context.originalMessageId;
        extraHeaders["References"] = context.references
          ? `${context.references} ${context.originalMessageId}`
          : context.originalMessageId;
      }

      // Default to replying to original sender
      const recipients = to && to.length > 0 ? to : [context.from];

      // Add Re: prefix if not already present
      const subject = context.subject.startsWith("Re: ")
        ? context.subject
        : `Re: ${context.subject}`;

      let processedAttachments: FileAttachment[] = [];
      if (attachments && attachments.length > 0) {
        processedAttachments = await this.processAttachments(attachments);
      }

      let email: string;

      if (processedAttachments.length > 0) {
        email = await this.createMultipartEmail(
          recipients,
          subject,
          body,
          cc,
          bcc,
          isHtml,
          processedAttachments,
          extraHeaders
        );
      } else {
        const emailLines = [];
        emailLines.push(`To: ${recipients.join(", ")}`);
        if (cc && cc.length) {
          emailLines.push(`Cc: ${cc.join(", ")}`);
        }
        if (bcc && bcc.length) {
          emailLines.push(`Bcc: ${bcc.join(", ")}`);
        }
        emailLines.push(`Subject: ${encodeHeaderWord(subject)}`);
        for (const [key, value] of Object.entries(extraHeaders)) {
          emailLines.push(`${key}: ${encodeHeaderWord(value)}`);
        }
        emailLines.push(
          `Content-Type: ${isHtml ? "text/html" : "text/plain"}; charset=utf-8`
        );
        emailLines.push("");
        emailLines.push(body);
        email = emailLines.join("\r\n");
      }

      const encodedEmail = Buffer.from(email)
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");

      const res = await this.gmail.users.drafts.create({
        userId: "me",
        requestBody: {
          message: {
            raw: encodedEmail,
            threadId: context.threadId,
          },
        },
      });

      let result = `Reply draft created successfully. Draft ID: ${res.data.id}`;
      result += `\nThread ID: ${context.threadId}`;
      if (processedAttachments.length > 0) {
        result += `\nAttachments: ${processedAttachments.length} file(s) attached`;
        result += `\nAttachment details:`;
        processedAttachments.forEach((att, index) => {
          result += `\n  ${index + 1}. ${att.filename} (${
            att.mimeType
          }, ${FileUtils.formatFileSize(att.size)})`;
        });
      }

      return result;
    } catch (error) {
      throw new Error(
        `Failed to create reply draft: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }
}
