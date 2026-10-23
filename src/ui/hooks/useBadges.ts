import { ACCESSORIES, BOARD_THEMES } from '../../core/economy/cosmetics';
import { allBadgeStatus, TIER_ICONS, type BadgeStatus } from '../../core/progression/badges';
import { badgeInput, useSave } from '../../store/saveStore';

export function cosmeticLabel(id: string): string {
  const a = ACCESSORIES.find((x) => x.id === id);
  if (a) return `${a.icon} ${a.name} outfit`;
  const t = BOARD_THEMES.find((x) => x.id === id);
  return t ? `${t.icon} ${t.name} board` : id;
}

/** Live badge status for the current save. */
export function useBadges(): BadgeStatus[] {
  const s = useSave();
  return allBadgeStatus(badgeInput(s), s.badges);
}

export const tierIcon = (tier: number) => (tier > 0 ? TIER_ICONS[tier - 1] : '');
