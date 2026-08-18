import { describe, expect, it } from "vitest";
import {
  expandLeads,
  gapLeads,
  interviewContext,
  interviewLeads,
  valueLeads,
} from "./leads";
import { Archive, Entry, EMPTY_ARCHIVE } from "../types";

function entry(overrides: Partial<Entry>): Entry {
  return {
    id: Math.random().toString(36).slice(2),
    kind: "story",
    title: "t",
    content: "a substantial memory with plenty of detail ".repeat(6),
    date: "2000-06-01",
    tags: [],
    createdAt: "2020-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function archiveWith(
  entries: Entry[],
  profile?: Partial<Archive["profile"]>,
): Archive {
  return {
    ...structuredClone(EMPTY_ARCHIVE),
    profile: { name: "Andrew", birthYear: null, epitaph: "", ...profile },
    entries,
  };
}

describe("gapLeads", () => {
  it("finds quiet stretches between recorded years", () => {
    const archive = archiveWith([
      entry({ date: "1990-01-01" }),
      entry({ date: "2005-01-01" }),
    ]);
    const leads = gapLeads(archive, 2006);
    expect(leads[0].question).toContain("1990");
    expect(leads[0].question).toContain("2005");
  });

  it("uses birth year as the lower bound when set", () => {
    const archive = archiveWith([entry({ date: "2005-01-01" })], {
      birthYear: 1980,
    });
    const leads = gapLeads(archive, 2006);
    expect(leads[0].question).toContain("1980");
  });

  it("ignores small gaps and empty archives", () => {
    expect(
      gapLeads(archiveWith([entry({ date: "2004-01-01" })]), 2006),
    ).toEqual([]);
    expect(gapLeads(archiveWith([]), 2006)).toEqual([]);
  });
});

describe("valueLeads", () => {
  it("flags values with no story behind them", () => {
    const archive = archiveWith([
      entry({ kind: "value", title: "Show up anyway", content: "Presence beats perfection." }),
    ]);
    const leads = valueLeads(archive);
    expect(leads).toHaveLength(1);
    expect(leads[0].question).toContain("Show up anyway");
  });

  it("skips values that already have a related story", () => {
    const archive = archiveWith([
      entry({ kind: "value", title: "Show up anyway", content: "Presence beats perfection." }),
      entry({
        kind: "story",
        title: "The night I showed up anyway",
        content: "Everyone said skip it, but presence beats perfection and I went and it mattered.",
      }),
    ]);
    expect(valueLeads(archive)).toEqual([]);
  });
});

describe("expandLeads", () => {
  it("targets thin stories, thinnest first", () => {
    const archive = archiveWith([
      entry({ kind: "story", title: "Maine", content: "We drove north." }),
      entry({ kind: "milestone", title: "First job", content: "Bagging groceries at fourteen was hard." }),
      entry({ kind: "story", title: "Full", content: "x".repeat(500) }),
    ]);
    const leads = expandLeads(archive);
    expect(leads.map((l) => l.label)).toEqual([
      "More on “Maine”",
      "More on “First job”",
    ]);
  });
});

describe("interviewLeads", () => {
  it("always ends with the daily question and respects the limit", () => {
    const leads = interviewLeads(archiveWith([]), "2026-07-13", 3);
    expect(leads.length).toBeLessThanOrEqual(3);
    expect(leads[leads.length - 1].kind).toBe("daily");
  });
});

describe("interviewContext", () => {
  it("summarizes the archive and forbids meta-talk", () => {
    const archive = archiveWith([
      entry({ title: "The lake house", date: "1988-08-01" }),
    ]);
    const context = interviewContext(
      archive,
      interviewLeads(archive, "2026-07-13"),
    );
    expect(context).toContain("Andrew");
    expect(context).toContain("The lake house");
    expect(context).toContain("Never mention");
  });
});
