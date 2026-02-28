// Validation functions for Google Tools arguments.. Just necessary thing

// Helper: check required accountId field
function hasRequiredAccountId(args: any): boolean {
  return typeof args.accountId === "string" && args.accountId.length > 0;
}

export function isSetDefaultCalendarArgs(
  args: any
): args is { calendarId: string; accountId: string } {
  return args && typeof args.calendarId === "string" && hasRequiredAccountId(args);
}

export function isListCalendarsArgs(args: any): args is { accountId: string } {
  return (
    args &&
    hasRequiredAccountId(args) &&
    Object.keys(args).every((k) => k === "accountId")
  );
}

export function isCreateEventArgs(args: any): args is {
  summary: string;
  start: string;
  end: string;
  calendarId?: string;
  description?: string;
  location?: string;
  colorId?: string;
  attendees?: string[];
  recurrence?: string;
  accountId: string;
} {
  return (
    args &&
    typeof args.summary === "string" &&
    typeof args.start === "string" &&
    typeof args.end === "string" &&
    (args.calendarId === undefined || typeof args.calendarId === "string") &&
    (args.description === undefined || typeof args.description === "string") &&
    (args.location === undefined || typeof args.location === "string") &&
    (args.colorId === undefined || typeof args.colorId === "string") &&
    (args.recurrence === undefined || typeof args.recurrence === "string") &&
    (args.attendees === undefined || Array.isArray(args.attendees)) &&
    hasRequiredAccountId(args)
  );
}

export function isGetEventsArgs(args: any): args is {
  limit?: number;
  calendarId?: string;
  timeMin?: string;
  timeMax?: string;
  q?: string;
  showDeleted?: boolean;
  accountId: string;
} {
  return (
    args &&
    (args.limit === undefined || typeof args.limit === "number") &&
    (args.calendarId === undefined || typeof args.calendarId === "string") &&
    (args.timeMin === undefined || typeof args.timeMin === "string") &&
    (args.timeMax === undefined || typeof args.timeMax === "string") &&
    (args.q === undefined || typeof args.q === "string") &&
    (args.showDeleted === undefined || typeof args.showDeleted === "boolean") &&
    hasRequiredAccountId(args)
  );
}

export function isGetEventArgs(args: any): args is {
  eventId: string;
  calendarId?: string;
  accountId: string;
} {
  return (
    args &&
    typeof args.eventId === "string" &&
    (args.calendarId === undefined || typeof args.calendarId === "string") &&
    hasRequiredAccountId(args)
  );
}

export function isUpdateEventArgs(args: any): args is {
  eventId: string;
  summary?: string;
  description?: string;
  start?: string;
  end?: string;
  location?: string;
  colorId?: string;
  attendees?: string[];
  recurrence?: string;
  calendarId?: string;
  accountId: string;
} {
  return (
    args &&
    typeof args.eventId === "string" &&
    (args.summary === undefined || typeof args.summary === "string") &&
    (args.description === undefined || typeof args.description === "string") &&
    (args.start === undefined || typeof args.start === "string") &&
    (args.end === undefined || typeof args.end === "string") &&
    (args.location === undefined || typeof args.location === "string") &&
    (args.colorId === undefined || typeof args.colorId === "string") &&
    (args.recurrence === undefined || typeof args.recurrence === "string") &&
    (args.attendees === undefined || Array.isArray(args.attendees)) &&
    (args.calendarId === undefined || typeof args.calendarId === "string") &&
    hasRequiredAccountId(args)
  );
}

export function isDeleteEventArgs(args: any): args is {
  eventId: string;
  calendarId?: string;
  accountId: string;
} {
  return (
    args &&
    typeof args.eventId === "string" &&
    (args.calendarId === undefined || typeof args.calendarId === "string") &&
    hasRequiredAccountId(args)
  );
}

export function isFindFreeTimeArgs(args: any): args is {
  startDate: string;
  endDate: string;
  duration: number;
  calendarIds?: string[];
  accountId: string;
} {
  return (
    args &&
    typeof args.startDate === "string" &&
    typeof args.endDate === "string" &&
    typeof args.duration === "number" &&
    (args.calendarIds === undefined || Array.isArray(args.calendarIds)) &&
    hasRequiredAccountId(args)
  );
}

// Gmail validation functions
export function isListLabelsArgs(args: any): args is { accountId: string } {
  return (
    args &&
    hasRequiredAccountId(args) &&
    Object.keys(args).every((k) => k === "accountId")
  );
}

export function isListEmailsArgs(args: any): args is {
  labelIds?: string[];
  maxResults?: number;
  query?: string;
  accountId: string;
} {
  return (
    args &&
    (args.labelIds === undefined || Array.isArray(args.labelIds)) &&
    (args.maxResults === undefined || typeof args.maxResults === "number") &&
    (args.query === undefined || typeof args.query === "string") &&
    hasRequiredAccountId(args)
  );
}

export function isGetEmailArgs(args: any): args is {
  messageId: string;
  format?: string;
  accountId: string;
} {
  return (
    args &&
    typeof args.messageId === "string" &&
    (args.format === undefined || typeof args.format === "string") &&
    hasRequiredAccountId(args)
  );
}

export function isGetEmailByIndexArgs(args: any): args is {
  index: number;
  format?: string;
  accountId: string;
} {
  return (
    args &&
    typeof args.index === "number" &&
    (args.format === undefined || typeof args.format === "string") &&
    hasRequiredAccountId(args)
  );
}

export function isSendEmailArgs(args: any): args is {
  to: string[];
  subject: string;
  body: string;
  cc?: string[];
  bcc?: string[];
  isHtml?: boolean;
  attachments?: Array<{
    filePath?: string;
    driveFileId?: string;
    filename?: string;
    mimeType?: string;
  }>;
  accountId: string;
} {
  return (
    typeof args === "object" &&
    Array.isArray(args.to) &&
    typeof args.subject === "string" &&
    typeof args.body === "string" &&
    (args.cc === undefined || Array.isArray(args.cc)) &&
    (args.bcc === undefined || Array.isArray(args.bcc)) &&
    (args.isHtml === undefined || typeof args.isHtml === "boolean") &&
    (args.attachments === undefined || Array.isArray(args.attachments)) &&
    hasRequiredAccountId(args)
  );
}

export function isDraftEmailArgs(args: any): args is {
  to: string[];
  subject: string;
  body: string;
  cc?: string[];
  bcc?: string[];
  isHtml?: boolean;
  attachments?: Array<{
    filePath?: string;
    driveFileId?: string;
    filename?: string;
    mimeType?: string;
  }>;
  accountId: string;
} {
  return (
    typeof args === "object" &&
    Array.isArray(args.to) &&
    typeof args.subject === "string" &&
    typeof args.body === "string" &&
    (args.cc === undefined || Array.isArray(args.cc)) &&
    (args.bcc === undefined || Array.isArray(args.bcc)) &&
    (args.isHtml === undefined || typeof args.isHtml === "boolean") &&
    (args.attachments === undefined || Array.isArray(args.attachments)) &&
    hasRequiredAccountId(args)
  );
}

export function isDeleteEmailArgs(args: any): args is {
  messageId: string;
  permanently?: boolean;
  accountId: string;
} {
  return (
    args &&
    typeof args.messageId === "string" &&
    (args.permanently === undefined || typeof args.permanently === "boolean") &&
    hasRequiredAccountId(args)
  );
}

export function isModifyLabelsArgs(args: any): args is {
  messageId: string;
  addLabelIds?: string[];
  removeLabelIds?: string[];
  accountId: string;
} {
  return (
    args &&
    typeof args.messageId === "string" &&
    (args.addLabelIds === undefined || Array.isArray(args.addLabelIds)) &&
    (args.removeLabelIds === undefined || Array.isArray(args.removeLabelIds)) &&
    hasRequiredAccountId(args)
  );
}

// Google Drive validation functions
export function isListFilesArgs(args: any): args is {
  query?: string;
  pageSize?: number;
  orderBy?: string;
  fields?: string;
  accountId: string;
} {
  return (
    args &&
    (args.query === undefined || typeof args.query === "string") &&
    (args.pageSize === undefined || typeof args.pageSize === "number") &&
    (args.orderBy === undefined || typeof args.orderBy === "string") &&
    (args.fields === undefined || typeof args.fields === "string") &&
    hasRequiredAccountId(args)
  );
}

export function isGetFileContentArgs(args: any): args is {
  fileId: string;
  accountId: string;
} {
  return args && typeof args.fileId === "string" && hasRequiredAccountId(args);
}

export function isCreateFileArgs(args: any): args is {
  name: string;
  content: string;
  mimeType?: string;
  folderId?: string;
  sourceMimeType?: string;
  accountId: string;
} {
  return (
    args &&
    typeof args.name === "string" &&
    typeof args.content === "string" &&
    (args.mimeType === undefined || typeof args.mimeType === "string") &&
    (args.folderId === undefined || typeof args.folderId === "string") &&
    (args.sourceMimeType === undefined || typeof args.sourceMimeType === "string") &&
    hasRequiredAccountId(args)
  );
}

export function isUpdateFileArgs(args: any): args is {
  fileId: string;
  content: string;
  mimeType?: string;
  sourceMimeType?: string;
  accountId: string;
} {
  return (
    args &&
    typeof args.fileId === "string" &&
    typeof args.content === "string" &&
    (args.mimeType === undefined || typeof args.mimeType === "string") &&
    (args.sourceMimeType === undefined || typeof args.sourceMimeType === "string") &&
    hasRequiredAccountId(args)
  );
}

export function isDeleteFileArgs(args: any): args is {
  fileId: string;
  permanently?: boolean;
  accountId: string;
} {
  return (
    args &&
    typeof args.fileId === "string" &&
    (args.permanently === undefined || typeof args.permanently === "boolean") &&
    hasRequiredAccountId(args)
  );
}

export function isShareFileArgs(args: any): args is {
  fileId: string;
  emailAddress: string;
  role?: string;
  sendNotification?: boolean;
  message?: string;
  accountId: string;
} {
  return (
    args &&
    typeof args.fileId === "string" &&
    typeof args.emailAddress === "string" &&
    (args.role === undefined || typeof args.role === "string") &&
    (args.sendNotification === undefined ||
      typeof args.sendNotification === "boolean") &&
    (args.message === undefined || typeof args.message === "string") &&
    hasRequiredAccountId(args)
  );
}

// Google Tasks validation functions
export function isSetDefaultTaskListArgs(args: any): args is {
  taskListId: string;
  accountId: string;
} {
  return args && typeof args.taskListId === "string" && hasRequiredAccountId(args);
}

export function isListTaskListsArgs(args: any): args is { accountId: string } {
  return (
    args &&
    hasRequiredAccountId(args) &&
    Object.keys(args).every((k) => k === "accountId")
  );
}

export function isListTasksArgs(args: any): args is {
  taskListId?: string;
  showCompleted?: boolean;
  accountId: string;
} {
  return (
    args &&
    (args.taskListId === undefined || typeof args.taskListId === "string") &&
    (args.showCompleted === undefined ||
      typeof args.showCompleted === "boolean") &&
    hasRequiredAccountId(args)
  );
}

export function isGetTaskArgs(args: any): args is {
  taskId: string;
  taskListId?: string;
  accountId: string;
} {
  return (
    args &&
    typeof args.taskId === "string" &&
    (args.taskListId === undefined || typeof args.taskListId === "string") &&
    hasRequiredAccountId(args)
  );
}

export function isCreateTaskArgs(args: any): args is {
  title: string;
  notes?: string;
  due?: string;
  taskListId?: string;
  accountId: string;
} {
  return (
    args &&
    typeof args.title === "string" &&
    (args.notes === undefined || typeof args.notes === "string") &&
    (args.due === undefined || typeof args.due === "string") &&
    (args.taskListId === undefined || typeof args.taskListId === "string") &&
    hasRequiredAccountId(args)
  );
}

export function isUpdateTaskArgs(args: any): args is {
  taskId: string;
  title?: string;
  notes?: string;
  due?: string;
  status?: string;
  taskListId?: string;
  accountId: string;
} {
  return (
    args &&
    typeof args.taskId === "string" &&
    (args.title === undefined || typeof args.title === "string") &&
    (args.notes === undefined || typeof args.notes === "string") &&
    (args.due === undefined || typeof args.due === "string") &&
    (args.status === undefined || typeof args.status === "string") &&
    (args.taskListId === undefined || typeof args.taskListId === "string") &&
    hasRequiredAccountId(args)
  );
}

export function isCompleteTaskArgs(args: any): args is {
  taskId: string;
  taskListId?: string;
  accountId: string;
} {
  return (
    args &&
    typeof args.taskId === "string" &&
    (args.taskListId === undefined || typeof args.taskListId === "string") &&
    hasRequiredAccountId(args)
  );
}

export function isDeleteTaskArgs(args: any): args is {
  taskId: string;
  taskListId?: string;
  accountId: string;
} {
  return (
    args &&
    typeof args.taskId === "string" &&
    (args.taskListId === undefined || typeof args.taskListId === "string") &&
    hasRequiredAccountId(args)
  );
}

export function isCreateTaskListArgs(args: any): args is {
  title: string;
  accountId: string;
} {
  return args && typeof args.title === "string" && hasRequiredAccountId(args);
}

export function isDeleteTaskListArgs(args: any): args is {
  taskListId: string;
  accountId: string;
} {
  return args && typeof args.taskListId === "string" && hasRequiredAccountId(args);
}

// OAuth validation functions
export function isRefreshTokensArgs(args: any): args is { accountId: string } {
  return (
    args &&
    hasRequiredAccountId(args) &&
    Object.keys(args).every((k) => k === "accountId")
  );
}

export function isReauthenticateArgs(args: any): args is { accountId: string } {
  return (
    args &&
    hasRequiredAccountId(args) &&
    Object.keys(args).every((k) => k === "accountId")
  );
}

export function isReplyEmailArgs(args: any): args is {
  messageId: string;
  body: string;
  to?: string[];
  cc?: string[];
  bcc?: string[];
  isHtml?: boolean;
  attachments?: Array<{
    filePath?: string;
    driveFileId?: string;
    filename?: string;
    mimeType?: string;
  }>;
  accountId: string;
} {
  return (
    typeof args === "object" &&
    typeof args.messageId === "string" &&
    typeof args.body === "string" &&
    (args.to === undefined || Array.isArray(args.to)) &&
    (args.cc === undefined || Array.isArray(args.cc)) &&
    (args.bcc === undefined || Array.isArray(args.bcc)) &&
    (args.isHtml === undefined || typeof args.isHtml === "boolean") &&
    (args.attachments === undefined || Array.isArray(args.attachments)) &&
    hasRequiredAccountId(args)
  );
}

export function isDownloadAttachmentsArgs(args: any): args is {
  messageId: string;
  downloadPath?: string;
  accountId: string;
} {
  return (
    typeof args === "object" &&
    typeof args.messageId === "string" &&
    (args.downloadPath === undefined || typeof args.downloadPath === "string") &&
    hasRequiredAccountId(args)
  );
}

// Google Sheets validation functions
export function isGetSpreadsheetArgs(args: any): args is {
  spreadsheetId: string;
  includeGridData?: boolean;
  accountId: string;
} {
  return (
    args &&
    typeof args.spreadsheetId === "string" &&
    (args.includeGridData === undefined || typeof args.includeGridData === "boolean") &&
    hasRequiredAccountId(args)
  );
}

export function isGetValuesArgs(args: any): args is {
  spreadsheetId: string;
  range: string;
  accountId: string;
} {
  return (
    args &&
    typeof args.spreadsheetId === "string" &&
    typeof args.range === "string" &&
    hasRequiredAccountId(args)
  );
}

export function isUpdateValuesArgs(args: any): args is {
  spreadsheetId: string;
  range: string;
  values: any[][];
  valueInputOption?: string;
  accountId: string;
} {
  return (
    args &&
    typeof args.spreadsheetId === "string" &&
    typeof args.range === "string" &&
    Array.isArray(args.values) &&
    (args.valueInputOption === undefined || typeof args.valueInputOption === "string") &&
    hasRequiredAccountId(args)
  );
}

export function isAppendValuesArgs(args: any): args is {
  spreadsheetId: string;
  range: string;
  values: any[][];
  valueInputOption?: string;
  accountId: string;
} {
  return (
    args &&
    typeof args.spreadsheetId === "string" &&
    typeof args.range === "string" &&
    Array.isArray(args.values) &&
    (args.valueInputOption === undefined || typeof args.valueInputOption === "string") &&
    hasRequiredAccountId(args)
  );
}

export function isClearValuesArgs(args: any): args is {
  spreadsheetId: string;
  range: string;
  accountId: string;
} {
  return (
    args &&
    typeof args.spreadsheetId === "string" &&
    typeof args.range === "string" &&
    hasRequiredAccountId(args)
  );
}

export function isBatchGetValuesArgs(args: any): args is {
  spreadsheetId: string;
  ranges: string[];
  accountId: string;
} {
  return (
    args &&
    typeof args.spreadsheetId === "string" &&
    Array.isArray(args.ranges) &&
    hasRequiredAccountId(args)
  );
}

export function isAddSheetArgs(args: any): args is {
  spreadsheetId: string;
  title: string;
  accountId: string;
} {
  return (
    args &&
    typeof args.spreadsheetId === "string" &&
    typeof args.title === "string" &&
    hasRequiredAccountId(args)
  );
}

// Google Docs validation functions
export function isGetDocumentArgs(args: any): args is {
  documentId: string;
  accountId: string;
} {
  return (
    args &&
    typeof args.documentId === "string" &&
    hasRequiredAccountId(args)
  );
}

export function isCreateDocumentArgs(args: any): args is {
  title: string;
  content?: string;
  accountId: string;
} {
  return (
    args &&
    typeof args.title === "string" &&
    (args.content === undefined || typeof args.content === "string") &&
    hasRequiredAccountId(args)
  );
}

export function isAppendTextArgs(args: any): args is {
  documentId: string;
  text: string;
  accountId: string;
} {
  return (
    args &&
    typeof args.documentId === "string" &&
    typeof args.text === "string" &&
    hasRequiredAccountId(args)
  );
}

export function isReplaceTextArgs(args: any): args is {
  documentId: string;
  findText: string;
  replaceText: string;
  matchCase?: boolean;
  accountId: string;
} {
  return (
    args &&
    typeof args.documentId === "string" &&
    typeof args.findText === "string" &&
    typeof args.replaceText === "string" &&
    (args.matchCase === undefined || typeof args.matchCase === "boolean") &&
    hasRequiredAccountId(args)
  );
}

export function isInsertTextArgs(args: any): args is {
  documentId: string;
  text: string;
  index: number;
  accountId: string;
} {
  return (
    args &&
    typeof args.documentId === "string" &&
    typeof args.text === "string" &&
    typeof args.index === "number" &&
    hasRequiredAccountId(args)
  );
}

// Account management validation functions
export function isAccountAuthenticateArgs(args: any): args is Record<string, never> {
  return args && Object.keys(args).length === 0;
}

export function isAccountListArgs(args: any): args is Record<string, never> {
  return args && Object.keys(args).length === 0;
}

export function isAccountSetDefaultArgs(args: any): args is { accountId: string } {
  return args && typeof args.accountId === "string";
}

export function isAccountRemoveArgs(args: any): args is { accountId: string } {
  return args && typeof args.accountId === "string";
}
