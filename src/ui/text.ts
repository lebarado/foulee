import { EXERCISES } from '../domain/catalog';
import { fmtNum, formatDuration, formatPace } from '../domain/format';
import { paceSecPerKm } from '../domain/metrics';
import type { Session, Settings } from '../domain/types';

export const kindEmoji = (s: Pick<Session, 'kind'>) => (s.kind === 'run' ? '🏃' : '💪');

export function planText(s: Session, cfg: Settings): string {
  if (s.kind === 'strength') return `${s.plan.durationMin} min · ${s.plan.sets ?? 2} séries · ${EXERCISES.length} exos`;
  const parts = [`${s.plan.durationMin} min`];
  parts.push(s.plan.runWalk ? `${s.plan.runWalk.runMin}′ course / ${s.plan.runWalk.walkMin}′ marche` : 'en continu');
  parts.push(`FC < ${s.plan.hrCeiling ?? cfg.efHrCeiling}`);
  return parts.join(' · ');
}

export function logText(s: Session): string[] {
  const l = s.log;
  if (!l) return [];
  const out: string[] = [];
  if (l.distanceKm) out.push(`${fmtNum(l.distanceKm, 2)} km`);
  if (l.durationSec) out.push(formatDuration(l.durationSec));
  const p = paceSecPerKm(l);
  if (p) out.push(formatPace(p));
  if (l.avgHr) out.push(`FC ${l.avgHr}${l.maxHr ? ` / ${l.maxHr}` : ''}`);
  if (l.cadence) out.push(`${l.cadence} ppm`);
  if (l.rpe != null) out.push(`ressenti ${l.rpe}/10`);
  if (l.pain != null && s.kind === 'strength') out.push(`douleur ${l.pain}/10`);
  return out;
}
