import { intentById, type IntentId } from "@lobe/shared";
import { HugeiconsIcon } from "@hugeicons/react";
import { Badge } from "@lobe/ui/components/badge";
import type { CSSProperties } from "react";

import { intentIcons } from "../icons";

export function IntentBadge({ intent }: { intent: IntentId }) {
  const definition = intentById[intent];
  const Icon = intentIcons[intent];
  return (
    <Badge
      variant="secondary"
      className="intent-badge"
      style={{ "--intent-color": definition.color } as CSSProperties}
    >
      <HugeiconsIcon icon={Icon} size={13} strokeWidth={2} />
      {definition.label}
    </Badge>
  );
}
