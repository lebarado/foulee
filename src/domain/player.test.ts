import { describe, expect, it } from 'vitest';
import { EXERCISES } from './catalog';
import {
  REST_BETWEEN_EXERCISES_SEC,
  REST_BETWEEN_ROUNDS_SEC,
  buildSteps,
  completedSets,
  formatClock,
  nextStep,
  pausePlayer,
  resumePlayer,
  startPlayer,
  stepElapsed,
  stepRemaining,
  totalElapsed,
  undoStep,
} from './player';
import { mk } from './testing';
import { T, repeat, work, recover } from './workout';

describe('buildSteps', () => {
  it('course/marche 30 min 4/1 → échauffement, 6 × (course, marche), retour au calme', () => {
    const steps = buildSteps(mk({ date: '2026-11-20', plan: { durationMin: 30, runWalk: { runMin: 4, walkMin: 1 } } }));
    expect(steps).toHaveLength(14);
    expect(steps[1]).toMatchObject({ label: 'Course', round: 1, rounds: 6 });
    expect(steps.at(-1)?.kind).toBe('cooldown');
  });

  it('renfo guidé en circuit : tous les exos au tour 1, puis tous au tour 2', () => {
    const steps = buildSteps(mk({ kind: 'strength', date: '2026-11-20', plan: { durationMin: 15, sets: 2, exercises: ['squat-chaise', 'pont-fessier'] } }));
    const work = steps.filter((s) => s.kind === 'work');
    expect(work.map((s) => `${s.exerciseId}#${s.round}`)).toEqual(['squat-chaise#1', 'pont-fessier#1', 'squat-chaise#2', 'pont-fessier#2']);
    expect(steps[0]).toMatchObject({ exerciseId: 'squat-chaise', set: 0, round: 1, rounds: 2, exIndex: 1, exCount: 2 });
    // transition courte dans un tour, vraie récup entre les tours, rien à la fin
    expect(steps[1].measure).toEqual({ type: 'time', sec: REST_BETWEEN_EXERCISES_SEC });
    expect(steps[3].measure).toEqual({ type: 'time', sec: REST_BETWEEN_ROUNDS_SEC });
    expect(steps.at(-1)?.kind).toBe('work');
  });

  it('jamais deux fois le même exercice d’affilée', () => {
    const work = buildSteps(mk({ kind: 'strength', date: '2026-11-20', plan: { durationMin: 15, sets: 3 } })).filter((s) => s.kind === 'work');
    for (let i = 1; i < work.length; i++) expect(work[i].exerciseId).not.toBe(work[i - 1].exerciseId);
  });

  it('séance structurée : les répétitions sont déroulées', () => {
    const steps = buildSteps(mk({ date: '2026-11-20', plan: { durationMin: 10, workout: [repeat(3, work(T(1)), recover(T(1)))] } }));
    expect(steps).toHaveLength(6);
    expect(steps[4]).toMatchObject({ round: 3, rounds: 3 });
  });

  it('séance libre : une seule étape sans durée imposée', () => {
    expect(buildSteps(mk({ kind: 'bike', date: '2026-11-20' }))).toHaveLength(1);
  });

  it('renfo complet : 8 exercices × 2 séries', () => {
    const steps = buildSteps(mk({ kind: 'strength', date: '2026-11-20', plan: { durationMin: 15, sets: 2 } }));
    expect(steps.filter((s) => s.kind === 'work')).toHaveLength(EXERCISES.length * 2);
  });
});

describe('chrono', () => {
  const steps = buildSteps(mk({ date: '2026-11-20', plan: { durationMin: 30 } })); // 3 étapes
  const t0 = 1_000_000;

  it('compte le temps total et le temps de l’étape', () => {
    let s = startPlayer('x', steps, t0);
    expect(totalElapsed(s, t0 + 5000)).toBe(5000);
    s = nextStep(s, t0 + 5000);
    expect(s.index).toBe(1);
    expect(stepElapsed(s, t0 + 7000)).toBe(2000);
    expect(totalElapsed(s, t0 + 7000)).toBe(7000);
  });

  it('annuler un mauvais clic : retour à l’étape, son temps est conservé, le total ne recule pas', () => {
    let s = startPlayer('x', steps, t0);
    s = nextStep(s, t0 + 60_000); // 1 min sur l'échauffement
    s = undoStep(s, t0 + 63_000); // mauvais clic, corrigé 3 s après
    expect(s.index).toBe(0);
    expect(stepElapsed(s, t0 + 63_000)).toBe(63_000);
    expect(totalElapsed(s, t0 + 63_000)).toBe(63_000);
    expect(undoStep(s, t0 + 64_000)).toBe(s); // rien à annuler
  });

  it('pause : le temps ne court plus', () => {
    let s = startPlayer('x', steps, t0);
    s = pausePlayer(s, t0 + 10_000);
    expect(totalElapsed(s, t0 + 50_000)).toBe(10_000);
    s = resumePlayer(s, t0 + 50_000);
    expect(totalElapsed(s, t0 + 55_000)).toBe(15_000);
  });

  it('temps restant d’une étape chronométrée', () => {
    const s = startPlayer('x', steps, t0);
    expect(stepRemaining(s, t0 + 60_000)).toBe(4 * 60_000);
  });

  it('la dernière étape ne passe pas plus loin', () => {
    let s = startPlayer('x', steps, t0);
    s = nextStep(nextStep(s, t0 + 1), t0 + 2);
    expect(nextStep(s, t0 + 3)).toBe(s);
  });

  it('formatClock', () => {
    expect(formatClock(65_000)).toBe('01:05');
    expect(formatClock(3_725_000)).toBe('1:02:05');
  });
});

describe('séries faites (renfo)', () => {
  it('coche les séries franchies', () => {
    const steps = buildSteps(mk({ kind: 'strength', date: '2026-11-20', plan: { durationMin: 15, sets: 2, exercises: ['squat-chaise'] } }));
    let s = startPlayer('x', steps, 0);
    s = nextStep(nextStep(s, 1), 2); // série 1 faite, repos passé → série 2 en cours
    expect(completedSets(s, false)).toEqual({ 'squat-chaise': [true, false] });
    expect(completedSets(s, true)).toEqual({ 'squat-chaise': [true, true] });
  });
});
