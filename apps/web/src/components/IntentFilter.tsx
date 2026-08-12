import {
  INTENT_IDS,
  intentById,
  type IntentId,
  type TasteProfile,
} from "@lobe/shared";
import { AlertCircleIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Tabs, TabsList, TabsTrigger } from "@lobe/ui/components/tabs";

import { intentIcons } from "../icons";

export type LibraryFilter = IntentId | "review" | null;

export function IntentFilter({
  active,
  profile,
  onChange,
}: {
  active: LibraryFilter;
  profile: TasteProfile | null;
  onChange: (filter: LibraryFilter) => void;
}) {
  const value = active ?? "all";

  return (
    <Tabs
      className="intent-tabs"
      value={value}
      onValueChange={(next) =>
        onChange(next === "all" ? null : (next as LibraryFilter))
      }
    >
      <TabsList
        variant="line"
        className="intent-filter"
        aria-label="Filter by intent"
      >
        <TabsTrigger value="all" className={active === null ? "active" : ""}>
          All
          <span>{profile?.totalSaves ?? 0}</span>
        </TabsTrigger>
        <TabsTrigger
          value="review"
          className={
            active === "review" ? "active review-filter" : "review-filter"
          }
        >
          <HugeiconsIcon icon={AlertCircleIcon} size={15} />
          Needs review
          <span>{profile?.reviewCount ?? 0}</span>
        </TabsTrigger>
        {INTENT_IDS.map((intent) => {
          const Icon = intentIcons[intent];
          return (
            <TabsTrigger
              key={intent}
              value={intent}
              className={active === intent ? "active" : ""}
            >
              <HugeiconsIcon icon={Icon} size={15} />
              {intentById[intent].label}
              <span>{profile?.intentCounts[intent] ?? 0}</span>
            </TabsTrigger>
          );
        })}
      </TabsList>
    </Tabs>
  );
}
