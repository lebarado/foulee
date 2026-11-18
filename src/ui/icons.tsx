import {
  Angry,
  Award,
  Bike,
  PersonStanding,
  Shuffle,
  Waves,
  CalendarCheck,
  Dumbbell,
  Flame,
  Footprints,
  Frown,
  Laugh,
  Medal,
  Meh,
  Mountain,
  PenLine,
  ShieldCheck,
  Smile,
  Sprout,
  Turtle,
  Zap,
} from 'lucide-preact';
import type { Session } from '../domain/types';

export type IconC = typeof Footprints;

export const KIND_ICONS: Record<Session['kind'], IconC> = {
  run: Footprints,
  strength: Dumbbell,
  cali: PersonStanding,
  swim: Waves,
  bike: Bike,
};

export function KindIcon({ kind, size = 24 }: { kind: Session['kind']; size?: number }) {
  const I = KIND_ICONS[kind] ?? Footprints;
  return <I size={size} />;
}

export const QUEST_ICONS: Record<string, IconC> = {
  run: Footprints,
  strength: Dumbbell,
  days: CalendarCheck,
  rpe: PenLine,
};

export const BADGE_ICONS: Record<string, IconC> = {
  'premiere-semaine': Sprout,
  'premier-renfo': Dumbbell,
  'renfo-10': ShieldCheck,
  'mois-sans-trou': Flame,
  'dix-sorties': Footprints,
  patience: Turtle,
  'deux-mois': Zap,
  'dix-km': Medal,
  'cent-km': Mountain,
  polyvalent: Shuffle,
};

export const badgeIcon = (id: string) => BADGE_ICONS[id] ?? Award;

export function RpeIcon({ value, size = 20 }: { value: number; size?: number }) {
  const I = value <= 2 ? Laugh : value <= 4 ? Smile : value <= 6 ? Meh : value <= 8 ? Frown : Angry;
  return <I size={size} />;
}
