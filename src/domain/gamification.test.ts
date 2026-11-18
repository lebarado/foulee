import { describe, expect, it } from 'vitest';
import { XP, badges, levelInfo, sessionXp, streak, totalXp, weekQuests } from './gamification';
import { cfg, mk } from './testing';

const C = cfg({ repriseStart: '2026-11-02' }); // lundi

const doneRun = (date: string, extra = {}) =>
  mk({ date, status: 'done', log: { durationSec: 1800, distanceKm: 4, avgHr: 145, rpe: 3 }, ...extra });

describe('sessionXp', () => {
  it('additionne calage, séance, ressenti et FC sous le plafond', () => {
    expect(sessionXp(doneRun('2026-11-04', { confirmedAt: 'x' }), C)).toBe(
      XP.confirm + XP.run + XP.rpe + XP.underCeiling,
    );
  });

  it('une séance décalée rapporte autant qu’une séance à l’heure', () => {
    const onTime = doneRun('2026-11-04', { confirmedAt: 'x' });
    const shifted = doneRun('2026-11-06', { originalDate: '2026-11-04', confirmedAt: 'x' });
    expect(sessionXp(shifted, C)).toBe(sessionXp(onTime, C));
  });

  it('une séance manquée vaut 0, jamais négatif', () => {
    expect(sessionXp(mk({ date: '2026-11-04' }), C)).toBe(0);
    expect(sessionXp(mk({ date: '2026-11-04', status: 'skipped', confirmedAt: 'x' }), C)).toBe(0);
  });
});

describe('levelInfo', () => {
  it('paliers 0 / 100 / 300 / 600', () => {
    expect(levelInfo(0).level).toBe(1);
    expect(levelInfo(99).level).toBe(1);
    expect(levelInfo(100).level).toBe(2);
    expect(levelInfo(300).level).toBe(3);
    expect(levelInfo(450)).toMatchObject({ level: 3, into: 150, span: 300, progress: 0.5 });
  });
});

describe('streak', () => {
  const week = (monday: string, runs: number) =>
    Array.from({ length: runs }, (_, i) => doneRun(`${monday.slice(0, 8)}${String(Number(monday.slice(8)) + i * 2).padStart(2, '0')}`));

  it('compte les semaines à 3 sorties ; la semaine en cours ne casse pas la série', () => {
    const s = [...week('2026-11-02', 3), ...week('2026-11-09', 3), ...week('2026-11-16', 1)];
    const st = streak(s, C, '2026-11-18');
    expect(st.current).toBe(2);
    expect(st.marks.at(-1)?.mark).toBe('pending');
  });

  it('un joker par mois protège une semaine à 2 sorties', () => {
    const s = [...week('2026-11-02', 3), ...week('2026-11-09', 2), ...week('2026-11-16', 2), ...week('2026-11-23', 3)];
    const st = streak(s, C, '2026-11-30');
    expect(st.marks.map((m) => m.mark)).toEqual(['full', 'protected', 'broken', 'full', 'pending']);
    expect(st.current).toBe(1);
    expect(st.best).toBe(2);
  });

  it('une semaine vide casse la série (sans retirer d’XP)', () => {
    const s = [...week('2026-11-02', 3), ...week('2026-11-16', 3)];
    const st = streak(s, C, '2026-11-23');
    expect(st.current).toBe(1);
    const before = totalXp(s, C, '2026-11-23');
    expect(totalXp([...s, mk({ date: '2026-11-24' })], C, '2026-11-23')).toBe(before);
  });
});

describe('quêtes', () => {
  it('la quête 3 sorties rapporte 100 XP une fois remplie', () => {
    const s = [doneRun('2026-11-02'), doneRun('2026-11-04'), doneRun('2026-11-06')];
    const q = weekQuests(s, C, '2026-11-02');
    expect(q.find((x) => x.id === 'runs')).toMatchObject({ done: true, progress: 3, xp: 100 });
    expect(q.find((x) => x.id === 'rpe')?.done).toBe(true);
  });

  it('pas de quête « ressenti » validée sans sortie', () => {
    const q = weekQuests([], C, '2026-11-02');
    expect(q.every((x) => !x.done)).toBe(true);
  });
});

describe('badges', () => {
  it('débloque 10 km et première semaine', () => {
    const s = [doneRun('2026-11-02'), doneRun('2026-11-04'), doneRun('2026-11-06', { log: { distanceKm: 10.2 } })];
    const b = Object.fromEntries(badges(s, C, '2026-11-10').map((x) => [x.id, x.unlocked]));
    expect(b['dix-km']).toBe(true);
    expect(b['premiere-semaine']).toBe(true);
    expect(b['mois-sans-trou']).toBe(false);
  });
});
