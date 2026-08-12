import {
  BookOpen,
  Bookmark,
  FlaskConical,
  Hammer,
  Send,
  ShoppingBag,
  type LucideIcon,
} from "lucide-react";
import type { IntentId } from "@lobe/shared";

export const intentIcons: Record<IntentId, LucideIcon> = {
  try: FlaskConical,
  build: Hammer,
  learn: BookOpen,
  reference: Bookmark,
  buy: ShoppingBag,
  share: Send,
};
