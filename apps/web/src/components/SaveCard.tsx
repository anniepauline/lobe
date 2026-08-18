import type { Save } from "@lobe/shared";
import { intentById } from "@lobe/shared";
import { AlertCircleIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@lobe/ui/components/button";
import type { CSSProperties } from "react";

import type { LobeApi } from "../api";
import { useSaveImage } from "../hooks";
import { PostText } from "./PostText";

function shortDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

export function SaveCard({
  save,
  api,
  onOpen,
}: {
  save: Save;
  api: LobeApi;
  onOpen: () => void;
}) {
  const imageUrl = useSaveImage(save, api);
  const body = save.summary ?? save.content;

  return (
    <article className="save-card">
      <Button
        variant="ghost"
        type="button"
        className="save-card-button"
        aria-label={`Open save by ${save.author.name}`}
        onClick={onOpen}
      >
        {imageUrl && (
          <img
            className="save-media"
            src={imageUrl}
            alt={save.media[0]?.alt ?? "Saved X post"}
            loading="lazy"
          />
        )}
        <div className="card-body">
          <div className="card-eyebrow">
            {save.intent ? (
              <span
                className="intent-eyebrow"
                style={
                  {
                    "--intent-color": intentById[save.intent].color,
                  } as CSSProperties
                }
              >
                {intentById[save.intent].label}
              </span>
            ) : save.status === "failed" ? (
              <span className="intent-eyebrow failed">Needs attention</span>
            ) : (
              <span className="intent-eyebrow pending">Organizing</span>
            )}
            {save.needsReview && (
              <span className="review-mark" title="Lobe is unsure">
                <HugeiconsIcon icon={AlertCircleIcon} size={13} />
              </span>
            )}
          </div>
          <p className="save-copy">
            <PostText text={body} interactive={false} />
          </p>
          <div className="author-row">
            {save.author.avatarUrl ? (
              <img className="avatar" src={save.author.avatarUrl} alt="" />
            ) : (
              <span className="avatar fallback-avatar">
                {save.author.name.charAt(0).toLocaleUpperCase()}
              </span>
            )}
            <span className="author-name">{save.author.name}</span>
            <time>{shortDate(save.createdAt)}</time>
          </div>
        </div>
      </Button>
    </article>
  );
}
