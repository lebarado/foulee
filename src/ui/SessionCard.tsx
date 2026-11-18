import { useState } from 'preact/hooks';
import { cardState, shiftTargets, shiftWarnings } from '../domain/cards';
import { suggestNext } from '../domain/coach';
import { diffDays, type ISODate } from '../domain/dates';
import { relLabel } from '../domain/format';
import type { Session } from '../domain/types';
import { actions, sessions, settings, today, workDays } from '../data/store';
import { openSheet } from './state';
import { kindEmoji, logText, planText } from './text';

interface Props {
  s: Session;
  /** Afficher le conseil du coach (pour la prochaine sortie). */
  coach?: boolean;
}

export function SessionCard({ s, coach }: Props) {
  const t = today.value;
  const cfg = settings.value;
  const st = cardState(s, t, cfg);
  const [pending, setPending] = useState<{ date: ISODate; warnings: string[] } | null>(null);
  const [shiftOpen, setShiftOpen] = useState(false);

  const shift = diffDays(s.originalDate, s.date);
  const targets = shiftTargets(s, t, cfg.maxShiftDays);
  const active = st !== 'done' && st !== 'missed' && st !== 'skipped';
  const warnings = active ? shiftWarnings(s, s.date, sessions.value, workDays.value, t) : [];
  const sug = coach && active && s.kind === 'run' ? suggestNext(s, sessions.value, cfg) : null;
  const showShift = active && targets.length > 0 && (st === 'toConfirm' || st === 'today' || st === 'overdue' || shiftOpen);

  const tryMove = (d: ISODate) => {
    const w = shiftWarnings(s, d, sessions.value, workDays.value, t);
    if (w.length) setPending({ date: d, warnings: w });
    else doMove(d);
  };
  const doMove = (d: ISODate) => {
    setPending(null);
    setShiftOpen(false);
    void actions.move(s.id, d);
  };
  const done = () => openSheet({ type: s.kind === 'run' ? 'runDone' : 'strength', id: s.id });

  return (
    <article class={`card card--${s.kind} card--${st}`}>
      <div class="card__head">
        <div class="card__icon" aria-hidden="true">{kindEmoji(s)}</div>
        <div class="card__titles">
          <div class="card__when">
            {relLabel(s.date, t)}
            {shift > 0 && <span class="tag">décalée +{shift} j</span>}
          </div>
          <h3 class="card__title">{s.title}</h3>
        </div>
        {st === 'confirmed' && <span class="tag tag--ok">Calée ✓</span>}
        {st === 'done' && <span class="tag tag--ok">Faite ✓</span>}
      </div>

      {st === 'done' ? (
        <p class="card__plan">{logText(s).join(' · ') || 'Bravo, c’est fait.'}</p>
      ) : (
        <p class="card__plan">{planText(s, cfg)}</p>
      )}

      {st === 'overdue' && <p class="hint">Pas encore faite ? Tu peux encore la décaler, rien n’est perdu.</p>}
      {st === 'missed' && <p class="hint hint--calm">Passée. Aucune pénalité, on continue 💚</p>}
      {warnings.map((w) => (
        <p class="hint hint--warn" key={w}>⚠️ {w}</p>
      ))}

      {sug?.changed && (
        <div class="coach">
          <div class="coach__title">🧠 Conseil du coach</div>
          {sug.reasons.map((r) => (
            <p key={r}>{r}</p>
          ))}
          <button class="btn btn--small" onClick={() => actions.applySuggestion(s.id, sug)}>
            Appliquer
          </button>
        </div>
      )}

      {pending ? (
        <div class="confirm">
          <p>
            <strong>{relLabel(pending.date, t)} ?</strong>
          </p>
          {pending.warnings.map((w) => (
            <p class="hint hint--warn" key={w}>⚠️ {w}</p>
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
      ) : (
        <>
          {st === 'toConfirm' && (
            <button class="btn" onClick={() => actions.confirm(s.id)}>
              C’est calé ✓
            </button>
          )}
          {st === 'upcoming' && (
            <button class="btn btn--soft" onClick={() => actions.confirm(s.id)}>
              Caler dès maintenant
            </button>
          )}
          {st === 'today' && (
            <button class="btn" onClick={done}>
              {s.kind === 'run' ? 'C’est fait !' : 'Commencer le renfo'}
            </button>
          )}
          {st === 'overdue' && (
            <button class="btn" onClick={done}>
              Je l’ai faite
            </button>
          )}

          {showShift && (
            <div class="chips" role="group" aria-label="Décaler la séance">
              <span class="chips__label">Décaler :</span>
              {targets.map((d) => (
                <button class="chip" key={d} onClick={() => tryMove(d)}>
                  {d === s.originalDate ? `↩ ${relLabel(d, t)}` : relLabel(d, t)}
                </button>
              ))}
            </div>
          )}

          {(st === 'confirmed' || (st === 'upcoming' && targets.length > 0)) && !shiftOpen && (
            <button class="link" onClick={() => setShiftOpen(true)}>
              Changer de jour
            </button>
          )}
          {st === 'confirmed' && (
            <button class="link" onClick={() => actions.unconfirm(s.id)}>
              Finalement, pas sûr
            </button>
          )}
          {st === 'overdue' && (
            <button class="link" onClick={() => actions.skip(s.id)}>
              Laisser tomber cette fois
            </button>
          )}
        </>
      )}
    </article>
  );
}
