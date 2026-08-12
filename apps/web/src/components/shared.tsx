import { intentById, type IntentId } from "@lobe/shared";
import type { CSSProperties } from "react";

import { intentIcons } from "../icons";

export function IntentBadge({ intent }: { intent: IntentId }) {
  const definition = intentById[intent];
  const Icon = intentIcons[intent];
  return (
    <span
      className="intent-badge"
      style={{ "--intent-color": definition.color } as CSSProperties}
    >
      <Icon size={13} strokeWidth={2.2} />
      {definition.label}
    </span>
  );
}
