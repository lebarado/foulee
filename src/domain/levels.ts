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
  /** Couleur d'accent en mode clair. */
  color: string;
  /** Variante pour le mode sombre. */
  dark: string;
  level: number;
}

/** Couleurs d'accent sobres ; une seule à la fois dans l'interface. */
export const THEMES: Theme[] = [
  { id: 'sapin', label: 'Sapin', color: '#2f5d50', dark: '#86b5a6', level: 1 },
  { id: 'ardoise', label: 'Ardoise', color: '#3f5873', dark: '#9db4cc', level: 2 },
  { id: 'terracotta', label: 'Terracotta', color: '#a4512e', dark: '#e09a78', level: 5 },
  { id: 'olive', label: 'Olive', color: '#5b6236', dark: '#b5bc8a', level: 7 },
  { id: 'encre', label: 'Encre', color: '#1c1917', dark: '#e7e5e4', level: 10 },
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
    desc: 'Nouvelle couleur d’accent',
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
