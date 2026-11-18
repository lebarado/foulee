import { TriangleAlert } from 'lucide-preact';
import { useState } from 'preact/hooks';
import { shiftTargets, shiftWarnings } from '../domain/cards';
import type { ISODate } from '../domain/dates';
import { relLabel } from '../domain/format';
import type { Session } from '../domain/types';
import { actions, sessions, settings, today, workDays } from '../data/store';

/** « Décaler : Demain · Après-demain », avec confirmation discrète si conflit. */
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
        <p>Décaler à {relLabel(pending.date, t).toLowerCase()} ?</p>
        {pending.warnings.map((w) => (
          <Warn key={w} text={w} />
        ))}
        <div class="row-actions">
          <button class="btn btn--small" onClick={() => doMove(pending.date)}>
            Décaler
          </button>
          <button class="btn btn--small btn--secondary" onClick={() => setPending(null)}>
            Annuler
          </button>
        </div>
      </div>
    );

  return (
    <div class="shift" role="group" aria-label="Décaler la séance">
      <span class="shift__label">Décaler</span>
      {targets.map((d) => (
        <button class="link" key={d} onClick={() => tryMove(d)}>
          {d === s.originalDate ? `Revenir à ${relLabel(d, t).toLowerCase()}` : relLabel(d, t)}
        </button>
      ))}
    </div>
  );
}

export function Warn({ text }: { text: string }) {
  return (
    <p class="note note--warn">
      <TriangleAlert size={14} strokeWidth={1.75} /> {text}
    </p>
  );
}
