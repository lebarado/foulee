import { TriangleAlert, Undo2 } from 'lucide-preact';
import { useState } from 'preact/hooks';
import { shiftTargets, shiftWarnings } from '../domain/cards';
import type { ISODate } from '../domain/dates';
import { relLabel } from '../domain/format';
import type { Session } from '../domain/types';
import { actions, sessions, settings, today, workDays } from '../data/store';

/** Boutons « Décaler » (+1 / +2 jours) avec confirmation douce si conflit. */
export function ShiftControl({ s, onMoved }: { s: Session; onMoved?: () => void }) {
  const t = today.value;
  const [pending, setPending] = useState<{ date: ISODate; warnings: string[] } | null>(null);
  const targets = shiftTargets(s, t, settings.value.maxShiftDays);
  if (!targets.length) return null;

  const doMove = (d: ISODate) => {
    setPending(null);
    void actions.move(s.id, d);
    onMoved?.();
  };
  const tryMove = (d: ISODate) => {
    const w = shiftWarnings(s, d, sessions.value, workDays.value, t);
    if (w.length) setPending({ date: d, warnings: w });
    else doMove(d);
  };

  if (pending)
    return (
      <div class="confirm">
        <p>
          <strong>{relLabel(pending.date, t)} ?</strong>
        </p>
        {pending.warnings.map((w) => (
          <Warn key={w} text={w} />
        ))}
        <div class="row">
          <button class="btn" onClick={() => doMove(pending.date)}>
            Oui, décaler
          </button>
          <button class="btn btn--ghost" onClick={() => setPending(null)}>
            Annuler
          </button>
        </div>
      </div>
    );

  return (
    <div class="chips" role="group" aria-label="Décaler la séance">
      <span class="chips__label">Décaler :</span>
      {targets.map((d) => (
        <button class="chip" key={d} onClick={() => tryMove(d)}>
          {d === s.originalDate && <Undo2 size={16} />}
          {relLabel(d, t)}
        </button>
      ))}
    </div>
  );
}

export function Warn({ text }: { text: string }) {
  return (
    <p class="hint hint--warn">
      <TriangleAlert size={16} /> {text}
    </p>
  );
}
