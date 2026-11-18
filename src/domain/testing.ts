import { DEFAULT_SETTINGS } from './catalog';
import type { Session, Settings } from './types';

let n = 0;

/** Fabrique de séances pour les tests. */
export function mk(p: Partial<Session> & Pick<Session, 'date'>): Session {
  return {
    id: p.id ?? `t${++n}`,
    kind: 'run',
    title: 'Test',
    originalDate: p.originalDate ?? p.date,
    status: 'planned',
    plan: { durationMin: 30 },
    ...p,
  };
}

export const cfg = (p: Partial<Settings> = {}): Settings => ({ ...DEFAULT_SETTINGS, ...p });
