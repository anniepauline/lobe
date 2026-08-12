import {
  BookOpen01Icon,
  Bookmark02Icon,
  HammerIcon,
  SentIcon,
  ShoppingBag01Icon,
  TestTube01Icon,
} from "@hugeicons/core-free-icons";
import type { IconSvgElement } from "@hugeicons/react";
import type { IntentId } from "@lobe/shared";

export const intentIcons: Record<IntentId, IconSvgElement> = {
  try: TestTube01Icon,
  build: HammerIcon,
  learn: BookOpen01Icon,
  reference: Bookmark02Icon,
  buy: ShoppingBag01Icon,
  share: SentIcon,
};
