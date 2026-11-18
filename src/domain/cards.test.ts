import { describe, expect, it } from 'vitest';
import { cardState, moveSession, shiftTargets, shiftWarnings } from './cards';
import { cfg, mk } from './testing';

const C = cfg();

describe('cardState', () => {
  it('suit la fenêtre glissante de 48 h', () => {
    const s = mk({ date: '2026-11-20' }); // vendredi
    expect(cardState(s, '2026-11-15', C)).toBe('upcoming');
    expect(cardState(s, '2026-11-18', C)).toBe('toConfirm');
    expect(cardState({ ...s, status: 'confirmed' }, '2026-11-19', C)).toBe('confirmed');
    expect(cardState(s, '2026-11-20', C)).toBe('today');
  });

  it('une carte passée reste rattrapable 2 jours après sa date d’origine, puis sort sans pénalité', () => {
    const s = mk({ date: '2026-11-20' });
    expect(cardState(s, '2026-11-21', C)).toBe('overdue');
    expect(cardState(s, '2026-11-22', C)).toBe('overdue');
    expect(cardState(s, '2026-11-23', C)).toBe('missed');
  });

  it('done et skipped priment sur la date', () => {
    expect(cardState(mk({ date: '2026-11-01', status: 'done' }), '2026-11-20', C)).toBe('done');
    expect(cardState(mk({ date: '2026-11-30', status: 'skipped' }), '2026-11-20', C)).toBe('skipped');
  });
});

describe('shiftTargets', () => {
  it('propose +1 et +2 jours depuis la date d’origine', () => {
    const s = mk({ date: '2026-11-19' }); // jeudi
    expect(shiftTargets(s, '2026-11-18', 2)).toEqual(['2026-11-20', '2026-11-21']);
  });

  it('après un décalage, on peut revenir à la date d’origine ou aller à +2', () => {
    const s = mk({ date: '2026-11-20', originalDate: '2026-11-19' });
    expect(shiftTargets(s, '2026-11-18', 2)).toEqual(['2026-11-19', '2026-11-21']);
  });

  it('jamais dans le passé, jamais au-delà de +2', () => {
    const s = mk({ date: '2026-11-19' });
    expect(shiftTargets(s, '2026-11-20', 2)).toEqual(['2026-11-20', '2026-11-21']);
    expect(shiftTargets(s, '2026-11-22', 2)).toEqual([]);
  });
});

describe('shiftWarnings', () => {
  it('prévient si deux sorties se collent ou si un dépôt suit', () => {
    const a = mk({ id: 'a', date: '2026-11-20' });
    const b = mk({ id: 'b', date: '2026-11-22' });
    const w = shiftWarnings(a, '2026-11-21', [a, b], [{ date: '2026-11-22', heavy: true }], '2026-11-18');
    expect(w).toHaveLength(2);
  });

  it('ignore les sorties passées non faites et le renfo', () => {
    const a = mk({ id: 'a', date: '2026-11-20' });
    const missed = mk({ id: 'm', date: '2026-11-19' });
    expect(shiftWarnings(a, '2026-11-20', [a, missed], [], '2026-11-20')).toEqual([]);
    expect(shiftWarnings(mk({ kind: 'strength', date: '2026-11-20' }), '2026-11-21', [a], [], '2026-11-18')).toEqual([]);
  });
});

describe('moveSession', () => {
  it('décaler = caler, sans toucher la date d’origine', () => {
    const s = moveSession(mk({ date: '2026-11-19' }), '2026-11-20', 'now');
    expect(s).toMatchObject({ date: '2026-11-20', originalDate: '2026-11-19', status: 'confirmed', confirmedAt: 'now' });
  });
});
