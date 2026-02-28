import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import tools from "./tools/index";
import { getTokensDir, migrateTokenFile } from "./utils/auth";
import { AccountRegistry } from "./utils/account-registry";
import { BUILD_HASH, BUILD_TIME } from "./utils/build-info";

// Import handlers
import * as calendarHandlers from "./handlers/calendar";
import * as gmailHandlers from "./handlers/gmail";
import * as driveHandlers from "./handlers/drive";
import * as tasksHandlers from "./handlers/tasks";
import * as sheetsHandlers from "./handlers/sheets";
import * as docsHandlers from "./handlers/docs";
import * as oauthHandlers from "./handlers/oauth";
import * as accountHandlers from "./handlers/account";

export function createGoogleMcpServer() {
  const tokensDir = getTokensDir();
  const registry = new AccountRegistry(tokensDir);
  let initializationPromise: Promise<void>;

  // Initialize the MCP server
  const server = new Server(
    { name: "Google MCP Server", version: BUILD_HASH },
    { capabilities: { tools: {} } }
  );

  // Handle the "list tools" request
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools,
  }));

  // Handle the "call tool" request
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    try {
      const { name, arguments: args } = request.params;
      if (!args) throw new Error("No arguments provided");

      // Server info tool (no auth required)
      if (name === "google_server_info") {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  buildHash: BUILD_HASH,
                  buildTime: BUILD_TIME,
                  toolCount: tools.length,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      // Account management tools (don't require initialization, no account wrapping)
      if (name === "google_account_authenticate") {
        return await accountHandlers.handleAccountAuthenticate(args, registry);
      }
      if (name === "google_account_list") {
        return await accountHandlers.handleAccountList(args, registry);
      }
      if (name === "google_account_set_default") {
        return await accountHandlers.handleAccountSetDefault(args, registry);
      }
      if (name === "google_account_remove") {
        return await accountHandlers.handleAccountRemove(args, registry);
      }

      // OAuth tools (don't require initialization, but get account wrapping)
      if (name === "google_oauth_refresh_tokens") {
        const oauthResult = await oauthHandlers.handleOauthRefreshTokens(args, registry);
        if (!oauthResult.isError && (args as any)?.accountId) {
          oauthResult.content = [
            { type: "text", text: `[Account: ${(args as any).accountId}]` },
            ...oauthResult.content,
          ];
        }
        return oauthResult;
      }
      if (name === "google_oauth_reauthenticate") {
        const oauthResult = await oauthHandlers.handleOauthReauthenticate(args, registry);
        if (!oauthResult.isError && (args as any)?.accountId) {
          oauthResult.content = [
            { type: "text", text: `[Account: ${(args as any).accountId}]` },
            ...oauthResult.content,
          ];
        }
        return oauthResult;
      }

      // For all other tools, ensure initialization is complete
      await initializationPromise;

      if (!registry.hasAccounts()) {
        return {
          content: [
            {
              type: "text",
              text: "No Google accounts are authenticated. Use google_account_authenticate to add an account.",
            },
          ],
          isError: true,
        };
      }

      // Resolve the service bundle for the requested account
      const accountId = (args as any)?.accountId;
      const bundle = registry.getServiceBundle(accountId);

      let handlerResult: { content: any[]; isError?: boolean };

      // Route to appropriate handlers
      switch (name) {
        // Calendar tools
        case "google_calendar_set_default":
          handlerResult = await calendarHandlers.handleCalendarSetDefault(
            args,
            bundle.calendar
          );
          break;
        case "google_calendar_list_calendars":
          handlerResult = await calendarHandlers.handleCalendarListCalendars(
            args,
            bundle.calendar
          );
          break;
        case "google_calendar_create_event":
          handlerResult = await calendarHandlers.handleCalendarCreateEvent(
            args,
            bundle.calendar
          );
          break;
        case "google_calendar_get_events":
          handlerResult = await calendarHandlers.handleCalendarGetEvents(
            args,
            bundle.calendar
          );
          break;
        case "google_calendar_get_event":
          handlerResult = await calendarHandlers.handleCalendarGetEvent(
            args,
            bundle.calendar
          );
          break;
        case "google_calendar_update_event":
          handlerResult = await calendarHandlers.handleCalendarUpdateEvent(
            args,
            bundle.calendar
          );
          break;
        case "google_calendar_delete_event":
          handlerResult = await calendarHandlers.handleCalendarDeleteEvent(
            args,
            bundle.calendar
          );
          break;
        case "google_calendar_find_free_time":
          handlerResult = await calendarHandlers.handleCalendarFindFreeTime(
            args,
            bundle.calendar
          );
          break;

        // Gmail tools
        case "google_gmail_list_labels":
          handlerResult = await gmailHandlers.handleGmailListLabels(
            args,
            bundle.gmail
          );
          break;
        case "google_gmail_list_emails":
          handlerResult = await gmailHandlers.handleGmailListEmails(
            args,
            bundle.gmail
          );
          break;
        case "google_gmail_get_email":
          handlerResult = await gmailHandlers.handleGmailGetEmail(
            args,
            bundle.gmail
          );
          break;
        case "google_gmail_get_email_by_index":
          handlerResult = await gmailHandlers.handleGmailGetEmailByIndex(
            args,
            bundle.gmail
          );
          break;
        case "google_gmail_send_email":
          handlerResult = await gmailHandlers.handleGmailSendEmail(
            args,
            bundle.gmail
          );
          break;
        case "google_gmail_draft_email":
          handlerResult = await gmailHandlers.handleGmailDraftEmail(
            args,
            bundle.gmail
          );
          break;
        case "google_gmail_reply_email":
          handlerResult = await gmailHandlers.handleGmailReplyEmail(
            args,
            bundle.gmail
          );
          break;
        case "google_gmail_draft_reply":
          handlerResult = await gmailHandlers.handleGmailDraftReply(
            args,
            bundle.gmail
          );
          break;
        case "google_gmail_delete_email":
          handlerResult = await gmailHandlers.handleGmailDeleteEmail(
            args,
            bundle.gmail
          );
          break;
        case "google_gmail_modify_labels":
          handlerResult = await gmailHandlers.handleGmailModifyLabels(
            args,
            bundle.gmail
          );
          break;
        case "google_gmail_download_attachments":
          handlerResult = await gmailHandlers.handleGmailDownloadAttachments(
            args,
            bundle.gmail
          );
          break;

        // Drive tools
        case "google_drive_list_files":
          handlerResult = await driveHandlers.handleDriveListFiles(
            args,
            bundle.drive
          );
          break;
        case "google_drive_get_file_content":
          handlerResult = await driveHandlers.handleDriveGetFileContent(
            args,
            bundle.drive
          );
          break;
        case "google_drive_create_file":
          handlerResult = await driveHandlers.handleDriveCreateFile(
            args,
            bundle.drive
          );
          break;
        case "google_drive_update_file":
          handlerResult = await driveHandlers.handleDriveUpdateFile(
            args,
            bundle.drive
          );
          break;
        case "google_drive_delete_file":
          handlerResult = await driveHandlers.handleDriveDeleteFile(
            args,
            bundle.drive
          );
          break;
        case "google_drive_share_file":
          handlerResult = await driveHandlers.handleDriveShareFile(
            args,
            bundle.drive
          );
          break;

        // Tasks tools
        case "google_tasks_set_default_list":
          handlerResult = await tasksHandlers.handleTasksSetDefaultList(
            args,
            bundle.tasks
          );
          break;
        case "google_tasks_list_tasklists":
          handlerResult = await tasksHandlers.handleTasksListTasklists(
            args,
            bundle.tasks
          );
          break;
        case "google_tasks_list_tasks":
          handlerResult = await tasksHandlers.handleTasksListTasks(
            args,
            bundle.tasks
          );
          break;
        case "google_tasks_get_task":
          handlerResult = await tasksHandlers.handleTasksGetTask(
            args,
            bundle.tasks
          );
          break;
        case "google_tasks_create_task":
          handlerResult = await tasksHandlers.handleTasksCreateTask(
            args,
            bundle.tasks
          );
          break;
        case "google_tasks_update_task":
          handlerResult = await tasksHandlers.handleTasksUpdateTask(
            args,
            bundle.tasks
          );
          break;
        case "google_tasks_complete_task":
          handlerResult = await tasksHandlers.handleTasksCompleteTask(
            args,
            bundle.tasks
          );
          break;
        case "google_tasks_delete_task":
          handlerResult = await tasksHandlers.handleTasksDeleteTask(
            args,
            bundle.tasks
          );
          break;
        case "google_tasks_create_tasklist":
          handlerResult = await tasksHandlers.handleTasksCreateTasklist(
            args,
            bundle.tasks
          );
          break;
        case "google_tasks_delete_tasklist":
          handlerResult = await tasksHandlers.handleTasksDeleteTasklist(
            args,
            bundle.tasks
          );
          break;

        // Sheets tools
        case "google_sheets_get_spreadsheet":
          handlerResult = await sheetsHandlers.handleSheetsGetSpreadsheet(
            args,
            bundle.sheets
          );
          break;
        case "google_sheets_get_values":
          handlerResult = await sheetsHandlers.handleSheetsGetValues(
            args,
            bundle.sheets
          );
          break;
        case "google_sheets_update_values":
          handlerResult = await sheetsHandlers.handleSheetsUpdateValues(
            args,
            bundle.sheets
          );
          break;
        case "google_sheets_append_values":
          handlerResult = await sheetsHandlers.handleSheetsAppendValues(
            args,
            bundle.sheets
          );
          break;
        case "google_sheets_clear_values":
          handlerResult = await sheetsHandlers.handleSheetsClearValues(
            args,
            bundle.sheets
          );
          break;
        case "google_sheets_batch_get_values":
          handlerResult = await sheetsHandlers.handleSheetsBatchGetValues(
            args,
            bundle.sheets
          );
          break;
        case "google_sheets_add_sheet":
          handlerResult = await sheetsHandlers.handleSheetsAddSheet(
            args,
            bundle.sheets
          );
          break;

        // Docs tools
        case "google_docs_get_document":
          handlerResult = await docsHandlers.handleDocsGetDocument(
            args,
            bundle.docs
          );
          break;
        case "google_docs_create_document":
          handlerResult = await docsHandlers.handleDocsCreateDocument(
            args,
            bundle.docs
          );
          break;
        case "google_docs_append_text":
          handlerResult = await docsHandlers.handleDocsAppendText(
            args,
            bundle.docs
          );
          break;
        case "google_docs_replace_text":
          handlerResult = await docsHandlers.handleDocsReplaceText(
            args,
            bundle.docs
          );
          break;
        case "google_docs_insert_text":
          handlerResult = await docsHandlers.handleDocsInsertText(
            args,
            bundle.docs
          );
          break;

        default:
          return {
            content: [{ type: "text", text: `Unknown tool: ${name}` }],
            isError: true,
          };
      }

      // Prepend account info to successful responses
      if (!handlerResult.isError && accountId) {
        handlerResult.content = [
          { type: "text", text: `[Account: ${accountId}]` },
          ...handlerResult.content,
        ];
      }

      return handlerResult;
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error: ${
              error instanceof Error ? error.message : String(error)
            }`,
          },
        ],
        isError: true,
      };
    }
  });

  // Initialize: migrate legacy tokens, then load all accounts
  initializationPromise = (async () => {
    try {
      await migrateTokenFile(tokensDir);
      await registry.loadAllAccounts();
    } catch (error) {
      // Non-fatal: server can still operate, user can authenticate manually
      console.error(
        `Initialization warning: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  })();

  return server;
}
