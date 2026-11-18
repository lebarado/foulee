import { describe, expect, it } from 'vitest';
import { sessionXp, weekQuests } from './gamification';
import { LIBRARY } from './library';
import { cfg, mk } from './testing';
import { D, OPEN, R, T, cloneWorkout, cool, flatten, measureLabel, recover, repeat, warm, work, workoutStats } from './workout';

describe('séance structurée', () => {
  const w = [warm(T(5)), repeat(6, work(T(4)), recover(T(1))), cool(T(5))];

  it('déroule les répétitions', () => {
    const flat = flatten(w);
    expect(flat).toHaveLength(14);
    expect(flat[1]).toMatchObject({ kind: 'work', round: 1, rounds: 6 });
    expect(flat[12]).toMatchObject({ kind: 'recover', round: 6 });
  });

  it('calcule la durée totale', () => {
    expect(workoutStats(w)).toEqual({ sec: 40 * 60, meters: 0, partial: false, steps: 14 });
  });

  it('distance et répétitions rendent la durée partielle', () => {
    const s = workoutStats([warm(D(200)), repeat(4, work(D(100)), work(R(10))), cool(OPEN)]);
    expect(s).toMatchObject({ meters: 600, partial: true, sec: 0 });
  });

  it('affiche les mesures en français', () => {
    expect(measureLabel(T(1, 30))).toBe('1 min 30');
    expect(measureLabel(T(0, 45))).toBe('45 s');
    expect(measureLabel(D(400))).toBe('400 m');
    expect(measureLabel(D(1500))).toBe('1,5 km');
    expect(measureLabel(R(12))).toBe('12 rép.');
  });

  it('cloner donne de nouveaux identifiants sans toucher au modèle', () => {
    const c = cloneWorkout(w);
    expect(c[0].id).not.toBe(w[0].id);
    (c[1] as { rounds: number }).rounds = 2;
    expect((w[1] as { rounds: number }).rounds).toBe(6);
  });
});

describe('bibliothèque', () => {
  it('couvre les 5 sports', () => {
    expect(new Set(LIBRARY.map((t) => t.kind))).toEqual(new Set(['run', 'strength', 'cali', 'swim', 'bike']));
  });

  it('la durée annoncée colle à la séance quand elle est entièrement chronométrée', () => {
    for (const t of LIBRARY) {
      if (!t.plan.workout) continue;
      const s = workoutStats(t.plan.workout);
      if (!s.partial) expect(Math.round(s.sec / 60), t.id).toBe(t.plan.durationMin);
    }
  });
});

describe('autres sports et gamification', () => {
  const C = cfg({ repriseStart: '2026-11-02' });

  it('chaque sport rapporte de l’XP', () => {
    for (const kind of ['swim', 'bike', 'cali'] as const) expect(sessionXp(mk({ kind, date: '2026-11-04', status: 'done' }), C)).toBeGreaterThan(0);
  });

  it('la calisthénie compte pour la quête renfo, pas pour la quête course', () => {
    const q = weekQuests([mk({ kind: 'cali', date: '2026-11-04', status: 'done' })], C, '2026-11-02');
    expect(q.find((x) => x.id === 'strength')?.progress).toBe(1);
    expect(q.find((x) => x.id === 'runs')?.progress).toBe(0);
  });
});
