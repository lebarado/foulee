import { addDays, diffDays, monthKey, weekStart, type ISODate } from './dates';
import { efficiency, sessionMinutes } from './metrics';
import type { Session, Settings } from './types';

/**
 * Principe : on récompense l'engagement et la régularité, pas la vitesse.
 * Une carte décalée puis faite rapporte exactement autant qu'une carte faite à l'heure.
 * Une carte manquée rapporte 0 — on ne retire jamais de points.
 */
export const XP = { confirm: 10, run: 40, strength: 25, rpe: 5, underCeiling: 15 } as const;

export const hrCeilingOf = (s: Session, cfg: Pick<Settings, 'efHrCeiling'>) =>
  s.plan.hrCeiling ?? cfg.efHrCeiling;

const isDoneRun = (s: Session) => s.kind === 'run' && s.status === 'done';
const isDoneStrength = (s: Session) => s.kind === 'strength' && s.status === 'done';

export function sessionXp(s: Session, cfg: Pick<Settings, 'efHrCeiling'>): number {
  let xp = 0;
  if (s.confirmedAt && s.status !== 'skipped') xp += XP.confirm;
  if (s.status !== 'done') return xp;
  xp += s.kind === 'run' ? XP.run : XP.strength;
  if (s.log?.rpe != null) xp += XP.rpe;
  if (s.kind === 'run' && s.log?.avgHr != null && s.log.avgHr <= hrCeilingOf(s, cfg)) xp += XP.underCeiling;
  return xp;
}

/* ---------- Niveaux ---------- */

/** XP cumulée pour atteindre un niveau : 0, 100, 300, 600, 1000… */
export const levelThreshold = (level: number) => 50 * level * (level - 1);

export interface LevelInfo {
  level: number;
  into: number;
  span: number;
  progress: number;
}

export function levelInfo(xp: number): LevelInfo {
  let level = 1;
  while (xp >= levelThreshold(level + 1)) level++;
  const base = levelThreshold(level);
  const span = levelThreshold(level + 1) - base;
  return { level, into: xp - base, span, progress: (xp - base) / span };
}

/* ---------- Séries de semaines ---------- */

export type WeekMark = 'full' | 'protected' | 'broken' | 'pending';

export interface WeekMarkInfo {
  week: ISODate;
  mark: WeekMark;
  runs: number;
}

export interface StreakInfo {
  current: number;
  best: number;
  marks: WeekMarkInfo[];
  jokersLeft: number;
}

/**
 * Une semaine est « tenue » avec `weeklyRunTarget` sorties.
 * Une semaine à une sortie près est « protégée » par un joker (N par mois) : la série ne casse pas.
 * La semaine en cours ne casse jamais la série tant qu'elle n'est pas finie.
 */
export function streak(
  sessions: Session[],
  cfg: Pick<Settings, 'repriseStart' | 'weeklyRunTarget' | 'jokersPerMonth'>,
  today: ISODate,
): StreakInfo {
  const runsByWeek = new Map<ISODate, number>();
  for (const s of sessions.filter(isDoneRun)) {
    const w = weekStart(s.date);
    runsByWeek.set(w, (runsByWeek.get(w) ?? 0) + 1);
  }
  const jokersUsed = new Map<string, number>();
  const cur = weekStart(today);
  const marks: WeekMarkInfo[] = [];
  let run = 0;
  let best = 0;
  for (let w = weekStart(cfg.repriseStart); diffDays(w, cur) >= 0; w = addDays(w, 7)) {
    const runs = runsByWeek.get(w) ?? 0;
    const used = jokersUsed.get(monthKey(w)) ?? 0;
    let mark: WeekMark;
    if (runs >= cfg.weeklyRunTarget) mark = 'full';
    else if (w === cur) mark = 'pending';
    else if (runs > 0 && runs >= cfg.weeklyRunTarget - 1 && used < cfg.jokersPerMonth) {
      mark = 'protected';
      jokersUsed.set(monthKey(w), used + 1);
    } else mark = 'broken';

    if (mark === 'full' || mark === 'protected') best = Math.max(best, ++run);
    else if (mark === 'broken') run = 0;
    marks.push({ week: w, mark, runs });
  }
  return {
    current: run,
    best,
    marks,
    jokersLeft: Math.max(0, cfg.jokersPerMonth - (jokersUsed.get(monthKey(cur)) ?? 0)),
  };
}

/* ---------- Quêtes hebdo ---------- */

export interface Quest {
  id: string;
  emoji: string;
  label: string;
  progress: number;
  goal: number;
  done: boolean;
  xp: number;
}

export function weekQuests(
  sessions: Session[],
  cfg: Pick<Settings, 'weeklyRunTarget' | 'weeklyStrengthTarget'>,
  week: ISODate,
): Quest[] {
  const inWeek = sessions.filter((s) => s.status !== 'skipped' && weekStart(s.date) === week);
  const runs = inWeek.filter(isDoneRun);
  const strength = inWeek.filter(isDoneStrength).length;
  const planned = inWeek.filter((s) => s.confirmedAt || s.status === 'done').length;
  const withRpe = runs.filter((s) => s.log?.rpe != null).length;

  const q = (id: string, emoji: string, label: string, progress: number, goal: number, xp: number, extra = true): Quest => ({
    id,
    emoji,
    label,
    progress: Math.min(progress, goal),
    goal,
    xp,
    done: extra && progress >= goal,
  });

  return [
    q('runs', '🏃', `${cfg.weeklyRunTarget} sorties dans la semaine`, runs.length, cfg.weeklyRunTarget, 100),
    q('strength', '💪', `${cfg.weeklyStrengthTarget} séances de renfo`, strength, cfg.weeklyStrengthTarget, 30),
    q('plan', '🗓️', 'Caler toutes tes cartes', planned, Math.max(inWeek.length, 1), 20, inWeek.length > 0),
    q('rpe', '📝', 'Noter ton ressenti à chaque sortie', withRpe, Math.max(runs.length, 1), 20, runs.length > 0),
  ];
}

export function totalXp(sessions: Session[], cfg: Settings, today: ISODate): number {
  let xp = sessions.reduce((a, s) => a + sessionXp(s, cfg), 0);
  const cur = weekStart(today);
  for (let w = weekStart(cfg.repriseStart); diffDays(w, cur) >= 0; w = addDays(w, 7)) {
    xp += weekQuests(sessions, cfg, w)
      .filter((q) => q.done)
      .reduce((a, q) => a + q.xp, 0);
  }
  return xp;
}

/* ---------- Badges ---------- */

export interface Badge {
  id: string;
  emoji: string;
  name: string;
  desc: string;
  unlocked: boolean;
}

export function badges(sessions: Session[], cfg: Settings, today: ISODate): Badge[] {
  const runs = sessions.filter(isDoneRun);
  const st = streak(sessions, cfg, today);
  const totalKm = runs.reduce((a, s) => a + (s.log?.distanceKm ?? 0), 0);
  const easyRuns = runs.filter((s) => s.log?.avgHr != null && s.log.avgHr <= hrCeilingOf(s, cfg)).length;
  const runsSinceReprise = runs.filter((s) => s.date >= cfg.repriseStart).length;
  const calées = sessions.filter((s) => s.confirmedAt).length;

  const b = (id: string, emoji: string, name: string, desc: string, unlocked: boolean): Badge => ({
    id,
    emoji,
    name,
    desc,
    unlocked,
  });
  return [
    b('premiere-semaine', '🌱', 'Première semaine', `${cfg.weeklyRunTarget} sorties dans une semaine`, st.marks.some((m) => m.mark === 'full')),
    b('premier-renfo', '💪', 'Premier renfo', 'Une séance de renfo complète', sessions.some(isDoneStrength)),
    b('organise', '🗓️', 'Organisé', '10 cartes calées', calées >= 10),
    b('mois-sans-trou', '🔥', 'Un mois sans trou', '4 semaines tenues d’affilée', st.best >= 4),
    b('dix-sorties', '👟', 'Dix sorties', '10 sorties depuis la reprise', runsSinceReprise >= 10),
    b('patience', '🐢', 'Patience', '10 sorties sous le plafond FC', easyRuns >= 10),
    b('deux-mois', '⚡', 'Deux mois', '8 semaines tenues d’affilée', st.best >= 8),
    b('dix-km', '🏅', '10 km', 'Une sortie de 10 km ou plus', runs.some((s) => (s.log?.distanceKm ?? 0) >= 10)),
    b('cent-km', '💯', '100 km', '100 km cumulés', totalKm >= 100),
  ];
}

/* ---------- Records ---------- */

export interface Records {
  longestKm?: { value: number; date: ISODate };
  longestMin?: { value: number; date: ISODate };
  bestEfficiency?: { value: number; date: ISODate };
  bestWeekMin?: { value: number; week: ISODate };
  bestStreak: number;
}

export function records(sessions: Session[], cfg: Settings, today: ISODate): Records {
  const r: Records = { bestStreak: streak(sessions, cfg, today).best };
  const weekMin = new Map<ISODate, number>();
  for (const s of sessions.filter(isDoneRun)) {
    const km = s.log?.distanceKm;
    if (km && (!r.longestKm || km > r.longestKm.value)) r.longestKm = { value: km, date: s.date };
    const min = s.log?.durationSec ? s.log.durationSec / 60 : undefined;
    if (min && (!r.longestMin || min > r.longestMin.value)) r.longestMin = { value: min, date: s.date };
    const ef = efficiency(s.log);
    if (ef && (!r.bestEfficiency || ef > r.bestEfficiency.value)) r.bestEfficiency = { value: ef, date: s.date };
    const w = weekStart(s.date);
    weekMin.set(w, (weekMin.get(w) ?? 0) + sessionMinutes(s));
  }
  for (const [week, value] of weekMin) {
    if (value > 0 && (!r.bestWeekMin || value > r.bestWeekMin.value)) r.bestWeekMin = { value, week };
  }
  return r;
}
