import { Check, ChevronRight } from 'lucide-preact';
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
  /** Action principale de la vue : bouton « Fait » plein. */
  primary?: boolean;
}

export const openDone = (s: Session) => openSheet({ type: isGuidedStrength(s) ? 'strength' : 'runDone', id: s.id });

/** Séance en ligne de liste. Le rond = « Fait » ; un toucher ailleurs ouvre le détail. */
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

  const meta = [relLabel(s.date, t), st === 'done' ? logText(s).join(' · ') : planText(s, cfg)].filter(Boolean).join(' · ');

  return (
    <article class={`session session--${st}`} onClick={open}>
      {active ? (
        <button class="check" aria-label={`Marquer « ${s.title} » comme faite`} onClick={() => openDone(s)} />
      ) : st === 'done' ? (
        <span class="check check--done" aria-label="Faite">
          <Check size={14} strokeWidth={3} />
        </span>
      ) : (
        <span class={`check ${st === 'missed' ? 'check--off' : ''}`} aria-hidden="true" />
      )}

      <div class="session__body">
        <div class="session__top">
          <h3 class="session__title">{s.title}</h3>
          <ChevronRight size={18} strokeWidth={1.75} class="row__chev" aria-hidden="true" />
        </div>
        <div class="session__meta">
          <KindIcon kind={s.kind} size={14} />
          <span>
            {meta}
            {shift > 0 && ` · décalée de ${shift} j`}
          </span>
        </div>

        {s.plan.notes && st !== 'done' && <p class="session__notes">{s.plan.notes}</p>}
        {st === 'overdue' && <p class="note">Pas encore faite. Tu peux encore la décaler.</p>}
        {st === 'missed' && <p class="note">Passée, sans pénalité.</p>}
        {warnings.map((w) => (
          <Warn key={w} text={w} />
        ))}

        {sug?.changed && (
          <div class="coach">
            <p class="coach__title">Conseil du coach</p>
            {sug.reasons.map((r) => (
              <p key={r}>{r}</p>
            ))}
            <button class="link" onClick={() => actions.applySuggestion(s.id, sug)}>
              Appliquer
            </button>
          </div>
        )}

        {active && primary && (
          <button class="btn btn--block session__primary" onClick={() => openDone(s)}>
            Fait
          </button>
        )}
        {active && <ShiftControl s={s} />}
        {st === 'overdue' && (
          <button class="link link--quiet" onClick={() => actions.skip(s.id)}>
            Laisser tomber cette fois
          </button>
        )}
      </div>
    </article>
  );
}
