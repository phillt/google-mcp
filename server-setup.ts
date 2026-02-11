import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import tools from "./tools/index";
import { getTokensDir, migrateTokenFile } from "./utils/auth";
import { AccountRegistry } from "./utils/account-registry";

// Import handlers
import * as calendarHandlers from "./handlers/calendar";
import * as gmailHandlers from "./handlers/gmail";
import * as driveHandlers from "./handlers/drive";
import * as tasksHandlers from "./handlers/tasks";
import * as oauthHandlers from "./handlers/oauth";
import * as accountHandlers from "./handlers/account";

export function createGoogleMcpServer() {
  const tokensDir = getTokensDir();
  const registry = new AccountRegistry(tokensDir);
  let initializationPromise: Promise<void>;

  // Initialize the MCP server
  const server = new Server(
    { name: "Google MCP Server", version: "0.0.1" },
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

      // Account management tools (don't require initialization)
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

      // OAuth tools (don't require initialization)
      if (name === "google_oauth_refresh_tokens") {
        return await oauthHandlers.handleOauthRefreshTokens(args, registry);
      }
      if (name === "google_oauth_reauthenticate") {
        return await oauthHandlers.handleOauthReauthenticate(args, registry);
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
      const bundle = registry.getServiceBundle((args as any)?.accountId);

      // Route to appropriate handlers
      switch (name) {
        // Calendar tools
        case "google_calendar_set_default":
          return await calendarHandlers.handleCalendarSetDefault(
            args,
            bundle.calendar
          );
        case "google_calendar_list_calendars":
          return await calendarHandlers.handleCalendarListCalendars(
            args,
            bundle.calendar
          );
        case "google_calendar_create_event":
          return await calendarHandlers.handleCalendarCreateEvent(
            args,
            bundle.calendar
          );
        case "google_calendar_get_events":
          return await calendarHandlers.handleCalendarGetEvents(
            args,
            bundle.calendar
          );
        case "google_calendar_get_event":
          return await calendarHandlers.handleCalendarGetEvent(
            args,
            bundle.calendar
          );
        case "google_calendar_update_event":
          return await calendarHandlers.handleCalendarUpdateEvent(
            args,
            bundle.calendar
          );
        case "google_calendar_delete_event":
          return await calendarHandlers.handleCalendarDeleteEvent(
            args,
            bundle.calendar
          );
        case "google_calendar_find_free_time":
          return await calendarHandlers.handleCalendarFindFreeTime(
            args,
            bundle.calendar
          );

        // Gmail tools
        case "google_gmail_list_labels":
          return await gmailHandlers.handleGmailListLabels(
            args,
            bundle.gmail
          );
        case "google_gmail_list_emails":
          return await gmailHandlers.handleGmailListEmails(
            args,
            bundle.gmail
          );
        case "google_gmail_get_email":
          return await gmailHandlers.handleGmailGetEmail(
            args,
            bundle.gmail
          );
        case "google_gmail_get_email_by_index":
          return await gmailHandlers.handleGmailGetEmailByIndex(
            args,
            bundle.gmail
          );
        case "google_gmail_send_email":
          return await gmailHandlers.handleGmailSendEmail(
            args,
            bundle.gmail
          );
        case "google_gmail_draft_email":
          return await gmailHandlers.handleGmailDraftEmail(
            args,
            bundle.gmail
          );
        case "google_gmail_delete_email":
          return await gmailHandlers.handleGmailDeleteEmail(
            args,
            bundle.gmail
          );
        case "google_gmail_modify_labels":
          return await gmailHandlers.handleGmailModifyLabels(
            args,
            bundle.gmail
          );
        case "google_gmail_download_attachments":
          return await gmailHandlers.handleGmailDownloadAttachments(
            args,
            bundle.gmail
          );

        // Drive tools
        case "google_drive_list_files":
          return await driveHandlers.handleDriveListFiles(
            args,
            bundle.drive
          );
        case "google_drive_get_file_content":
          return await driveHandlers.handleDriveGetFileContent(
            args,
            bundle.drive
          );
        case "google_drive_create_file":
          return await driveHandlers.handleDriveCreateFile(
            args,
            bundle.drive
          );
        case "google_drive_update_file":
          return await driveHandlers.handleDriveUpdateFile(
            args,
            bundle.drive
          );
        case "google_drive_delete_file":
          return await driveHandlers.handleDriveDeleteFile(
            args,
            bundle.drive
          );
        case "google_drive_share_file":
          return await driveHandlers.handleDriveShareFile(
            args,
            bundle.drive
          );

        // Tasks tools
        case "google_tasks_set_default_list":
          return await tasksHandlers.handleTasksSetDefaultList(
            args,
            bundle.tasks
          );
        case "google_tasks_list_tasklists":
          return await tasksHandlers.handleTasksListTasklists(
            args,
            bundle.tasks
          );
        case "google_tasks_list_tasks":
          return await tasksHandlers.handleTasksListTasks(
            args,
            bundle.tasks
          );
        case "google_tasks_get_task":
          return await tasksHandlers.handleTasksGetTask(
            args,
            bundle.tasks
          );
        case "google_tasks_create_task":
          return await tasksHandlers.handleTasksCreateTask(
            args,
            bundle.tasks
          );
        case "google_tasks_update_task":
          return await tasksHandlers.handleTasksUpdateTask(
            args,
            bundle.tasks
          );
        case "google_tasks_complete_task":
          return await tasksHandlers.handleTasksCompleteTask(
            args,
            bundle.tasks
          );
        case "google_tasks_delete_task":
          return await tasksHandlers.handleTasksDeleteTask(
            args,
            bundle.tasks
          );
        case "google_tasks_create_tasklist":
          return await tasksHandlers.handleTasksCreateTasklist(
            args,
            bundle.tasks
          );
        case "google_tasks_delete_tasklist":
          return await tasksHandlers.handleTasksDeleteTasklist(
            args,
            bundle.tasks
          );

        default:
          return {
            content: [{ type: "text", text: `Unknown tool: ${name}` }],
            isError: true,
          };
      }
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
