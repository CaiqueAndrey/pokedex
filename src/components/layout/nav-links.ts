import { Heart, Scale, Users } from "lucide-react";
import { messages } from "@/config/messages";

/**
 * Secondary destinations: inline on wider screens, in the menu on phones. "Aleatório" lives on the
 * Pokédex itself ("Surpreenda-me"), next to what it shuffles.
 */
export const NAV_LINKS = [
  { href: "/favorites", label: messages.nav.favorites, Icon: Heart },
  { href: "/team", label: messages.nav.team, Icon: Users },
  { href: "/compare", label: messages.nav.compare, Icon: Scale },
] as const;
