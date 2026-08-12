import type { Save } from "@lobe/shared";
import { ArrowUpRight } from "lucide-react";

import type { LobeApi } from "../api";
import { useSaveImage } from "../hooks";
import { IntentBadge } from "./shared";

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
    <button
      className="save-card"
      type="button"
      aria-label={`Open save by ${save.author.name}`}
      onClick={onOpen}
    >
      {imageUrl && (
        <div className="save-media">
          <img src={imageUrl} alt={save.media[0]?.alt ?? "Saved X post"} />
          <span className="media-open" aria-hidden="true">
            <ArrowUpRight size={16} />
          </span>
        </div>
      )}
      <div className="card-body">
        <div className="author-row">
          {save.author.avatarUrl ? (
            <img className="avatar" src={save.author.avatarUrl} alt="" />
          ) : (
            <span className="avatar fallback-avatar">
              {save.author.name.charAt(0).toLocaleUpperCase()}
            </span>
          )}
          <span className="author-name">{save.author.name}</span>
          <span className="handle">{save.author.handle}</span>
          <time>{shortDate(save.createdAt)}</time>
        </div>
        <p className="save-copy">{body}</p>
        <div className="card-meta">
          {save.intent ? (
            <IntentBadge intent={save.intent} />
          ) : (
            <StatusBadge save={save} />
          )}
          <div className="topic-list">
            {save.topics.slice(0, 2).map((topic) => (
              <span key={topic}>#{topic}</span>
            ))}
          </div>
        </div>
      </div>
    </button>
  );
}

function StatusBadge({ save }: { save: Save }) {
  return (
    <span className={`status-badge ${save.status}`}>
      {save.status === "failed" ? "Needs attention" : "Organizing"}
    </span>
  );
}
