import { Fragment } from "react";

interface TextToken {
  kind: "text";
  value: string;
}

interface LinkToken {
  kind: "link";
  value: string;
  href: string;
}

export type PostTextToken = TextToken | LinkToken;

const LINK_PATTERN =
  /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,63}|(?:https?:\/\/|www\.)[^\s<]+|(?:[A-Z0-9](?:[A-Z0-9-]*[A-Z0-9])?\.)+[A-Z]{2,63}(?::\d{2,5})?(?:\/[^\s<]*)?|@[A-Z0-9_]{1,15}|#[\p{L}\p{N}_]+/giu;

function trimTrailingPunctuation(value: string): string {
  let end = value.length;
  while (end > 0 && /[.,!?;:]/.test(value[end - 1] ?? "")) {
    end -= 1;
  }

  for (const [opening, closing] of [
    ["(", ")"],
    ["[", "]"],
    ["{", "}"],
  ] as const) {
    while (
      value.slice(0, end).endsWith(closing) &&
      value.slice(0, end).split(closing).length >
        value.slice(0, end).split(opening).length
    ) {
      end -= 1;
    }
  }

  return value.slice(0, end);
}

function linkTarget(value: string): string {
  if (value.startsWith("@")) {
    return `https://x.com/${value.slice(1)}`;
  }
  if (value.startsWith("#")) {
    return `https://x.com/hashtag/${encodeURIComponent(value.slice(1))}`;
  }
  if (/^[^@\s]+@[^@\s]+$/.test(value)) {
    return `mailto:${value}`;
  }
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
}

export function tokenizePostText(text: string): PostTextToken[] {
  const tokens: PostTextToken[] = [];
  let cursor = 0;

  for (const match of text.matchAll(LINK_PATTERN)) {
    const index = match.index;
    const rawValue = match[0];
    const value = trimTrailingPunctuation(rawValue);
    if (index > cursor) {
      tokens.push({ kind: "text", value: text.slice(cursor, index) });
    }
    tokens.push({ kind: "link", value, href: linkTarget(value) });
    cursor = index + value.length;
  }

  if (cursor < text.length) {
    tokens.push({ kind: "text", value: text.slice(cursor) });
  }

  return tokens;
}

export function PostText({
  text,
  interactive = true,
}: {
  text: string;
  interactive?: boolean;
}) {
  return tokenizePostText(text).map((token, index) =>
    token.kind === "text" ? (
      <Fragment key={index}>{token.value}</Fragment>
    ) : interactive ? (
      <a
        className="post-link"
        href={token.href}
        target="_blank"
        rel="noreferrer"
        key={index}
      >
        {token.value}
      </a>
    ) : (
      <span className="post-link" key={index}>
        {token.value}
      </span>
    ),
  );
}
