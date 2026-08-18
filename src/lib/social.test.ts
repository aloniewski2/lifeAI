import { describe, expect, it } from "vitest";
import {
  dedupePosts,
  excludeExistingPosts,
  fixMetaMojibake,
  parseSocialFile,
  postTitle,
  sortPosts,
  SocialPost,
} from "./social";
import { Entry } from "./types";

/** 2019-04-02 in epoch seconds. */
const APRIL_2019 = 1554163200;

function post(overrides: Partial<SocialPost> = {}): SocialPost {
  return { source: "x", date: "2020-01-01", text: "a post", ...overrides };
}

describe("parseSocialFile — Instagram", () => {
  it("reads captions and timestamps from posts and their media", () => {
    const posts = parseSocialFile(
      "posts_1.json",
      JSON.stringify([
        {
          title: "Sunrise over the lake",
          creation_timestamp: APRIL_2019,
          media: [{ uri: "media/1.jpg" }],
        },
        {
          media: [
            { uri: "media/2.jpg", title: "Nana's kitchen", creation_timestamp: APRIL_2019 },
          ],
        },
      ]),
    );
    expect(posts).toEqual([
      { source: "instagram", date: "2019-04-02", text: "Sunrise over the lake" },
      { source: "instagram", date: "2019-04-02", text: "Nana's kitchen" },
    ]);
  });

  it("skips posts with no caption or no timestamp", () => {
    const posts = parseSocialFile(
      "posts_1.json",
      JSON.stringify([
        { creation_timestamp: APRIL_2019, media: [{ uri: "media/1.jpg" }] },
        { title: "No date here", media: [] },
      ]),
    );
    expect(posts).toEqual([]);
  });
});

describe("parseSocialFile — Facebook", () => {
  it("reads post text out of the data array", () => {
    const posts = parseSocialFile(
      "your_posts_1.json",
      JSON.stringify([
        {
          timestamp: APRIL_2019,
          data: [{ post: "Twenty-two years of the bakery today." }],
          title: "Ruth updated her status.",
        },
      ]),
    );
    expect(posts).toEqual([
      {
        source: "facebook",
        date: "2019-04-02",
        text: "Twenty-two years of the bakery today.",
      },
    ]);
  });

  it("accepts the status_updates wrapper", () => {
    const posts = parseSocialFile(
      "your_posts_1.json",
      JSON.stringify({
        status_updates: [
          { timestamp: APRIL_2019, data: [{ post: "Wrapped shape" }] },
        ],
      }),
    );
    expect(posts.map((p) => p.text)).toEqual(["Wrapped shape"]);
  });
});

describe("parseSocialFile — X/Twitter", () => {
  it("strips the window.YTD assignment and keeps full_text", () => {
    const posts = parseSocialFile(
      "tweets.js",
      `window.YTD.tweets.part0 = ${JSON.stringify([
        {
          tweet: {
            created_at: "Wed Apr 02 20:19:24 +0000 2019",
            full_text: "The shop opened at five and nobody came until seven.",
          },
        },
      ])}`,
    );
    expect(posts).toEqual([
      {
        source: "x",
        date: "2019-04-02",
        text: "The shop opened at five and nobody came until seven.",
      },
    ]);
  });

  it("drops retweets — they are someone else's words", () => {
    const posts = parseSocialFile(
      "tweets.js",
      `window.YTD.tweets.part0 = ${JSON.stringify([
        {
          tweet: {
            created_at: "Wed Apr 02 20:19:24 +0000 2019",
            full_text: "RT @someone: not my words",
          },
        },
      ])}`,
    );
    expect(posts).toEqual([]);
  });
});

describe("parseSocialFile — bad input", () => {
  it("returns nothing for unparseable or unrecognised files", () => {
    expect(parseSocialFile("posts_1.json", "{not json")).toEqual([]);
    expect(parseSocialFile("readme.txt", "")).toEqual([]);
    expect(parseSocialFile("other.json", JSON.stringify({ hello: 1 }))).toEqual(
      [],
    );
  });
});

describe("fixMetaMojibake", () => {
  it("repairs latin-1-escaped UTF-8", () => {
    expect(fixMetaMojibake("cafÃ©")).toBe("café");
  });

  it("leaves clean text alone", () => {
    expect(fixMetaMojibake("café")).toBe("café");
    expect(fixMetaMojibake("plain")).toBe("plain");
  });
});

describe("sortPosts / dedupePosts / excludeExistingPosts", () => {
  it("sorts newest first", () => {
    const sorted = sortPosts([
      post({ date: "2019-01-01", text: "old" }),
      post({ date: "2021-01-01", text: "new" }),
    ]);
    expect(sorted.map((p) => p.text)).toEqual(["new", "old"]);
  });

  it("collapses identical posts on the same day", () => {
    const deduped = dedupePosts([
      post({ source: "facebook", text: "Same words" }),
      post({ source: "instagram", text: "same words" }),
      post({ text: "Different" }),
    ]);
    expect(deduped).toHaveLength(2);
    expect(deduped[0].source).toBe("facebook");
  });

  it("drops posts already recorded in the archive", () => {
    const entry: Entry = {
      id: "1",
      kind: "journal",
      title: "Already here",
      content: "Same words",
      date: "2020-01-01",
      tags: [],
      createdAt: "2020-01-01T00:00:00.000Z",
    };
    const kept = excludeExistingPosts(
      [post({ text: "Same words" }), post({ text: "Fresh" })],
      [entry],
    );
    expect(kept.map((p) => p.text)).toEqual(["Fresh"]);
  });
});

describe("postTitle", () => {
  it("uses the first non-empty line when it is short", () => {
    expect(postTitle(post({ text: "\nShort line\nmore below" }))).toBe(
      "Short line",
    );
  });

  it("truncates long lines on a word boundary", () => {
    const title = postTitle(
      post({
        text: "This is a very long opening line that keeps going well past the limit we allow",
      }),
      40,
    );
    expect(title.endsWith("…")).toBe(true);
    expect(title.length).toBeLessThanOrEqual(41);
    expect(title).not.toContain("  ");
  });
});
