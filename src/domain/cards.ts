import { addDays, diffDays, type ISODate } from './dates';
import type { Session, Settings, WorkDay } from './types';

export type CardState =
  | 'done'
  | 'skipped'
  /** Date passée, plus décalable : sortie de la liste, sans pénalité. */
  | 'missed'
  /** Date passée mais encore décalable (dans la limite des jours autorisés). */
  | 'overdue'
  | 'today'
  /** Dans la fenêtre glissante (les prochaines 48 h par défaut). */
  | 'soon'
  | 'upcoming';

type CardCfg = Pick<Settings, 'windowDays' | 'maxShiftDays'>;

export function cardState(s: Session, today: ISODate, cfg: CardCfg): CardState {
  if (s.status === 'done') return 'done';
  if (s.status === 'skipped') return 'skipped';
  const delta = diffDays(today, s.date);
  if (delta < 0) return diffDays(s.originalDate, today) <= cfg.maxShiftDays ? 'overdue' : 'missed';
  if (delta === 0) return 'today';
  if (delta <= cfg.windowDays) return 'soon';
  return 'upcoming';
}

/** Dates possibles : de la date d'origine à +maxShiftDays, jamais dans le passé. */
export function shiftTargets(s: Session, today: ISODate, maxShiftDays: number): ISODate[] {
  if (s.status === 'done' || s.status === 'skipped') return [];
  const out: ISODate[] = [];
  for (let i = 0; i <= maxShiftDays; i++) {
    const d = addDays(s.originalDate, i);
    if (d !== s.date && diffDays(today, d) >= 0) out.push(d);
  }
  return out;
}

/** Avertissements doux (jamais bloquants) si la carte est placée à `target`. */
export function shiftWarnings(
  s: Session,
  target: ISODate,
  sessions: Session[],
  workDays: WorkDay[],
  today: ISODate,
): string[] {
  if (s.kind !== 'run') return [];
  const warnings: string[] = [];
  const near = sessions.some(
    (o) =>
      o.id !== s.id &&
      o.kind === 'run' &&
      (o.status === 'done' || ((o.status === 'planned' || o.status === 'confirmed') && o.date >= today)) &&
      Math.abs(diffDays(o.date, target)) <= 1,
  );
  if (near) warnings.push('Collée à une autre sortie : garde un jour de repos entre les deux si tu peux.');
  const heavy = new Set(workDays.filter((w) => w.heavy).map((w) => w.date));
  if (heavy.has(target)) warnings.push('Journée de dépôt ce jour-là.');
  if (heavy.has(addDays(target, 1))) warnings.push('Dépôt le lendemain : reste très tranquille.');
  return warnings;
}

/** Décale la carte ; la date d'origine reste la référence pour la limite de décalage. */
export function moveSession(s: Session, target: ISODate): Session {
  return { ...s, date: target };
}

/** Marque la carte faite. Faite en avance ? Elle passe à aujourd'hui. */
export function completeSession(s: Session, today: ISODate, nowIso: string): Session {
  return { ...s, status: 'done', doneAt: nowIso, date: s.date > today ? today : s.date };
}

/** Découpe une sortie course/marche en blocs lisibles. */
export function runBlocks(durationMin: number, runMin: number, walkMin: number) {
  const cycle = runMin + walkMin;
  const reps = Math.max(1, Math.floor(durationMin / cycle));
  const rest = Math.max(0, durationMin - reps * cycle);
  return { reps, rest };
}
