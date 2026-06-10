import * as LIcons from "lucide-react";
import type { LucideIcon } from "lucide-react";

export function Icon({ name, className }: { name: string; className?: string }) {
  const Cmp = (LIcons as unknown as Record<string, LucideIcon>)[name] ?? LIcons.FileText;
  return <Cmp className={className} />;
}

export const ICON_CHOICES = [
  "User", "Users", "MapPin", "Map", "Sparkles", "Sword", "Shield",
  "Book", "BookOpen", "Crown", "Castle", "Mountain", "Trees",
  "Scroll", "Compass", "Flame", "Snowflake", "Star", "Skull",
  "Heart", "Globe", "Anchor", "Feather", "Gem", "Key",
];