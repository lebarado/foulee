import { addDays, weekStart, type ISODate } from './dates';
import { sessionMinutes } from './metrics';
import type { Session, Settings } from './types';

/** Minutes de course faites par semaine (clé : lundi). */
export function doneRunMinutesByWeek(sessions: Session[]): Map<ISODate, number> {
  const m = new Map<ISODate, number>();
  for (const s of sessions) {
    if (s.kind !== 'run' || s.status !== 'done') continue;
    const w = weekStart(s.date);
    m.set(w, (m.get(w) ?? 0) + sessionMinutes(s));
  }
  return m;
}

export interface LoadCheck {
  week: ISODate;
  plannedMin: number;
  baselineMin: number;
  allowedMin: number;
  over: boolean;
}

/**
 * Règle des 10 % : le volume de course de la semaine (fait + prévu) ne doit pas dépasser
 * la moyenne des 3 semaines précédentes + max(10 %, plancher en minutes).
 * Pas de verdict tant qu'il y a moins de 2 semaines d'historique.
 */
export function loadCheck(
  sessions: Session[],
  cfg: Pick<Settings, 'volume'>,
  week: ISODate,
): LoadCheck | null {
  const done = doneRunMinutesByWeek(sessions);
  const prev = [1, 2, 3].map((i) => done.get(addDays(week, -7 * i)) ?? 0);
  if (prev.filter((v) => v > 0).length < 2) return null;
  const baselineMin = prev.reduce((a, b) => a + b, 0) / prev.length;
  const plannedMin = sessions
    .filter((s) => s.kind === 'run' && s.status !== 'skipped' && weekStart(s.date) === week)
    .reduce((a, s) => a + sessionMinutes(s), 0);
  const allowedMin = Math.max(
    baselineMin * (1 + cfg.volume.maxIncrease),
    baselineMin + cfg.volume.minIncreaseMin,
  );
  return { week, plannedMin, baselineMin, allowedMin, over: plannedMin > allowedMin };
}
