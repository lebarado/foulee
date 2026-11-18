import { Check, Minus, Plus } from 'lucide-preact';
import { useState } from 'preact/hooks';
import { shiftWarnings } from '../domain/cards';
import { EXERCISES, TEMPLATES } from '../domain/catalog';
import { addDays, type ISODate } from '../domain/dates';
import { relLabel } from '../domain/format';
import type { CardTemplate, Session, SessionPlan } from '../domain/types';
import { actions, newId, sessions, settings, today, workDays } from '../data/store';
import { KindIcon } from './icons';
import { Warn } from './ShiftControl';
import { closeSheet, openSheet } from './state';

function Stepper({ label, value, onChange, step = 1, min = 0, max = 999, unit }: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  step?: number;
  min?: number;
  max?: number;
  unit?: string;
}) {
  const set = (n: number) => onChange(Math.min(max, Math.max(min, n)));
  return (
    <div class="stepper">
      <span class="stepper__label">{label}</span>
      <div class="stepper__ctrl">
        <button aria-label={`Moins ${label}`} onClick={() => set(value - step)}>
          <Minus size={20} />
        </button>
        <strong>
          {value}
          {unit && <small> {unit}</small>}
        </strong>
        <button aria-label={`Plus ${label}`} onClick={() => set(value + step)}>
          <Plus size={20} />
        </button>
      </div>
    </div>
  );
}

function Segmented<T extends string>({ value, options, onChange }: {
  value: T;
  options: { id: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div class="seg" role="radiogroup">
      {options.map((o) => (
        <button key={o.id} role="radio" aria-checked={o.id === value} class={o.id === value ? 'seg--on' : ''} onClick={() => onChange(o.id)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

const fromTemplate = (tpl: CardTemplate, date: ISODate): Session => ({
  id: newId(),
  kind: tpl.kind,
  title: tpl.title,
  date,
  originalDate: date,
  status: 'planned',
  plan: structuredClone(tpl.plan),
  source: 'manuel',
});

/** Création et modification d'une carte : tout se règle au pouce, sans clavier sauf pour le titre et les notes. */
export function CardEditor({ id, date: initialDate }: { id?: string; date?: ISODate }) {
  const t = today.value;
  const cfg = settings.value;
  const existing = id ? sessions.value.find((s) => s.id === id) : undefined;
  const [tplId, setTplId] = useState(TEMPLATES[0].id);
  const [s, setS] = useState<Session>(() => existing ?? fromTemplate(TEMPLATES[0], initialDate ?? addDays(t, 1)));
  const plan = s.plan;
  const setPlan = (p: Partial<SessionPlan>) => setS({ ...s, plan: { ...plan, ...p } });

  const pickTemplate = (tpl: CardTemplate) => {
    setTplId(tpl.id);
    setS({ ...fromTemplate(tpl, s.date), id: s.id, plan: { ...structuredClone(tpl.plan), notes: plan.notes } });
  };

  const days = Array.from({ length: 10 }, (_, i) => addDays(t, i));
  if (!days.includes(s.date) && s.date >= t) days.unshift(s.date);
  const warnings = shiftWarnings(s, s.date, sessions.value, workDays.value, t);
  const ceiling = plan.hrCeiling ?? cfg.efHrCeiling;
  const chosen = plan.exercises ?? EXERCISES.map((e) => e.id);

  const save = () => {
    const clean: Session = {
      ...s,
      title: s.title.trim() || (s.kind === 'run' ? 'Course' : 'Renfo'),
      // Une nouvelle date choisie dans l'éditeur devient la nouvelle référence.
      originalDate: existing && existing.date === s.date ? existing.originalDate : s.date,
      plan: {
        ...plan,
        notes: plan.notes?.trim() || undefined,
        hrCeiling: plan.hrCeiling === cfg.efHrCeiling ? undefined : plan.hrCeiling,
        exercises: plan.exercises && plan.exercises.length < EXERCISES.length ? plan.exercises : undefined,
      },
    };
    void actions.saveSession(clean);
    if (existing) openSheet({ type: 'session', id: clean.id });
    else closeSheet();
  };

  return (
    <div class="stack">
      <h2 class="sheet__title">{existing ? 'Modifier la carte' : 'Nouvelle carte'}</h2>

      {!existing && (
        <div class="tiles">
          {TEMPLATES.map((x) => (
            <button key={x.id} class={`tile tile--${x.kind} ${x.id === tplId ? 'tile--on' : ''}`} onClick={() => pickTemplate(x)}>
              <span class="tile__icon">
                <KindIcon kind={x.kind} size={26} />
              </span>
              <strong>{x.title}</strong>
              <small>{x.hint}</small>
            </button>
          ))}
        </div>
      )}

      <label class="field">
        <span>Titre</span>
        <input value={s.title} maxLength={40} onInput={(e) => setS({ ...s, title: (e.target as HTMLInputElement).value })} />
      </label>

      <div class="field">
        <span>Jour</span>
        <div class="chips chips--wrap">
          {days.map((d) => (
            <button key={d} class={`chip ${d === s.date ? 'chip--on' : ''}`} onClick={() => setS({ ...s, date: d })}>
              {relLabel(d, t)}
            </button>
          ))}
        </div>
      </div>
      {warnings.map((w) => (
        <Warn key={w} text={w} />
      ))}

      <div class="panel">
        <Stepper label="Durée" value={plan.durationMin} step={5} min={5} max={180} unit="min" onChange={(n) => setPlan({ durationMin: n })} />

        {s.kind === 'run' && (
          <>
            <Segmented
              value={plan.runWalk ? 'rw' : 'cont'}
              options={[
                { id: 'cont', label: 'En continu' },
                { id: 'rw', label: 'Course + marche' },
              ]}
              onChange={(v) => setPlan({ runWalk: v === 'rw' ? { ...cfg.coach.runWalk } : undefined })}
            />
            {plan.runWalk && (
              <div class="row">
                <Stepper label="Course" value={plan.runWalk.runMin} min={1} max={30} unit="min" onChange={(n) => setPlan({ runWalk: { ...plan.runWalk!, runMin: n } })} />
                <Stepper label="Marche" value={plan.runWalk.walkMin} min={1} max={10} unit="min" onChange={(n) => setPlan({ runWalk: { ...plan.runWalk!, walkMin: n } })} />
              </div>
            )}
            <Stepper label="FC max visée" value={ceiling} min={110} max={190} unit="bpm" onChange={(n) => setPlan({ hrCeiling: n })} />
          </>
        )}

        {s.kind === 'strength' && (
          <>
            <Segmented
              value={String(plan.sets ?? 2) as '2' | '3'}
              options={[
                { id: '2', label: '2 séries' },
                { id: '3', label: '3 séries' },
              ]}
              onChange={(v) => setPlan({ sets: Number(v) })}
            />
            <div class="field">
              <span>Exercices</span>
              <div class="checks">
                {EXERCISES.map((e) => {
                  const on = chosen.includes(e.id);
                  return (
                    <button
                      key={e.id}
                      class={`check ${on ? 'check--on' : ''}`}
                      aria-pressed={on}
                      onClick={() =>
                        setPlan({ exercises: on ? chosen.filter((x) => x !== e.id) : [...chosen, e.id] })
                      }
                    >
                      <span class="check__box">{on && <Check size={16} strokeWidth={3} />}</span>
                      {e.name}
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>

      <label class="field">
        <span>Consignes et détails</span>
        <textarea
          rows={3}
          placeholder="Parcours le long de la Moselle, chaussures neuves, finir par 3 lignes droites…"
          value={plan.notes ?? ''}
          onInput={(e) => setPlan({ notes: (e.target as HTMLTextAreaElement).value })}
        />
      </label>

      <button class="btn btn--big" onClick={save} disabled={s.kind === 'strength' && chosen.length === 0}>
        {existing ? 'Enregistrer' : 'Créer la carte'}
      </button>
    </div>
  );
}
