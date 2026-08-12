import { describe, expect, test } from "bun:test";
import { bundledXRecipe } from "@lobe/shared";
import { Window } from "happy-dom";

import { extractPost } from "./extract";

describe("X post extraction", () => {
  test("extracts the outer post and ignores a quoted post", () => {
    const window = new Window({ url: "https://x.com/home" });
    window.document.body.innerHTML = `
      <article data-testid="tweet">
        <div data-testid="User-Name"><a href="/BenjDicken"><span>Ben Dicken</span></a><span>@BenjDicken</span></div>
        <div data-testid="Tweet-User-Avatar"><img src="https://pbs.twimg.com/profile_images/ben.jpg" /></div>
        <a href="/BenjDicken/status/2087546799200555424"><time datetime="2026-02-02T12:00:00.000Z"></time></a>
        <div data-testid="tweetText">Rewriting Postgres in Rust: complete.</div>
        <div data-testid="tweetPhoto"><img src="https://pbs.twimg.com/media/example.jpg" alt="Rust source code" /></div>
        <article data-testid="tweet">
          <div data-testid="tweetText">Quoted content should not replace the post.</div>
          <a href="/other/status/999"><time datetime="2026-02-01T12:00:00.000Z"></time></a>
        </article>
        <button data-testid="bookmark"></button>
      </article>`;

    const post = window.document.querySelector(
      'article[data-testid="tweet"]',
    ) as unknown as HTMLElement | null;
    expect(post).not.toBeNull();
    const capture = extractPost(post!, bundledXRecipe, window.location.href);

    expect(capture?.sourceId).toBe("2087546799200555424");
    expect(capture?.canonicalUrl).toBe(
      "https://x.com/BenjDicken/status/2087546799200555424",
    );
    expect(capture?.content).toBe("Rewriting Postgres in Rust: complete.");
    expect(capture?.author).toEqual({
      name: "Ben Dicken",
      handle: "@BenjDicken",
      avatarUrl: "https://pbs.twimg.com/profile_images/ben.jpg",
    });
    expect(capture?.media).toEqual([
      {
        type: "image",
        url: "https://pbs.twimg.com/media/example.jpg",
        alt: "Rust source code",
      },
    ]);
  });

  test("keeps media-only posts saveable", () => {
    const window = new Window({ url: "https://x.com/user/status/123" });
    window.document.body.innerHTML = `
      <article data-testid="tweet">
        <div data-testid="User-Name"><a href="/user">Creator</a></div>
        <a href="/user/status/123"><time datetime="2026-08-12T12:00:00.000Z"></time></a>
        <div data-testid="tweetPhoto"><img src="https://pbs.twimg.com/media/photo.jpg" alt="A product sketch" /></div>
      </article>`;
    const post = window.document.querySelector(
      "article",
    ) as unknown as HTMLElement;

    expect(
      extractPost(post, bundledXRecipe, window.location.href)?.content,
    ).toBe("A product sketch");
  });
});
