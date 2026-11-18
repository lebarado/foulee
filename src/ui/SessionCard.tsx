import { Brain, Check, ChevronRight, StickyNote } from 'lucide-preact';
import { cardState, shiftWarnings } from '../domain/cards';
import { suggestNext } from '../domain/coach';
import { diffDays } from '../domain/dates';
import { relLabel } from '../domain/format';
import type { Session } from '../domain/types';
import { actions, sessions, settings, today, workDays } from '../data/store';
import { KindIcon } from './icons';
import { ShiftControl, Warn } from './ShiftControl';
import { openSheet } from './state';
import { isGuidedStrength, logText, planText } from './text';

interface Props {
  s: Session;
  /** Afficher le conseil du coach (pour la prochaine sortie). */
  coach?: boolean;
  /** Séance principale de l'écran : gros bouton « Fait » en plus du rond. */
  primary?: boolean;
}

export const openDone = (s: Session) => openSheet({ type: isGuidedStrength(s) ? 'strength' : 'runDone', id: s.id });

/** Carte compacte. Un toucher n'importe où (hors boutons) ouvre le détail. */
export function SessionCard({ s, coach, primary }: Props) {
  const t = today.value;
  const cfg = settings.value;
  const st = cardState(s, t, cfg);
  const shift = diffDays(s.originalDate, s.date);
  const active = st === 'today' || st === 'soon' || st === 'overdue';
  const warnings = active ? shiftWarnings(s, s.date, sessions.value, workDays.value, t) : [];
  const sug = coach && active && s.kind === 'run' && !s.plan.workout ? suggestNext(s, sessions.value, cfg) : null;

  const open = (e: MouseEvent) => {
    if ((e.target as HTMLElement).closest('button, a, input, label')) return;
    openSheet({ type: 'session', id: s.id });
  };

  return (
    <article class={`card card--${s.kind} card--${st}`} onClick={open}>
      <div class="card__head">
        <div class="card__icon" aria-hidden="true">
          <KindIcon kind={s.kind} />
        </div>
        <div class="card__titles">
          <div class="card__when">
            {relLabel(s.date, t)}
            {shift > 0 && <span class="tag">décalée +{shift} j</span>}
          </div>
          <h3 class="card__title">{s.title}</h3>
        </div>
        {st === 'done' ? (
          <span class="card__check card__check--done" aria-label="Faite">
            <Check size={20} strokeWidth={3} />
          </span>
        ) : active ? (
          <button class="card__check" aria-label={`Marquer « ${s.title} » comme faite`} onClick={() => openDone(s)}>
            <Check size={20} strokeWidth={3} />
          </button>
        ) : (
          <ChevronRight size={22} class="card__chev" aria-hidden="true" />
        )}
      </div>

      <p class="card__plan">{st === 'done' ? logText(s).join(' · ') || 'Bravo, c’est fait.' : planText(s, cfg)}</p>
      {s.plan.notes && st !== 'done' && (
        <p class="card__note">
          <StickyNote size={15} /> {s.plan.notes}
        </p>
      )}

      {st === 'overdue' && <p class="hint">Pas encore faite ? Tu peux encore la décaler, rien n’est perdu.</p>}
      {st === 'missed' && <p class="hint hint--calm">Passée. Aucune pénalité, on continue.</p>}
      {warnings.map((w) => (
        <Warn key={w} text={w} />
      ))}

      {sug?.changed && (
        <div class="coach">
          <div class="coach__title">
            <Brain size={16} /> Conseil du coach
          </div>
          {sug.reasons.map((r) => (
            <p key={r}>{r}</p>
          ))}
          <button class="btn btn--small" onClick={() => actions.applySuggestion(s.id, sug)}>
            Appliquer
          </button>
        </div>
      )}

      {active && (
        <>
          {primary && (
            <button class="btn" onClick={() => openDone(s)}>
              <Check size={20} strokeWidth={3} /> Fait
            </button>
          )}
          <ShiftControl s={s} />
        </>
      )}
      {st === 'overdue' && (
        <button class="link" onClick={() => actions.skip(s.id)}>
          Laisser tomber cette fois
        </button>
      )}
    </article>
  );
}
