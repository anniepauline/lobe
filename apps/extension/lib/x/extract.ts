import {
  capturedPostSchema,
  type CapturedPost,
  type MediaItem,
  type Screenshot,
  type SelectorRecipe,
} from "@lobe/shared";

function cleanText(value: string | null | undefined): string {
  return value?.replace(/\s+/g, " ").trim() ?? "";
}

function belongsToPost(element: Element, post: Element, postSelector: string) {
  return element.closest(postSelector) === post;
}

function firstInsidePost<T extends Element>(
  post: Element,
  selector: string,
  postSelector: string,
): T | null {
  return (
    [...post.querySelectorAll<T>(selector)].find((element) =>
      belongsToPost(element, post, postSelector),
    ) ?? null
  );
}

function absoluteHttpUrl(value: string, baseUrl: string): string | null {
  try {
    const url = new URL(value, baseUrl);
    return url.protocol === "http:" || url.protocol === "https:"
      ? url.href
      : null;
  } catch {
    return null;
  }
}

function findStatusLink(
  post: HTMLElement,
  recipe: SelectorRecipe,
): HTMLAnchorElement | null {
  const time = firstInsidePost<HTMLTimeElement>(
    post,
    "time",
    recipe.selectors.post,
  );
  const timedLink = time?.closest<HTMLAnchorElement>('a[href*="/status/"]');
  if (timedLink && belongsToPost(timedLink, post, recipe.selectors.post)) {
    return timedLink;
  }

  return firstInsidePost<HTMLAnchorElement>(
    post,
    recipe.selectors.statusLink,
    recipe.selectors.post,
  );
}

function collectMedia(
  post: HTMLElement,
  recipe: SelectorRecipe,
  pageUrl: string,
): MediaItem[] {
  const media: MediaItem[] = [];
  const seen = new Set<string>();

  for (const element of post.querySelectorAll<
    HTMLImageElement | HTMLVideoElement
  >(recipe.selectors.media)) {
    if (!belongsToPost(element, post, recipe.selectors.post)) {
      continue;
    }

    const isVideo = element.tagName === "VIDEO";
    const video = isVideo ? (element as HTMLVideoElement) : null;
    const rawUrl = video
      ? video.currentSrc || video.src || video.poster
      : element.currentSrc || element.src;
    const url = absoluteHttpUrl(rawUrl, pageUrl);
    if (!url || seen.has(url)) {
      continue;
    }

    seen.add(url);
    media.push({
      type: isVideo ? "video" : "image",
      url,
      alt: cleanText(element.getAttribute("alt")) || null,
    });
  }

  return media.slice(0, 12);
}

function findAuthorName(
  userName: Element | null,
  handleWithoutAt: string,
): string {
  if (!userName) {
    return handleWithoutAt;
  }

  const profileLink = [
    ...userName.querySelectorAll<HTMLAnchorElement>("a[href]"),
  ].find((link) => {
    try {
      return (
        new URL(link.href).pathname.toLocaleLowerCase() ===
        `/${handleWithoutAt.toLocaleLowerCase()}`
      );
    } catch {
      return false;
    }
  });
  const linkedName = cleanText(profileLink?.textContent);
  if (linkedName && !linkedName.startsWith("@")) {
    return linkedName;
  }

  return (
    [...userName.querySelectorAll("span")]
      .map((span) => cleanText(span.textContent))
      .find(
        (text) =>
          text &&
          !text.startsWith("@") &&
          text !== "·" &&
          !/^\d+[smhd]$/.test(text),
      ) ?? handleWithoutAt
  );
}

export function findCanonicalUrl(
  post: HTMLElement,
  recipe: SelectorRecipe,
  pageUrl: string,
): { canonicalUrl: string; sourceId: string; handle: string } | null {
  const statusLink = findStatusLink(post, recipe);
  if (!statusLink) {
    return null;
  }

  const absolute = new URL(statusLink.getAttribute("href") ?? "", pageUrl);
  const match = /^\/([^/]+)\/status\/(\d+)/.exec(absolute.pathname);
  if (!match?.[1] || !match[2]) {
    return null;
  }

  return {
    canonicalUrl: `https://x.com/${match[1]}/status/${match[2]}`,
    sourceId: match[2],
    handle: `@${match[1]}`,
  };
}

export function extractPost(
  post: HTMLElement,
  recipe: SelectorRecipe,
  pageUrl: string,
  screenshot: Screenshot | null = null,
): CapturedPost | null {
  const identity = findCanonicalUrl(post, recipe, pageUrl);
  if (!identity) {
    return null;
  }

  const userName = firstInsidePost<HTMLElement>(
    post,
    recipe.selectors.userName,
    recipe.selectors.post,
  );
  const handleWithoutAt = identity.handle.slice(1);
  const media = collectMedia(post, recipe, pageUrl);
  const contentElement = firstInsidePost<HTMLElement>(
    post,
    recipe.selectors.content,
    recipe.selectors.post,
  );
  const content =
    cleanText(contentElement?.textContent) ||
    media
      .map((item) => item.alt)
      .filter(Boolean)
      .join(" ") ||
    `Post by ${identity.handle}`;
  const avatar = firstInsidePost<HTMLImageElement>(
    post,
    '[data-testid="Tweet-User-Avatar"] img',
    recipe.selectors.post,
  );
  const avatarUrl = avatar
    ? absoluteHttpUrl(avatar.currentSrc || avatar.src, pageUrl)
    : null;
  const time = firstInsidePost<HTMLTimeElement>(
    post,
    "time",
    recipe.selectors.post,
  );
  const publishedAt = time?.dateTime
    ? new Date(time.dateTime).toISOString()
    : null;

  return capturedPostSchema.parse({
    platform: "x",
    sourceId: identity.sourceId,
    canonicalUrl: identity.canonicalUrl,
    pageUrl,
    content,
    author: {
      name: findAuthorName(userName, handleWithoutAt),
      handle: identity.handle,
      avatarUrl,
    },
    publishedAt,
    media,
    screenshot,
    capturedAt: new Date().toISOString(),
    recipeVersion: recipe.version,
    layoutFingerprint: recipe.layoutFingerprint,
  });
}
