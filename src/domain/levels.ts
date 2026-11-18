import type { Settings } from './types';

/** Un titre par niveau : ton identité de coureur évolue avec la régularité. */
const TITLES = [
  'Redémarrage',
  'Baskets lacées',
  'Habitué du bitume',
  'Rythme trouvé',
  'Endurant',
  'Régulier comme une horloge',
  'Coureur de fond',
  'Machine à EF',
  'Inarrêtable',
  'Légende de la Moselle',
];

export function levelTitle(level: number): string {
  if (level <= TITLES.length) return TITLES[level - 1];
  return `Légende · ${level - TITLES.length + 1}`;
}

export interface Theme {
  id: string;
  label: string;
  color: string;
  ink: string;
  level: number;
}

export const THEMES: Theme[] = [
  { id: 'menthe', label: 'Menthe', color: '#5ee6a8', ink: '#052a1b', level: 1 },
  { id: 'ocean', label: 'Océan', color: '#6cc7ff', ink: '#04243a', level: 2 },
  { id: 'corail', label: 'Corail', color: '#ff8f70', ink: '#3a0f04', level: 5 },
  { id: 'soleil', label: 'Soleil', color: '#ffd166', ink: '#3a2a00', level: 7 },
  { id: 'aurore', label: 'Aurore', color: '#f78fff', ink: '#33063a', level: 10 },
];

export type UnlockKind = 'theme' | 'joker';

export interface Unlock {
  level: number;
  kind: UnlockKind;
  label: string;
  desc: string;
}

/** Ce que l'app te donne en montant de niveau. */
export const UNLOCKS: Unlock[] = ([
  ...THEMES.filter((t) => t.level > 1).map<Unlock>((t) => ({
    level: t.level,
    kind: 'theme',
    label: `Thème ${t.label}`,
    desc: 'Nouvelle couleur pour tes cartes de course',
  })),
  { level: 4, kind: 'joker', label: '+1 joker par mois', desc: 'Une semaine de plus protégée quand le travail déborde' },
  { level: 8, kind: 'joker', label: '+1 joker par mois', desc: 'Encore plus de souplesse pour ta série' },
] satisfies Unlock[]).sort((a, b) => a.level - b.level);

export const unlocksAt = (level: number) => UNLOCKS.filter((u) => u.level === level);

export const bonusJokers = (level: number) =>
  UNLOCKS.filter((u) => u.kind === 'joker' && u.level <= level).length;

export const themeById = (id: string) => THEMES.find((t) => t.id === id) ?? THEMES[0];

export const isThemeUnlocked = (id: string, level: number) => themeById(id).level <= level;

/** Réglages effectifs : les bonus de niveau s'ajoutent aux réglages de base. */
export function effectiveSettings(cfg: Settings, level: number): Settings {
  return { ...cfg, jokersPerMonth: cfg.jokersPerMonth + bonusJokers(level) };
}
