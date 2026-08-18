import { describe, expect, it } from "vitest";
import { collapseRecurring, excludeExisting, parseIcs } from "./ics";
import { Entry } from "./types";

function ics(body: string): string {
  return `BEGIN:VCALENDAR\r\nVERSION:2.0\r\n${body}\r\nEND:VCALENDAR\r\n`;
}

function vevent(lines: string[]): string {
  return ["BEGIN:VEVENT", ...lines, "END:VEVENT"].join("\r\n");
}

describe("parseIcs", () => {
  it("parses an all-day event", () => {
    const events = parseIcs(
      ics(vevent(["SUMMARY:Wedding day", "DTSTART;VALUE=DATE:20140607"])),
    );
    expect(events).toEqual([
      {
        summary: "Wedding day",
        date: "2014-06-07",
        description: "",
        location: "",
        occurrences: 1,
      },
    ]);
  });

  it("parses timed events with and without timezone suffix", () => {
    const events = parseIcs(
      ics(
        [
          vevent(["SUMMARY:Flight to Rome", "DTSTART:20190402T091500Z"]),
          vevent([
            "SUMMARY:Graduation",
            "DTSTART;TZID=America/New_York:20120519T140000",
          ]),
        ].join("\r\n"),
      ),
    );
    expect(events.map((e) => e.date)).toEqual(["2019-04-02", "2012-05-19"]);
  });

  it("unfolds continuation lines and unescapes text", () => {
    const events = parseIcs(
      ics(
        vevent([
          "SUMMARY:Dinner with the\r\n  Hendersons\\, finally",
          "DESCRIPTION:Line one\\nLine two",
          "DTSTART:20210101",
        ]),
      ),
    );
    expect(events[0].summary).toBe("Dinner with the Hendersons, finally");
    expect(events[0].description).toBe("Line one\nLine two");
  });

  it("skips events missing a summary or a parseable date", () => {
    const events = parseIcs(
      ics(
        [
          vevent(["DTSTART:20200101"]),
          vevent(["SUMMARY:No date"]),
          vevent(["SUMMARY:Bad date", "DTSTART:tomorrow"]),
          vevent(["SUMMARY:Kept", "DTSTART:20200315"]),
        ].join("\r\n"),
      ),
    );
    expect(events.map((e) => e.summary)).toEqual(["Kept"]);
  });

  it("returns nothing for non-calendar text", () => {
    expect(parseIcs("just some text")).toEqual([]);
  });
});

describe("collapseRecurring", () => {
  it("keeps the earliest occurrence and counts the rest", () => {
    const collapsed = collapseRecurring(
      parseIcs(
        ics(
          [
            vevent(["SUMMARY:Weekly stand-up", "DTSTART:20230110T090000"]),
            vevent(["SUMMARY:Weekly stand-up", "DTSTART:20230103T090000"]),
            vevent(["SUMMARY:Weekly stand-up", "DTSTART:20230117T090000"]),
            vevent(["SUMMARY:House closing", "DTSTART:20230520"]),
          ].join("\r\n"),
        ),
      ),
    );
    expect(collapsed).toHaveLength(2);
    expect(collapsed[0]).toMatchObject({
      summary: "Weekly stand-up",
      date: "2023-01-03",
      occurrences: 3,
    });
    expect(collapsed[1]).toMatchObject({
      summary: "House closing",
      occurrences: 1,
    });
  });

  it("matches summaries case-insensitively but keeps the first casing", () => {
    const collapsed = collapseRecurring(
      parseIcs(
        ics(
          [
            vevent(["SUMMARY:Book club", "DTSTART:20230201"]),
            vevent(["SUMMARY:BOOK CLUB", "DTSTART:20230301"]),
          ].join("\r\n"),
        ),
      ),
    );
    expect(collapsed).toHaveLength(1);
    expect(collapsed[0].summary).toBe("Book club");
    expect(collapsed[0].occurrences).toBe(2);
  });
});

describe("excludeExisting", () => {
  const entry: Entry = {
    id: "1",
    kind: "milestone",
    title: "House closing",
    content: "",
    date: "2023-05-20",
    tags: [],
    createdAt: "2023-05-20T00:00:00.000Z",
  };

  it("drops suggestions already in the archive by date and title", () => {
    const events = parseIcs(
      ics(
        [
          vevent(["SUMMARY:house closing", "DTSTART:20230520"]),
          vevent(["SUMMARY:House closing", "DTSTART:20240101"]),
        ].join("\r\n"),
      ),
    );
    const kept = excludeExisting(events, [entry]);
    expect(kept).toHaveLength(1);
    expect(kept[0].date).toBe("2024-01-01");
  });
});
