import { describe, expect, it } from 'vitest';
import { suggestNext } from './coach';
import { loadCheck } from './load';
import { cfg, mk } from './testing';

const C = cfg();

const done = (date: string, min: number, log = {}) =>
  mk({ date, status: 'done', plan: { durationMin: min }, log: { durationSec: min * 60, ...log } });

describe('loadCheck (règle des 10 %)', () => {
  it('pas de verdict sans 2 semaines d’historique', () => {
    expect(loadCheck([done('2026-11-18', 27)], C, '2026-11-23')).toBeNull();
  });

  it('alerte si le volume prévu dépasse la base + max(10 %, 10 min)', () => {
    const hist = [done('2026-11-03', 60), done('2026-11-10', 60), done('2026-11-17', 60)];
    const ok = [...hist, mk({ date: '2026-11-24', plan: { durationMin: 35 } }), mk({ date: '2026-11-26', plan: { durationMin: 35 } })];
    expect(loadCheck(ok, C, '2026-11-23')).toMatchObject({ baselineMin: 60, allowedMin: 70, over: false });
    const tooMuch = [...ok, mk({ date: '2026-11-28', plan: { durationMin: 30 } })];
    expect(loadCheck(tooMuch, C, '2026-11-23')?.over).toBe(true);
  });

  it('au-delà de 100 min de base, c’est le 10 % qui s’applique', () => {
    const hist = [done('2026-11-03', 150), done('2026-11-10', 150), done('2026-11-17', 150)];
    expect(loadCheck(hist, C, '2026-11-23')?.allowedMin).toBeCloseTo(165);
  });
});

describe('coach.suggestNext', () => {
  const next = mk({ date: '2026-11-20', plan: { durationMin: 30 } });

  it('FC trop haute → propose course/marche', () => {
    const s = suggestNext(next, [done('2026-11-18', 27, { avgHr: 157 })], C);
    expect(s.runWalk).toEqual({ runMin: 4, walkMin: 1 });
    expect(s.changed).toBe(true);
  });

  it('ressenti dur → raccourcit de 15 %', () => {
    const s = suggestNext(next, [done('2026-11-18', 27, { avgHr: 145, rpe: 8 })], C);
    expect(s.durationMin).toBe(26);
  });

  it('deux sorties faciles → +5 min', () => {
    const past = [done('2026-11-16', 30, { avgHr: 142, rpe: 3 }), done('2026-11-18', 30, { avgHr: 144, rpe: 4 })];
    expect(suggestNext(next, past, C).durationMin).toBe(35);
  });

  it('deux sorties faciles en course/marche → repasse en continu', () => {
    const rw = mk({ date: '2026-11-20', plan: { durationMin: 30, runWalk: { runMin: 4, walkMin: 1 } } });
    const past = [done('2026-11-16', 30, { avgHr: 142, rpe: 3 }), done('2026-11-18', 30, { avgHr: 144, rpe: 4 })];
    const s = suggestNext(rw, past, C);
    expect(s.runWalk).toBeUndefined();
    expect(s.durationMin).toBe(30);
  });

  it('longue coupure → −20 %', () => {
    expect(suggestNext(next, [done('2026-11-01', 30, { avgHr: 140, rpe: 3 })], C).durationMin).toBe(24);
  });

  it('rien à dire → pas de changement', () => {
    const s = suggestNext(next, [done('2026-11-18', 30, { avgHr: 148, rpe: 5 })], C);
    expect(s.changed).toBe(false);
    expect(s.reasons).toEqual([]);
  });
});
