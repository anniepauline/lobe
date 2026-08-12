import {
  INTENT_IDS,
  intentById,
  type IntentId,
  type TasteProfile,
} from "@lobe/shared";

import { intentIcons } from "../icons";

export function IntentFilter({
  active,
  profile,
  onChange,
}: {
  active: IntentId | null;
  profile: TasteProfile | null;
  onChange: (intent: IntentId | null) => void;
}) {
  return (
    <div className="intent-filter" role="tablist" aria-label="Filter by intent">
      <button
        className={active === null ? "active" : ""}
        type="button"
        role="tab"
        aria-selected={active === null}
        onClick={() => onChange(null)}
      >
        All
        <span>{profile?.totalSaves ?? 0}</span>
      </button>
      {INTENT_IDS.map((intent) => {
        const Icon = intentIcons[intent];
        return (
          <button
            key={intent}
            className={active === intent ? "active" : ""}
            type="button"
            role="tab"
            aria-selected={active === intent}
            onClick={() => onChange(intent)}
          >
            <Icon size={15} />
            {intentById[intent].label}
            <span>{profile?.intentCounts[intent] ?? 0}</span>
          </button>
        );
      })}
    </div>
  );
}
