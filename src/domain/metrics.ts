import type { Session, SessionLog } from './types';

export function paceSecPerKm(log?: SessionLog): number | undefined {
  if (!log?.durationSec || !log.distanceKm) return undefined;
  return log.durationSec / log.distanceKm;
}

/**
 * Efficiency Factor : vitesse (m/min) ÷ FC moyenne.
 * S'il monte avec le temps, tu vas plus vite pour le même effort cardiaque.
 */
export function efficiency(log?: SessionLog): number | undefined {
  if (!log?.durationSec || !log.distanceKm || !log.avgHr) return undefined;
  return (log.distanceKm * 1000) / (log.durationSec / 60) / log.avgHr;
}

/** Durée réelle si la séance est faite et chronométrée, sinon durée prévue. */
export function sessionMinutes(s: Session): number {
  if (s.status === 'done' && s.log?.durationSec) return s.log.durationSec / 60;
  return s.plan.durationMin;
}
