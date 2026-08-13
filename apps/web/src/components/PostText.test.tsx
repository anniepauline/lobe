import { describe, expect, test } from "bun:test";

import { tokenizePostText } from "./PostText";

describe("post text links", () => {
  test("links URLs, domains, mentions, hashtags, and email addresses", () => {
    const tokens = tokenizePostText(
      "Read https://example.com/docs, ask hello@example.com or @lobe about #Postgres.",
    );

    expect(tokens.filter((token) => token.kind === "link")).toEqual([
      {
        kind: "link",
        value: "https://example.com/docs",
        href: "https://example.com/docs",
      },
      {
        kind: "link",
        value: "hello@example.com",
        href: "mailto:hello@example.com",
      },
      { kind: "link", value: "@lobe", href: "https://x.com/lobe" },
      {
        kind: "link",
        value: "#Postgres",
        href: "https://x.com/hashtag/Postgres",
      },
    ]);
    expect(tokens.map((token) => token.value).join("")).toBe(
      "Read https://example.com/docs, ask hello@example.com or @lobe about #Postgres.",
    );
  });

  test("keeps balanced URL punctuation inside the link", () => {
    const tokens = tokenizePostText(
      "See https://en.wikipedia.org/wiki/Test_(assessment).",
    );
    expect(tokens.find((token) => token.kind === "link")).toEqual({
      kind: "link",
      value: "https://en.wikipedia.org/wiki/Test_(assessment)",
      href: "https://en.wikipedia.org/wiki/Test_(assessment)",
    });
  });
});
