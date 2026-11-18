import type { Session } from './types';

const run = (id: string, date: string): Session => ({
  id,
  kind: 'run',
  title: 'Course tranquille',
  date,
  originalDate: date,
  status: 'planned',
  plan: { durationMin: 30 },
});

const strength = (id: string, date: string): Session => ({
  id,
  kind: 'strength',
  title: 'Renfo',
  date,
  originalDate: date,
  status: 'planned',
  plan: { durationMin: 15, sets: 2 },
});

/** Données de départ : historique + plan en cours au 18/11/2026. */
export function seedSessions(): Session[] {
  return [
    {
      id: 'seed-paris-10k',
      kind: 'run',
      title: '10 km de Paris',
      date: '2026-06-07',
      originalDate: '2026-06-07',
      status: 'done',
      plan: { durationMin: 0 },
      log: { distanceKm: 10.2, notes: 'Course officielle.' },
      source: 'historique',
    },
    {
      id: 'seed-run-1118',
      kind: 'run',
      title: 'Course de reprise',
      date: '2026-11-18',
      originalDate: '2026-11-18',
      status: 'done',
      plan: { durationMin: 27 },
      log: { durationSec: 26 * 60 + 36, distanceKm: 3.4, avgHr: 157, maxHr: 174, cadence: 155 },
      source: 'manuel',
    },
    strength('seed-str-1119', '2026-11-19'),
    run('seed-run-1120', '2026-11-20'),
    strength('seed-str-1121', '2026-11-21'),
    run('seed-run-1122', '2026-11-22'),
    run('seed-run-1125', '2026-11-25'),
    strength('seed-str-1126', '2026-11-26'),
    run('seed-run-1128', '2026-11-28'),
    strength('seed-str-1129', '2026-11-29'),
  ];
}
