import { type Tool } from "@modelcontextprotocol/sdk/types.js";

const accountIdProperty = {
  accountId: {
    type: "string",
    description:
      "Required. Email address of the Google account to use. Use google_account_list to see authenticated accounts, or google_account_authenticate to add a new account.",
  },
};

export const LIST_LABELS_TOOL: Tool = {
  name: "google_gmail_list_labels",
  description: "List all available Gmail labels",
  inputSchema: {
    type: "object",
    properties: {
      ...accountIdProperty,
    },
    required: ["accountId"],
  },
};

export const LIST_EMAILS_TOOL: Tool = {
  name: "google_gmail_list_emails",
  description: "List emails from a specific label or folder",
  inputSchema: {
    type: "object",
    properties: {
      labelIds: {
        type: "array",
        items: { type: "string" },
        description: "Label IDs to filter messages (e.g., 'INBOX', 'SENT')",
      },
      maxResults: {
        type: "number",
        description: "Maximum number of emails to return",
      },
      query: {
        type: "string",
        description: "Search query to filter emails",
      },
      ...accountIdProperty,
    },
    required: ["accountId"],
  },
};

export const GET_EMAIL_TOOL: Tool = {
  name: "google_gmail_get_email",
  description: "Get detailed information about a specific email",
  inputSchema: {
    type: "object",
    properties: {
      messageId: {
        type: "string",
        description: "ID of the email to retrieve",
      },
      format: {
        type: "string",
        description:
          "Format to return the email in (full, metadata, minimal, raw)",
      },
      ...accountIdProperty,
    },
    required: ["messageId", "accountId"],
  },
};

export const GET_EMAIL_BY_INDEX_TOOL: Tool = {
  name: "google_gmail_get_email_by_index",
  description: "Get email by its index from the most recent search results",
  inputSchema: {
    type: "object",
    properties: {
      index: {
        type: "number",
        description: "Index of the email from search results (starting from 1)",
      },
      format: {
        type: "string",
        description:
          "Format to return the email in (full, metadata, minimal, raw)",
      },
      ...accountIdProperty,
    },
    required: ["index", "accountId"],
  },
};

export const SEND_EMAIL_TOOL: Tool = {
  name: "google_gmail_send_email",
  description: "Send a new email",
  inputSchema: {
    type: "object",
    properties: {
      to: {
        type: "array",
        items: { type: "string" },
        description: "Recipients email addresses",
      },
      subject: {
        type: "string",
        description: "Email subject",
      },
      body: {
        type: "string",
        description: "Email body content (can be plain text or HTML)",
      },
      cc: {
        type: "array",
        items: { type: "string" },
        description: "CC recipients email addresses",
      },
      bcc: {
        type: "array",
        items: { type: "string" },
        description: "BCC recipients email addresses",
      },
      isHtml: {
        type: "boolean",
        description: "Whether the body contains HTML",
      },
      attachments: {
        type: "array",
        items: {
          type: "object",
          properties: {
            filePath: {
              type: "string",
              description:
                "Local file path to attach (e.g., '/Users/username/Documents/file.pdf')",
            },
            driveFileId: {
              type: "string",
              description:
                "Google Drive file ID to attach (alternative to filePath)",
            },
            filename: {
              type: "string",
              description:
                "Custom filename for the attachment (optional, will use original filename if not provided)",
            },
            mimeType: {
              type: "string",
              description:
                "MIME type of the attachment (optional, will be auto-detected)",
            },
          },
          oneOf: [{ required: ["filePath"] }, { required: ["driveFileId"] }],
        },
        description:
          "Array of attachments to include with the email. Provide either filePath for local files or driveFileId for Google Drive files.",
      },
      ...accountIdProperty,
    },
    required: ["to", "subject", "body", "accountId"],
  },
};

export const DRAFT_EMAIL_TOOL: Tool = {
  name: "google_gmail_draft_email",
  description: "Create a draft email",
  inputSchema: {
    type: "object",
    properties: {
      to: {
        type: "array",
        items: { type: "string" },
        description: "Recipients email addresses",
      },
      subject: {
        type: "string",
        description: "Email subject",
      },
      body: {
        type: "string",
        description: "Email body content (can be plain text or HTML)",
      },
      cc: {
        type: "array",
        items: { type: "string" },
        description: "CC recipients email addresses",
      },
      bcc: {
        type: "array",
        items: { type: "string" },
        description: "BCC recipients email addresses",
      },
      isHtml: {
        type: "boolean",
        description: "Whether the body contains HTML",
      },
      attachments: {
        type: "array",
        items: {
          type: "object",
          properties: {
            filePath: {
              type: "string",
              description:
                "Local file path to attach (e.g., '/Users/username/Documents/file.pdf')",
            },
            driveFileId: {
              type: "string",
              description:
                "Google Drive file ID to attach (alternative to filePath)",
            },
            filename: {
              type: "string",
              description:
                "Custom filename for the attachment (optional, will use original filename if not provided)",
            },
            mimeType: {
              type: "string",
              description:
                "MIME type of the attachment (optional, will be auto-detected)",
            },
          },
          oneOf: [{ required: ["filePath"] }, { required: ["driveFileId"] }],
        },
        description:
          "Array of attachments to include with the email. Provide either filePath for local files or driveFileId for Google Drive files.",
      },
      ...accountIdProperty,
    },
    required: ["to", "subject", "body", "accountId"],
  },
};

export const DELETE_EMAIL_TOOL: Tool = {
  name: "google_gmail_delete_email",
  description: "Delete or trash an email",
  inputSchema: {
    type: "object",
    properties: {
      messageId: {
        type: "string",
        description: "ID of the email to delete",
      },
      permanently: {
        type: "boolean",
        description: "Whether to permanently delete or move to trash",
      },
      ...accountIdProperty,
    },
    required: ["messageId", "accountId"],
  },
};

export const MODIFY_LABELS_TOOL: Tool = {
  name: "google_gmail_modify_labels",
  description: "Add or remove labels from an email",
  inputSchema: {
    type: "object",
    properties: {
      messageId: {
        type: "string",
        description: "ID of the email to modify",
      },
      addLabelIds: {
        type: "array",
        items: { type: "string" },
        description: "Labels to add to the message",
      },
      removeLabelIds: {
        type: "array",
        items: { type: "string" },
        description: "Labels to remove from the message",
      },
      ...accountIdProperty,
    },
    required: ["messageId", "accountId"],
  },
};

export const DOWNLOAD_ATTACHMENTS_TOOL: Tool = {
  name: "google_gmail_download_attachments",
  description: "Download all attachments from a specific email",
  inputSchema: {
    type: "object",
    properties: {
      messageId: {
        type: "string",
        description: "ID of the email to download attachments from",
      },
      downloadPath: {
        type: "string",
        description:
          "Path where to save the attachments (optional, defaults to user's Downloads folder)",
      },
      ...accountIdProperty,
    },
    required: ["messageId", "accountId"],
  },
};

const replyAttachmentsSchema = {
  type: "array",
  items: {
    type: "object",
    properties: {
      filePath: {
        type: "string",
        description:
          "Local file path to attach (e.g., '/Users/username/Documents/file.pdf')",
      },
      driveFileId: {
        type: "string",
        description:
          "Google Drive file ID to attach (alternative to filePath)",
      },
      filename: {
        type: "string",
        description:
          "Custom filename for the attachment (optional, will use original filename if not provided)",
      },
      mimeType: {
        type: "string",
        description:
          "MIME type of the attachment (optional, will be auto-detected)",
      },
    },
    oneOf: [{ required: ["filePath"] }, { required: ["driveFileId"] }],
  },
  description:
    "Array of attachments to include with the reply. Provide either filePath for local files or driveFileId for Google Drive files.",
} as const;

export const REPLY_EMAIL_TOOL: Tool = {
  name: "google_gmail_reply_email",
  description:
    "Reply to an email in-thread. Automatically handles threading (subject, In-Reply-To, References headers). Defaults to replying to the original sender unless 'to' is overridden.",
  inputSchema: {
    type: "object",
    properties: {
      messageId: {
        type: "string",
        description: "ID of the message being replied to",
      },
      body: {
        type: "string",
        description: "Reply body content (can be plain text or HTML)",
      },
      to: {
        type: "array",
        items: { type: "string" },
        description:
          "Override recipients (defaults to original sender if not provided)",
      },
      cc: {
        type: "array",
        items: { type: "string" },
        description: "CC recipients email addresses",
      },
      bcc: {
        type: "array",
        items: { type: "string" },
        description: "BCC recipients email addresses",
      },
      isHtml: {
        type: "boolean",
        description: "Whether the body contains HTML",
      },
      attachments: replyAttachmentsSchema,
      ...accountIdProperty,
    },
    required: ["messageId", "body", "accountId"],
  },
};

export const DRAFT_REPLY_TOOL: Tool = {
  name: "google_gmail_draft_reply",
  description:
    "Create a draft reply to an email in-thread. Automatically handles threading (subject, In-Reply-To, References headers). Defaults to replying to the original sender unless 'to' is overridden.",
  inputSchema: {
    type: "object",
    properties: {
      messageId: {
        type: "string",
        description: "ID of the message being replied to",
      },
      body: {
        type: "string",
        description: "Reply body content (can be plain text or HTML)",
      },
      to: {
        type: "array",
        items: { type: "string" },
        description:
          "Override recipients (defaults to original sender if not provided)",
      },
      cc: {
        type: "array",
        items: { type: "string" },
        description: "CC recipients email addresses",
      },
      bcc: {
        type: "array",
        items: { type: "string" },
        description: "BCC recipients email addresses",
      },
      isHtml: {
        type: "boolean",
        description: "Whether the body contains HTML",
      },
      attachments: replyAttachmentsSchema,
      ...accountIdProperty,
    },
    required: ["messageId", "body", "accountId"],
  },
};

export const BATCH_MODIFY_LABELS_TOOL: Tool = {
  name: "google_gmail_batch_modify_labels",
  description:
    "Add or remove labels from multiple emails in a single batch operation (up to 1000). Common patterns: mark as read (removeLabelIds: ['UNREAD']), mark as unread (addLabelIds: ['UNREAD']), star (addLabelIds: ['STARRED']), trash (addLabelIds: ['TRASH']), archive (removeLabelIds: ['INBOX']).",
  inputSchema: {
    type: "object",
    properties: {
      messageIds: {
        type: "array",
        items: { type: "string" },
        description: "Array of message IDs to modify (max 1000)",
      },
      addLabelIds: {
        type: "array",
        items: { type: "string" },
        description: "Labels to add to all specified messages",
      },
      removeLabelIds: {
        type: "array",
        items: { type: "string" },
        description: "Labels to remove from all specified messages",
      },
      ...accountIdProperty,
    },
    required: ["messageIds", "accountId"],
  },
};

export const MARK_AS_UNREAD_TOOL: Tool = {
  name: "google_gmail_mark_as_unread",
  description:
    "Mark one or more emails as unread. Accepts a single messageId or a batch of messageIds (up to 1000).",
  inputSchema: {
    type: "object",
    properties: {
      messageId: {
        type: "string",
        description: "ID of a single email to mark as unread",
      },
      messageIds: {
        type: "array",
        items: { type: "string" },
        description:
          "Array of message IDs to mark as unread (max 1000). Use this for batch operations.",
      },
      ...accountIdProperty,
    },
    required: ["accountId"],
  },
};

export const LIST_UNREAD_EMAILS_TOOL: Tool = {
  name: "google_gmail_list_unread_emails",
  description:
    "List unread emails. Always filters by the UNREAD label. Returns pagination metadata (estimated total unread, whether more exist).",
  inputSchema: {
    type: "object",
    properties: {
      maxResults: {
        type: "number",
        description: "Maximum number of unread emails to return (default 10)",
      },
      labelIds: {
        type: "array",
        items: { type: "string" },
        description:
          "Additional label IDs to filter by (e.g., 'INBOX'). UNREAD is always included automatically.",
      },
      ...accountIdProperty,
    },
    required: ["accountId"],
  },
};

export const BATCH_DELETE_EMAILS_TOOL: Tool = {
  name: "google_gmail_batch_delete_emails",
  description:
    "PERMANENTLY delete multiple emails in a single batch operation (up to 1000). WARNING: This action is irreversible — deleted messages cannot be recovered. For safe removal, use google_gmail_batch_modify_labels with addLabelIds: ['TRASH'] instead.",
  inputSchema: {
    type: "object",
    properties: {
      messageIds: {
        type: "array",
        items: { type: "string" },
        description: "Array of message IDs to permanently delete (max 1000)",
      },
      ...accountIdProperty,
    },
    required: ["messageIds", "accountId"],
  },
};

export const gmailTools = [
  LIST_LABELS_TOOL,
  LIST_EMAILS_TOOL,
  LIST_UNREAD_EMAILS_TOOL,
  GET_EMAIL_TOOL,
  GET_EMAIL_BY_INDEX_TOOL,
  SEND_EMAIL_TOOL,
  DRAFT_EMAIL_TOOL,
  REPLY_EMAIL_TOOL,
  DRAFT_REPLY_TOOL,
  DELETE_EMAIL_TOOL,
  MODIFY_LABELS_TOOL,
  MARK_AS_UNREAD_TOOL,
  DOWNLOAD_ATTACHMENTS_TOOL,
  BATCH_MODIFY_LABELS_TOOL,
  BATCH_DELETE_EMAILS_TOOL,
];
