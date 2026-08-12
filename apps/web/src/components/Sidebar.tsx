import {
  AlertCircleIcon,
  ArrowUpRight01Icon,
  BookmarkCheck02Icon,
  Settings02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  INTENT_IDS,
  intentById,
  type IntentId,
  type TasteProfile,
} from "@lobe/shared";
import { Button } from "@lobe/ui/components/button";
import type { CSSProperties } from "react";

import { intentIcons } from "../icons";
import { Logo } from "./Logo";

export type LibraryFilter = IntentId | "review" | null;

export function Sidebar({
  filter,
  profile,
  onChange,
  onOpenSettings,
}: {
  filter: LibraryFilter;
  profile: TasteProfile | null;
  onChange: (filter: LibraryFilter) => void;
  onOpenSettings: () => void;
}) {
  const reviewCount = profile?.reviewCount ?? 0;

  return (
    <aside className="sidebar">
      <a className="brand" href="/" aria-label="Lobe home">
        <Logo size={30} />
        <span>Lobe</span>
      </a>

      <nav className="side-nav" aria-label="Filter saves">
        <Button
          variant="ghost"
          type="button"
          className={filter === null ? "side-item active" : "side-item"}
          onClick={() => onChange(null)}
        >
          <HugeiconsIcon icon={BookmarkCheck02Icon} size={16} />
          <span>All saves</span>
          <b>{profile?.totalSaves ?? 0}</b>
        </Button>
        <Button
          variant="ghost"
          type="button"
          className={`side-item review-item${filter === "review" ? " active" : ""}${reviewCount > 0 ? " attention" : ""}`}
          onClick={() => onChange("review")}
        >
          <HugeiconsIcon icon={AlertCircleIcon} size={16} />
          <span>Needs review</span>
          <b>{reviewCount}</b>
        </Button>

        <div className="side-label">Why you save</div>
        {INTENT_IDS.map((intent) => {
          const Icon = intentIcons[intent];
          return (
            <Button
              variant="ghost"
              key={intent}
              type="button"
              className={filter === intent ? "side-item active" : "side-item"}
              style={
                { "--item-color": intentById[intent].color } as CSSProperties
              }
              onClick={() => onChange(intent)}
            >
              <HugeiconsIcon icon={Icon} size={16} />
              <span>{intentById[intent].label}</span>
              <b>{profile?.intentCounts[intent] ?? 0}</b>
            </Button>
          );
        })}
      </nav>

      {profile && profile.topTopics.length > 0 && (
        <div className="side-section">
          <div className="side-label">Recurring topics</div>
          <div className="side-topics">
            {profile.topTopics.slice(0, 6).map((topic) => (
              <div key={topic.name}>
                <span>{topic.name}</span>
                <b>{topic.count}</b>
              </div>
            ))}
          </div>
        </div>
      )}

      {profile && profile.topCreators.length > 0 && (
        <div className="side-section">
          <div className="side-label">Saved creators</div>
          <div className="side-creators">
            {profile.topCreators.slice(0, 4).map((creator) => (
              <div key={creator.handle}>
                <span className="creator-initial">
                  {creator.name.charAt(0).toLocaleUpperCase()}
                </span>
                <span className="creator-meta">
                  <strong>{creator.name}</strong>
                  <small>{creator.handle}</small>
                </span>
                <b>{creator.count}</b>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="side-footer">
        <Button asChild variant="ghost" className="side-item">
          <a
            href="https://x.com/home"
            target="_blank"
            rel="noreferrer"
            aria-label="Open X"
          >
            <HugeiconsIcon icon={ArrowUpRight01Icon} size={16} />
            <span>Open X</span>
          </a>
        </Button>
        <Button
          variant="ghost"
          type="button"
          className="side-item"
          aria-label="Open connection settings"
          onClick={onOpenSettings}
        >
          <HugeiconsIcon icon={Settings02Icon} size={16} />
          <span>Connection</span>
        </Button>
      </div>
    </aside>
  );
}
