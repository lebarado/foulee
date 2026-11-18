import { EXERCISES } from '../domain/catalog';
import { fmtNum, formatDuration, formatPace } from '../domain/format';
import { paceSecPerKm } from '../domain/metrics';
import { sportInfo } from '../domain/sports';
import type { Session, Settings } from '../domain/types';
import { formatMeters, workoutStats } from '../domain/workout';

export const sessionExercises = (s: Session) =>
  s.plan.exercises ? EXERCISES.filter((e) => s.plan.exercises!.includes(e.id)) : EXERCISES;

/** Renfo coureur « classique » : guidé exercice par exercice. */
export const isGuidedStrength = (s: Session) => s.kind === 'strength' && !s.plan.workout;

export function planText(s: Session, cfg: Settings): string {
  const parts: string[] = [];
  if (s.plan.workout) {
    const st = workoutStats(s.plan.workout);
    parts.push(`${st.partial ? '≈ ' : ''}${s.plan.durationMin} min`);
    if (st.meters) parts.push(formatMeters(st.meters));
    parts.push(`${st.steps} étapes`);
  } else if (isGuidedStrength(s)) {
    parts.push(`${s.plan.durationMin} min`, `${s.plan.sets ?? 2} séries`, `${sessionExercises(s).length} exercices`);
  } else {
    parts.push(`${s.plan.durationMin} min`);
    if (s.kind === 'run') parts.push(s.plan.runWalk ? `${s.plan.runWalk.runMin}′ course / ${s.plan.runWalk.walkMin}′ marche` : 'en continu');
  }
  if (s.kind === 'run') parts.push(`FC < ${s.plan.hrCeiling ?? cfg.efHrCeiling}`);
  return parts.join(' · ');
}

export function logText(s: Session): string[] {
  const l = s.log;
  if (!l) return [];
  const out: string[] = [];
  if (l.distanceKm) out.push(sportInfo(s.kind).distanceUnit === 'm' ? `${Math.round(l.distanceKm * 1000)} m` : `${fmtNum(l.distanceKm, 2)} km`);
  if (l.durationSec) out.push(formatDuration(l.durationSec));
  const p = s.kind === 'run' ? paceSecPerKm(l) : undefined;
  if (p) out.push(formatPace(p));
  if (l.avgHr) out.push(`FC ${l.avgHr}${l.maxHr ? ` / ${l.maxHr}` : ''}`);
  if (l.cadence) out.push(`${l.cadence} ppm`);
  if (l.rpe != null) out.push(`ressenti ${l.rpe}/10`);
  if (l.pain != null && s.kind === 'strength') out.push(`douleur ${l.pain}/10`);
  return out;
}
