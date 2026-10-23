import { describe, it, expect } from "bun:test";
import GoogleCalendar from "../utils/calendar";
import GoogleDrive from "../utils/drive";
import GoogleGmail, { normalizeGmailQuery } from "../utils/gmail";

/**
 * Unit tests for issues #1-#3. Each API client is swapped for a stub that
 * records its params, so these run without Google credentials.
 */

function stub(response: any) {
  const calls: any[] = [];
  const fn = async (params: any) => {
    calls.push(params);
    return { data: response };
  };
  return { fn, calls };
}

describe("calendar getEvents (#1)", () => {
  const event = (n: number) => ({
    id: `e${n}`,
    summary: `Event ${n}`,
    start: { dateTime: `2026-11-0${n}T10:00:00Z` },
    end: { dateTime: `2026-11-0${n}T11:00:00Z` },
  });

  it("defaults to 50 results", async () => {
    const cal = new GoogleCalendar(null);
    const list = stub({ items: [event(1)] });
    (cal as any).calendar = { events: { list: list.fn } };
    await cal.getEvents();
    expect(list.calls[0].maxResults).toBe(50);
  });

  it("says when more events exist than were returned", async () => {
    // The original bug: a capped list read as complete, so an event past the
    // cap was reported as not on the calendar.
    const cal = new GoogleCalendar(null);
    const list = stub({ items: [event(1), event(2)], nextPageToken: "tok" });
    (cal as any).calendar = { events: { list: list.fn } };
    const out = await cal.getEvents(2);
    expect(out).toContain("Showing 2 events; more exist");
  });

  it("adds no notice when the list is complete", async () => {
    const cal = new GoogleCalendar(null);
    const list = stub({ items: [event(1)] });
    (cal as any).calendar = { events: { list: list.fn } };
    expect(await cal.getEvents()).not.toContain("more exist");
  });
});

describe("drive listFiles (#2)", () => {
  const file = {
    id: "f1",
    name: "Plan",
    mimeType: "application/vnd.google-apps.document",
    modifiedTime: "2026-10-01T00:00:00Z",
    driveId: "0Aabc",
  };

  it("searches all drives, including shared drives", async () => {
    const drive = new GoogleDrive(null);
    const list = stub({ files: [file] });
    (drive as any).drive = { files: { list: list.fn } };
    const out = await drive.listFiles("name contains 'Plan'");
    const p = list.calls[0];
    expect(p.supportsAllDrives).toBe(true);
    expect(p.includeItemsFromAllDrives).toBe(true);
    expect(p.corpora).toBe("allDrives");
    expect(p.fields).toContain("driveId");
    expect(out).toContain("Shared drive: 0Aabc");
  });

  it("keeps the paging fields when the caller passes its own fields", async () => {
    const drive = new GoogleDrive(null);
    const list = stub({ files: [file], nextPageToken: "tok" });
    (drive as any).drive = { files: { list: list.fn } };
    const out = await drive.listFiles(undefined, 10, undefined, "files(id, name)");
    expect(list.calls[0].fields).toBe(
      "nextPageToken, incompleteSearch, files(id, name)"
    );
    expect(out).toContain("more exist");
  });

  it("does not repeat paging fields the caller already asked for", async () => {
    const drive = new GoogleDrive(null);
    const list = stub({ files: [file] });
    (drive as any).drive = { files: { list: list.fn } };
    await drive.listFiles(undefined, 10, undefined, "nextPageToken, files(id)");
    expect(list.calls[0].fields).toBe("incompleteSearch, nextPageToken, files(id)");
  });

  it("scopes to one shared drive when driveId is given", async () => {
    const drive = new GoogleDrive(null);
    const list = stub({ files: [file] });
    (drive as any).drive = { files: { list: list.fn } };
    await drive.listFiles(undefined, 10, undefined, undefined, "0Aabc");
    expect(list.calls[0].corpora).toBe("drive");
    expect(list.calls[0].driveId).toBe("0Aabc");
  });

  it("says when more files exist than pageSize", async () => {
    const drive = new GoogleDrive(null);
    const list = stub({ files: [file], nextPageToken: "tok" });
    (drive as any).drive = { files: { list: list.fn } };
    expect(await drive.listFiles()).toContain("Showing 1 files; more exist");
  });

  it("includes the query in the error", async () => {
    const drive = new GoogleDrive(null);
    (drive as any).drive = {
      files: {
        list: async () => {
          throw new Error("Invalid Value");
        },
      },
    };
    await expect(drive.listFiles("modifiedTime &gt; 2026-07-10")).rejects.toThrow(
      "Invalid Value (q: modifiedTime &gt; 2026-07-10)"
    );
  });

  it("opens shared-drive files", async () => {
    const drive = new GoogleDrive(null);
    const get = stub({ name: "a.txt", mimeType: "text/plain" });
    (drive as any).drive = { files: { get: get.fn } };
    await drive.getFileContent("f1");
    for (const call of get.calls) expect(call.supportsAllDrives).toBe(true);
  });
});

describe("normalizeGmailQuery (#3)", () => {
  it("pulls the limit out of the query", () => {
    expect(normalizeGmailQuery("is:unread maxResults=5")).toEqual({
      query: "is:unread",
      maxResults: 5,
      rewritten: true,
    });
  });

  it("accepts the colon form and any case", () => {
    const r = normalizeGmailQuery("from:paul MAXRESULTS: 20 subject:x");
    expect(r.query).toBe("from:paul subject:x");
    expect(r.maxResults).toBe(20);
  });

  it("maps since:/until: to after:/before:", () => {
    expect(
      normalizeGmailQuery("subject:Flint since:2026-08-01 until:2026-11-01").query
    ).toBe("subject:Flint after:2026/08/01 before:2026/11/01");
  });

  it("only maps since:/until: at the start of a term", () => {
    // `\b` also matches after a colon, which corrupted label names.
    expect(normalizeGmailQuery("label:until:foo subject:since:x").query).toBe(
      "label:until:foo subject:since:x"
    );
    expect(normalizeGmailQuery("-since:2026/01/01 (until:2026/02/01)").query).toBe(
      "-after:2026/01/01 (before:2026/02/01)"
    );
  });

  it("rewrites ISO dates to the documented YYYY/MM/DD form", () => {
    expect(normalizeGmailQuery("after:2026-08-01 before:2026-11-01").query).toBe(
      "after:2026/08/01 before:2026/11/01"
    );
  });

  it("leaves quoted phrases untouched", () => {
    const r = normalizeGmailQuery('"since: yesterday"');
    expect(r.query).toBe('"since: yesterday"');
    expect(r.rewritten).toBe(false);
  });

  it("drops a query that held only the limit", () => {
    expect(normalizeGmailQuery("maxResults=30").query).toBeUndefined();
  });

  it("leaves a valid query alone", () => {
    const r = normalizeGmailQuery("from:alice after:2026/08/01");
    expect(r.query).toBe("from:alice after:2026/08/01");
    expect(r.maxResults).toBeUndefined();
    expect(r.rewritten).toBe(false);
  });
});

describe("gmail listEmails (#3)", () => {
  function gmailWith(response: any) {
    const gmail = new GoogleGmail(null);
    const list = stub(response);
    (gmail as any).gmail = { users: { messages: { list: list.fn } } };
    return { gmail, list };
  }

  it("uses the limit found in the query when maxResults is unset", async () => {
    const { gmail, list } = gmailWith({});
    await gmail.listEmails(undefined, undefined, "is:unread maxResults=5");
    expect(list.calls[0].q).toBe("is:unread");
    expect(list.calls[0].maxResults).toBe(5);
  });

  it("lets an explicit maxResults win over one in the query", async () => {
    const { gmail, list } = gmailWith({});
    await gmail.listEmails(undefined, 3, "from:paul maxResults:20");
    expect(list.calls[0].q).toBe("from:paul");
    expect(list.calls[0].maxResults).toBe(3);
  });

  it("defaults to 50", async () => {
    const { gmail, list } = gmailWith({});
    await gmail.listEmails(undefined, undefined, "is:unread");
    expect(list.calls[0].maxResults).toBe(50);
  });

  it("shows the rewritten query when nothing matched", async () => {
    const { gmail } = gmailWith({});
    expect(
      await gmail.listEmails(undefined, undefined, "from:x since:2026-08-01")
    ).toBe("No messages found. (Searched for: from:x after:2026/08/01)");
  });

  it("says when more emails exist than were returned", async () => {
    const gmail = new GoogleGmail(null);
    (gmail as any).gmail = {
      users: {
        messages: {
          list: async () => ({
            data: { messages: [{ id: "m1" }], nextPageToken: "tok" },
          }),
          get: async () => ({
            data: {
              snippet: "hi",
              payload: { headers: [{ name: "Subject", value: "Hello" }] },
            },
          }),
        },
      },
    };
    expect(await gmail.listEmails(undefined, 1)).toContain(
      "Showing 1 emails; more exist"
    );
  });
});

describe("gmail bulk listing", () => {
  // A stub whose messages.get resolves after a delay, tracking how many
  // requests are in flight at once.
  function gmailWithMessages(count: number, nextPageToken?: string) {
    const gmail = new GoogleGmail(null);
    const listCalls: any[] = [];
    const state = { inFlight: 0, peak: 0 };
    (gmail as any).gmail = {
      users: {
        messages: {
          list: async (params: any) => {
            listCalls.push(params);
            return {
              data: {
                messages: Array.from({ length: count }, (_, i) => ({ id: `m${i}` })),
                nextPageToken,
                resultSizeEstimate: count + (nextPageToken ? 10 : 0),
              },
            };
          },
          get: async ({ id }: any) => {
            state.inFlight++;
            state.peak = Math.max(state.peak, state.inFlight);
            // Later ids resolve first, so order only survives if it is kept.
            await new Promise((r) => setTimeout(r, 50 - Number(id.slice(1))));
            state.inFlight--;
            return {
              data: {
                snippet: "",
                payload: { headers: [{ name: "Subject", value: `S-${id}` }] },
              },
            };
          },
        },
      },
    };
    return { gmail, listCalls, state };
  }

  it("fetches details in parallel, at most 10 at a time, in order", async () => {
    const { gmail, state } = gmailWithMessages(50);
    const out = await gmail.listEmails(undefined, 50);
    expect(state.peak).toBe(10);
    const subjects = [...out.matchAll(/Subject: (S-m\d+)/g)].map((m) => m[1]);
    expect(subjects).toEqual(Array.from({ length: 50 }, (_, i) => `S-m${i}`));
  });

  it("list_unread_emails defaults to 50", async () => {
    const { gmail, listCalls } = gmailWithMessages(1);
    await gmail.listUnreadEmails();
    expect(listCalls[0].maxResults).toBe(50);
  });

  it("list_unread_emails says when more exist", async () => {
    const { gmail } = gmailWithMessages(2, "tok");
    const out = await gmail.listUnreadEmails(2);
    expect(out).toContain("Showing 2 unread email(s) (estimated 12 total unread)");
    expect(out).toContain("More unread emails exist beyond this set");
  });
});
