import { diffDays } from './dates';
import type { RunWalk, Session, Settings } from './types';

export interface Suggestion {
  durationMin: number;
  runWalk?: RunWalk;
  hrCeiling: number;
  reasons: string[];
  changed: boolean;
}

/**
 * Ajuste la prochaine sortie à partir des dernières, selon les règles (paramètres dans les réglages).
 * Ordre : longue coupure → FC trop haute → ressenti dur → progression si tout est facile.
 */
export function suggestNext(next: Session, sessions: Session[], cfg: Settings): Suggestion {
  const c = cfg.coach;
  const hrCeiling = next.plan.hrCeiling ?? cfg.efHrCeiling;
  let durationMin = next.plan.durationMin;
  let runWalk = next.plan.runWalk;
  const reasons: string[] = [];

  const past = sessions
    .filter((s) => s.kind === 'run' && s.status === 'done' && diffDays(s.date, next.date) > 0)
    .sort((a, b) => b.date.localeCompare(a.date));
  const last = past[0];

  if (last) {
    const gap = diffDays(last.date, next.date);
    if (gap > c.gapDays) {
      durationMin = Math.round(durationMin * (1 - c.gapPct));
      reasons.push(`${gap} jours sans courir : on reprend en douceur (−${Math.round(c.gapPct * 100)} %).`);
    } else {
      const hr = last.log?.avgHr;
      const rpe = last.log?.rpe;
      if (hr != null && hr > hrCeiling + c.hrMargin) {
        runWalk ??= { ...c.runWalk };
        reasons.push(
          `FC moyenne de ${hr} la dernière fois (plafond ${hrCeiling}) : alterne ${runWalk.runMin} min de course et ${runWalk.walkMin} min de marche.`,
        );
      }
      if (rpe != null && rpe >= c.rpeHigh) {
        durationMin = Math.round(durationMin * (1 - c.stepDownPct));
        reasons.push(`Ressenti ${rpe}/10 la dernière fois : séance raccourcie.`);
      }
      const lastTwo = past.slice(0, 2);
      const easy =
        lastTwo.length === 2 &&
        lastTwo.every(
          (s) => s.log?.avgHr != null && s.log.avgHr <= hrCeiling && s.log.rpe != null && s.log.rpe <= c.rpeEasy,
        );
      if (easy && reasons.length === 0) {
        if (runWalk) {
          runWalk = undefined;
          reasons.push('Deux sorties faciles sous le plafond : essaie en continu.');
        } else {
          const up = Math.min(durationMin + c.stepUpMin, c.maxRunMin);
          if (up > durationMin) {
            reasons.push(`Deux sorties faciles sous le plafond : +${up - durationMin} min.`);
            durationMin = up;
          }
        }
      }
    }
  }

  const changed =
    durationMin !== next.plan.durationMin ||
    JSON.stringify(runWalk ?? null) !== JSON.stringify(next.plan.runWalk ?? null);
  return { durationMin, runWalk, hrCeiling, reasons, changed };
}
