import { type Tool } from "@modelcontextprotocol/sdk/types.js";

const accountIdProperty = {
  accountId: {
    type: "string",
    description:
      "Required. Email address of the Google account to use. Use google_account_list to see authenticated accounts, or google_account_authenticate to add a new account.",
  },
};

export const SET_DEFAULT_CALENDAR_TOOL: Tool = {
  name: "google_calendar_set_default",
  description: "Set the default calendar ID for operations",
  inputSchema: {
    type: "object",
    properties: {
      calendarId: {
        type: "string",
        description: "The ID of the calendar to set as default",
      },
      ...accountIdProperty,
    },
    required: ["calendarId", "accountId"],
  },
};

export const LIST_CALENDARS_TOOL: Tool = {
  name: "google_calendar_list_calendars",
  description: "List all available calendars",
  inputSchema: {
    type: "object",
    properties: {
      ...accountIdProperty,
    },
    required: ["accountId"],
  },
};

export const CREATE_EVENT_TOOL: Tool = {
  name: "google_calendar_create_event",
  description: "Create a new event in Google Calendar",
  inputSchema: {
    type: "object",
    properties: {
      summary: {
        type: "string",
        description: "The title/summary of the event",
      },
      description: {
        type: "string",
        description: "Detailed description of the event",
      },
      location: {
        type: "string",
        description: "Physical location or address",
      },
      start: {
        type: "string",
        description:
          "Start time of the event in ISO 8601 format (e.g. 2025-04-02T10:00:00-07:00)",
      },
      end: {
        type: "string",
        description:
          "End time of the event in ISO 8601 format (e.g. 2025-04-02T11:00:00-07:00)",
      },
      colorId: {
        type: "string",
        description: "Color identifier (1-11) for the event",
      },
      attendees: {
        type: "array",
        items: { type: "string" },
        description: "List of email addresses to invite",
      },
      recurrence: {
        type: "string",
        description:
          "RFC5545 recurrence rule (e.g., 'RRULE:FREQ=WEEKLY;COUNT=10')",
      },
      calendarId: {
        type: "string",
        description:
          "Optional: ID of calendar to use (defaults to primary if not specified)",
      },
      ...accountIdProperty,
    },
    required: ["summary", "start", "end", "accountId"],
  },
};

export const GET_EVENTS_TOOL: Tool = {
  name: "google_calendar_get_events",
  description: "Retrieve upcoming events from Google Calendar",
  inputSchema: {
    type: "object",
    properties: {
      limit: {
        type: "number",
        description: "Maximum number of events to return",
      },
      calendarId: {
        type: "string",
        description:
          "Optional: ID of calendar to use (defaults to primary if not specified)",
      },
      timeMin: {
        type: "string",
        description: "Start date/time in ISO format (defaults to now)",
      },
      timeMax: {
        type: "string",
        description: "End date/time in ISO format",
      },
      q: {
        type: "string",
        description: "Free text search term for events",
      },
      showDeleted: {
        type: "boolean",
        description: "Whether to include deleted events",
      },
      ...accountIdProperty,
    },
    required: ["accountId"],
  },
};

export const GET_EVENT_TOOL: Tool = {
  name: "google_calendar_get_event",
  description: "Get detailed information about a specific event",
  inputSchema: {
    type: "object",
    properties: {
      eventId: {
        type: "string",
        description: "ID of the event to retrieve",
      },
      calendarId: {
        type: "string",
        description:
          "Optional: ID of calendar to use (defaults to primary if not specified)",
      },
      ...accountIdProperty,
    },
    required: ["eventId", "accountId"],
  },
};

export const UPDATE_EVENT_TOOL: Tool = {
  name: "google_calendar_update_event",
  description: "Update an existing event in Google Calendar",
  inputSchema: {
    type: "object",
    properties: {
      eventId: {
        type: "string",
        description: "ID of the event to update",
      },
      summary: {
        type: "string",
        description: "The title/summary of the event",
      },
      description: {
        type: "string",
        description: "Detailed description of the event",
      },
      start: {
        type: "string",
        description: "Start time in ISO 8601 format",
      },
      end: {
        type: "string",
        description: "End time in ISO 8601 format",
      },
      location: {
        type: "string",
        description: "Physical location or address",
      },
      colorId: {
        type: "string",
        description: "Color identifier (1-11) for the event",
      },
      attendees: {
        type: "array",
        items: { type: "string" },
        description: "List of email addresses to invite",
      },
      recurrence: {
        type: "string",
        description:
          "RFC5545 recurrence rule (e.g., 'RRULE:FREQ=WEEKLY;COUNT=10')",
      },
      calendarId: {
        type: "string",
        description:
          "Optional: ID of calendar to use (defaults to primary if not specified)",
      },
      ...accountIdProperty,
    },
    required: ["eventId", "accountId"],
  },
};

export const DELETE_EVENT_TOOL: Tool = {
  name: "google_calendar_delete_event",
  description: "Delete an event from Google Calendar",
  inputSchema: {
    type: "object",
    properties: {
      eventId: {
        type: "string",
        description: "ID of the event to delete",
      },
      calendarId: {
        type: "string",
        description:
          "Optional: ID of calendar to use (defaults to primary if not specified)",
      },
      ...accountIdProperty,
    },
    required: ["eventId", "accountId"],
  },
};

export const FIND_FREE_TIME_TOOL: Tool = {
  name: "google_calendar_find_free_time",
  description:
    "Find available time slots when all specified calendars and attendees are free. Uses the Google FreeBusy API to check availability across multiple people.",
  inputSchema: {
    type: "object",
    properties: {
      startDate: {
        type: "string",
        description: "Start of search period (ISO format)",
      },
      endDate: {
        type: "string",
        description: "End of search period (ISO format)",
      },
      duration: {
        type: "number",
        description: "Minimum slot duration in minutes",
      },
      calendarIds: {
        type: "array",
        items: { type: "string" },
        description:
          "Optional: Calendar IDs to check (defaults to primary if not specified)",
      },
      attendeeEmails: {
        type: "array",
        items: { type: "string" },
        description:
          "Email addresses of attendees to check availability for. Their calendars must be shared (at least free/busy) with your account.",
      },
      ...accountIdProperty,
    },
    required: ["startDate", "endDate", "duration", "accountId"],
  },
};

export const RESPOND_TO_EVENT_TOOL: Tool = {
  name: "google_calendar_respond_to_event",
  description:
    "Respond to a calendar event invitation (accept, decline, or tentatively accept)",
  inputSchema: {
    type: "object",
    properties: {
      eventId: {
        type: "string",
        description: "ID of the event to respond to",
      },
      response: {
        type: "string",
        enum: ["accepted", "declined", "tentative"],
        description:
          'Your RSVP response: "accepted", "declined", or "tentative"',
      },
      calendarId: {
        type: "string",
        description:
          "Optional: ID of calendar to use (defaults to primary if not specified)",
      },
      ...accountIdProperty,
    },
    required: ["eventId", "response", "accountId"],
  },
};

export const QUICK_ADD_EVENT_TOOL: Tool = {
  name: "google_calendar_quick_add_event",
  description:
    "Create an event using natural language (e.g., 'Meeting with Bob tomorrow at 3pm for 1 hour')",
  inputSchema: {
    type: "object",
    properties: {
      text: {
        type: "string",
        description:
          "Natural language description of the event to create",
      },
      calendarId: {
        type: "string",
        description:
          "Optional: ID of calendar to use (defaults to primary if not specified)",
      },
      ...accountIdProperty,
    },
    required: ["text", "accountId"],
  },
};

export const GET_EVENT_INSTANCES_TOOL: Tool = {
  name: "google_calendar_get_event_instances",
  description:
    "List individual occurrences of a recurring event",
  inputSchema: {
    type: "object",
    properties: {
      eventId: {
        type: "string",
        description: "ID of the recurring event",
      },
      timeMin: {
        type: "string",
        description: "Start of time range in ISO format",
      },
      timeMax: {
        type: "string",
        description: "End of time range in ISO format",
      },
      maxResults: {
        type: "number",
        description: "Maximum number of instances to return",
      },
      calendarId: {
        type: "string",
        description:
          "Optional: ID of calendar to use (defaults to primary if not specified)",
      },
      ...accountIdProperty,
    },
    required: ["eventId", "accountId"],
  },
};

export const MOVE_EVENT_TOOL: Tool = {
  name: "google_calendar_move_event",
  description: "Move an event from one calendar to another",
  inputSchema: {
    type: "object",
    properties: {
      eventId: {
        type: "string",
        description: "ID of the event to move",
      },
      destinationCalendarId: {
        type: "string",
        description: "ID of the destination calendar",
      },
      sourceCalendarId: {
        type: "string",
        description:
          "Optional: ID of the source calendar (defaults to primary if not specified)",
      },
      ...accountIdProperty,
    },
    required: ["eventId", "destinationCalendarId", "accountId"],
  },
};

export const calendarTools = [
  SET_DEFAULT_CALENDAR_TOOL,
  LIST_CALENDARS_TOOL,
  CREATE_EVENT_TOOL,
  GET_EVENTS_TOOL,
  GET_EVENT_TOOL,
  UPDATE_EVENT_TOOL,
  DELETE_EVENT_TOOL,
  FIND_FREE_TIME_TOOL,
  RESPOND_TO_EVENT_TOOL,
  QUICK_ADD_EVENT_TOOL,
  GET_EVENT_INSTANCES_TOOL,
  MOVE_EVENT_TOOL,
];
