import { describe, expect, test } from "bun:test";
import { bundledXRecipe } from "@lobe/shared";
import { Window } from "happy-dom";

import { buildDomSketch, createRecipeFailure } from "./dom-sketch";

describe("privacy-safe DOM sketches", () => {
  test("keeps semantic anchors without post text or handles", async () => {
    const window = new Window({ url: "https://x.com/i/bookmarks" });
    window.document.body.innerHTML = `
      <main>
        <article role="article">
          <p role="VaibhavSecret" data-testid="VaibhavSecret">VaibhavSecret roadmap details</p>
          <a href="/privateHandle/status/2087546799200555424">Private link</a>
          <button aria-label="Bookmark VaibhavSecret"><svg viewBox="0 0 24 24"><path d="M4 4.5C4 3.12 5.119 2 6.5 2h11" /></svg></button>
        </article>
      </main>`;

    const document = window.document as unknown as Document;
    const nodes = buildDomSketch(document);
    const serialized = JSON.stringify(nodes);
    expect(serialized).not.toContain("VaibhavSecret");
    expect(serialized).not.toContain("privateHandle");
    expect(serialized).toContain("/:handle/status/:id");
    expect(serialized).toContain("bookmark");

    const failure = await createRecipeFailure(document, bundledXRecipe);
    expect(failure?.pageKind).toBe("bookmarks");
    expect(failure?.layoutFingerprint).toMatch(/^[a-f0-9]{32}$/);
  });
});
