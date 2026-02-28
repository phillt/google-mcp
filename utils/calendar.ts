import { google } from "googleapis";

export default class GoogleCalendar {
  private calendar: any;
  private defaultCalendarId: string;

  constructor(authClient: any, defaultCalendarId: string = "primary") {
    this.calendar = google.calendar({ version: "v3", auth: authClient });
    this.defaultCalendarId = defaultCalendarId;
  }

  setDefaultCalendarId(calendarId: string) {
    this.defaultCalendarId = calendarId;
    return `Default calendar ID set to: ${calendarId}`;
  }

  async createEvent(
    summary: string,
    start: string,
    end: string,
    calendarId?: string,
    description?: string,
    location?: string,
    colorId?: string,
    attendees?: string[],
    recurrence?: string
  ) {
    try {
      const targetCalendarId = calendarId || this.defaultCalendarId;

      // Build the request body with required fields
      const requestBody: any = {
        summary,
        start: { dateTime: start },
        end: { dateTime: end },
      };

      // Add optional fields if provided
      if (description) requestBody.description = description;
      if (location) requestBody.location = location;
      if (colorId) requestBody.colorId = colorId;

      // Format attendees if provided
      if (attendees && attendees.length > 0) {
        requestBody.attendees = attendees.map((email) => ({ email }));
      }

      // Add recurrence rule if provided
      if (recurrence) {
        requestBody.recurrence = [recurrence];
      }

      const event = await this.calendar.events.insert({
        calendarId: targetCalendarId,
        requestBody,
        sendUpdates: attendees && attendees.length > 0 ? "all" : "none",
      });

      return `Event "${summary}" created with ID: ${event.data.id} in calendar: ${targetCalendarId}`;
    } catch (error) {
      throw new Error(
        `Failed to create event: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  async getEvents(
    limit: number = 10,
    calendarId?: string,
    timeMin?: string,
    timeMax?: string,
    q?: string,
    showDeleted: boolean = false
  ) {
    try {
      const targetCalendarId = calendarId || this.defaultCalendarId;

      // Build request parameters
      const params: any = {
        calendarId: targetCalendarId,
        maxResults: limit,
        timeMin: timeMin || new Date().toISOString(),
        singleEvents: true,
        orderBy: "startTime",
      };

      // Add optional parameters
      if (timeMax) params.timeMax = timeMax;
      if (q) params.q = q;
      if (showDeleted) params.showDeleted = true;

      const res = await this.calendar.events.list(params);

      return (
        `Calendar: ${targetCalendarId}\n` +
        (res.data.items
          .map(
            (item: any) =>
              `${item.summary} (${item.start.dateTime || item.start.date} - ${
                item.end.dateTime || item.end.date
              })${item.id ? " - ID: " + item.id : ""}`
          )
          .join("\n") || "No upcoming events")
      );
    } catch (error) {
      throw new Error(
        `Failed to list events: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  async getEvent(eventId: string, calendarId?: string) {
    try {
      const targetCalendarId = calendarId || this.defaultCalendarId;
      const event = await this.calendar.events.get({
        calendarId: targetCalendarId,
        eventId: eventId,
      });

      const data = event.data;

      // Format the event details
      let result = `Event ID: ${data.id}\n`;
      result += `Title: ${data.summary}\n`;
      result += `Start: ${data.start.dateTime || data.start.date}\n`;
      result += `End: ${data.end.dateTime || data.end.date}\n`;

      if (data.description) result += `Description: ${data.description}\n`;
      if (data.location) result += `Location: ${data.location}\n`;

      if (data.attendees && data.attendees.length > 0) {
        result += `Attendees: ${data.attendees
          .map(
            (a: any) =>
              `${a.email}${
                a.responseStatus ? " (" + a.responseStatus + ")" : ""
              }`
          )
          .join(", ")}\n`;
      }

      if (data.recurrence)
        result += `Recurrence: ${data.recurrence.join(", ")}\n`;

      return result;
    } catch (error) {
      throw new Error(
        `Failed to get event: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  async updateEvent(
    eventId: string,
    changes: {
      summary?: string;
      description?: string;
      start?: string;
      end?: string;
      location?: string;
      colorId?: string;
      attendees?: string[];
      recurrence?: string;
    },
    calendarId?: string
  ) {
    try {
      const targetCalendarId = calendarId || this.defaultCalendarId;

      // First get the current event
      const currentEvent = await this.calendar.events.get({
        calendarId: targetCalendarId,
        eventId: eventId,
      });

      // Prepare updated event object
      const updatedEvent: any = {};

      // Only include fields that are being updated
      if (changes.summary !== undefined) updatedEvent.summary = changes.summary;
      if (changes.description !== undefined)
        updatedEvent.description = changes.description;
      if (changes.location !== undefined)
        updatedEvent.location = changes.location;
      if (changes.colorId !== undefined) updatedEvent.colorId = changes.colorId;

      // Update start/end times if provided
      if (changes.start) {
        updatedEvent.start = { dateTime: changes.start };
      }

      if (changes.end) {
        updatedEvent.end = { dateTime: changes.end };
      }

      // Format attendees if provided
      if (changes.attendees) {
        updatedEvent.attendees = changes.attendees.map((email) => ({ email }));
      }

      // Add recurrence rule if provided
      if (changes.recurrence) {
        updatedEvent.recurrence = [changes.recurrence];
      }

      // Send the update request
      const result = await this.calendar.events.patch({
        calendarId: targetCalendarId,
        eventId: eventId,
        requestBody: updatedEvent,
        sendUpdates: changes.attendees ? "all" : "none",
      });

      return `Event updated successfully: "${result.data.summary}"`;
    } catch (error) {
      throw new Error(
        `Failed to update event: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  async deleteEvent(eventId: string, calendarId?: string) {
    try {
      const targetCalendarId = calendarId || this.defaultCalendarId;

      await this.calendar.events.delete({
        calendarId: targetCalendarId,
        eventId: eventId,
        sendUpdates: "all", // Notify attendees about cancellation
      });

      return `Event ${eventId} deleted successfully from calendar ${targetCalendarId}`;
    } catch (error) {
      throw new Error(
        `Failed to delete event: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  async findFreeTime(
    startDate: string,
    endDate: string,
    durationMinutes: number,
    calendarIds?: string[],
    attendeeEmails?: string[]
  ) {
    try {
      // Build items array for FreeBusy query
      const items: Array<{ id: string }> = [];

      if (calendarIds && calendarIds.length > 0) {
        for (const id of calendarIds) {
          items.push({ id });
        }
      }

      if (attendeeEmails && attendeeEmails.length > 0) {
        for (const email of attendeeEmails) {
          items.push({ id: email });
        }
      }

      // Default to primary calendar if nothing specified
      if (items.length === 0) {
        items.push({ id: this.defaultCalendarId });
      }

      // Query FreeBusy API
      const response = await this.calendar.freebusy.query({
        requestBody: {
          timeMin: startDate,
          timeMax: endDate,
          items,
        },
      });

      const calendars = response.data.calendars || {};
      const warnings: string[] = [];
      const allBusyPeriods: Array<{ start: number; end: number }> = [];

      // Collect busy periods and warnings from each calendar
      for (const [calId, calData] of Object.entries<any>(calendars)) {
        if (calData.errors && calData.errors.length > 0) {
          const reason = calData.errors.map((e: any) => e.reason || e.domain).join(", ");
          warnings.push(`Could not check availability for ${calId} (${reason})`);
          continue;
        }

        if (calData.busy) {
          for (const period of calData.busy) {
            allBusyPeriods.push({
              start: new Date(period.start).getTime(),
              end: new Date(period.end).getTime(),
            });
          }
        }
      }

      // Sort busy periods by start time
      allBusyPeriods.sort((a, b) => a.start - b.start);

      // Convert duration from minutes to milliseconds
      const durationMs = durationMinutes * 60 * 1000;

      // Start from the search period start date
      let currentTime = new Date(startDate).getTime();
      const endTime = new Date(endDate).getTime();

      // Store free time slots
      const freeSlots = [];

      // Find gaps between busy periods
      for (const period of allBusyPeriods) {
        if (period.start - currentTime >= durationMs) {
          freeSlots.push({
            start: new Date(currentTime).toISOString(),
            end: new Date(period.start).toISOString(),
          });
        }
        currentTime = Math.max(currentTime, period.end);
      }

      // Check if there's free time after the last busy period
      if (endTime - currentTime >= durationMs) {
        freeSlots.push({
          start: new Date(currentTime).toISOString(),
          end: new Date(endTime).toISOString(),
        });
      }

      // Format results
      let result = "";

      if (freeSlots.length === 0) {
        result = "No free time slots found that meet the criteria.";
      } else {
        result =
          "Available time slots:\n" +
          freeSlots
            .map(
              (slot) =>
                `${new Date(slot.start).toLocaleString()} - ${new Date(
                  slot.end
                ).toLocaleString()} ` +
                `(${Math.round(
                  (new Date(slot.end).getTime() -
                    new Date(slot.start).getTime()) /
                    (60 * 1000)
                )} minutes)`
            )
            .join("\n");
      }

      if (warnings.length > 0) {
        result += "\n\nWarnings:\n" + warnings.map((w) => `- ${w}`).join("\n");
      }

      return result;
    } catch (error) {
      throw new Error(
        `Failed to find free time: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  async listCalendars() {
    try {
      const res = await this.calendar.calendarList.list();
      return res.data.items.map((cal: any) => ({
        id: cal.id,
        summary: cal.summary,
        primary: !!cal.primary,
      }));
    } catch (error) {
      throw new Error(
        `Failed to list calendars: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }
}
