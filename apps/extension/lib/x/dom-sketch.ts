import type {
  CompactDomNode,
  RecipeFailureRequest,
  SelectorRecipe,
} from "@lobe/shared";

const ACTION_LABEL =
  /\b(bookmark(?:ed)?|like(?:d)?|reply|repost(?:ed)?|share|views?|more)\b/i;

function semanticAriaLabel(value: string | null): string | null {
  const match = value?.match(ACTION_LABEL);
  return match?.[1]?.toLocaleLowerCase() ?? null;
}

function hrefShape(element: Element): string | null {
  const value = element.getAttribute("href");
  if (!value) {
    return null;
  }

  try {
    const segments = new URL(
      value,
      element.ownerDocument.location.href,
    ).pathname
      .split("/")
      .filter(Boolean)
      .slice(0, 5)
      .map((segment, index, all) => {
        if (/^\d+$/.test(segment)) {
          return ":id";
        }
        if (all[index + 1] === "status" || index === 0) {
          return ":handle";
        }
        return segment.replace(/[^a-z-]/gi, "").slice(0, 24) || ":value";
      });
    return `/${segments.join("/")}`;
  } catch {
    return null;
  }
}

function nodeSegment(element: Element): string {
  const tag = element.tagName.toLocaleLowerCase();
  const testId = element.getAttribute("data-testid");
  if (testId) {
    return `${tag}[data-testid="${testId.slice(0, 60)}"]`;
  }

  const role = element.getAttribute("role");
  if (role) {
    return `${tag}[role="${role.slice(0, 40)}"]`;
  }

  const parent = element.parentElement;
  if (!parent) {
    return tag;
  }
  const peers = [...parent.children].filter(
    (child) => child.tagName === element.tagName,
  );
  return peers.length > 1
    ? `${tag}:nth-of-type(${peers.indexOf(element) + 1})`
    : tag;
}

function semanticPath(element: Element): string {
  const segments: string[] = [];
  let current: Element | null = element;

  while (current && segments.length < 5) {
    segments.unshift(nodeSegment(current));
    if (current.matches("main, article")) {
      break;
    }
    current = current.parentElement;
  }

  return segments.join(" > ").slice(0, 240);
}

export function buildDomSketch(document: Document): CompactDomNode[] {
  const root = document.querySelector("main") ?? document.body;
  if (!root) {
    return [];
  }

  const candidates = root.querySelectorAll(
    'article, button, [role="button"], a[href], svg, path',
  );
  return [...candidates].slice(0, 80).map((element) => {
    const svg = element.matches("svg") ? element : element.closest("svg");
    const path = element.matches("path")
      ? element
      : element.querySelector("path");

    return {
      path: semanticPath(element),
      tag: element.tagName.toLocaleLowerCase(),
      role: element.getAttribute("role")?.slice(0, 80) ?? null,
      testId: element.getAttribute("data-testid")?.slice(0, 120) ?? null,
      ariaLabel: semanticAriaLabel(element.getAttribute("aria-label")),
      hrefShape: hrefShape(element),
      svgViewBox: svg?.getAttribute("viewBox")?.slice(0, 80) ?? null,
      svgPathPrefix: path?.getAttribute("d")?.slice(0, 160) ?? null,
    };
  });
}

async function fingerprint(nodes: CompactDomNode[]): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(nodes));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)]
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 32);
}

function pageKind(pathname: string): RecipeFailureRequest["pageKind"] {
  if (pathname === "/home") return "home";
  if (pathname === "/i/bookmarks") return "bookmarks";
  if (pathname.includes("/status/")) return "status";
  if (pathname.startsWith("/search")) return "search";
  return "other";
}

export async function createRecipeFailure(
  document: Document,
  recipe: SelectorRecipe,
): Promise<RecipeFailureRequest | null> {
  const nodes = buildDomSketch(document);
  if (nodes.length === 0) {
    return null;
  }

  return {
    platform: "x",
    currentRecipeVersion: recipe.version,
    pageKind: pageKind(document.location.pathname),
    layoutFingerprint: await fingerprint(nodes),
    nodes,
    observedAt: new Date().toISOString(),
  };
}
