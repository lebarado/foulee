import { Check, Minus, Plus } from 'lucide-preact';
import { useState } from 'preact/hooks';
import { shiftWarnings } from '../domain/cards';
import { EXERCISES } from '../domain/catalog';
import { addDays, type ISODate } from '../domain/dates';
import { relLabel, shortLabel } from '../domain/format';
import { libraryFor } from '../domain/library';
import { SPORTS, sportInfo } from '../domain/sports';
import type { CardTemplate, Session, SessionKind, SessionPlan } from '../domain/types';
import { cloneWorkout, defaultWorkout, workoutStats } from '../domain/workout';
import { actions, newId, sessions, settings, today, workDays } from '../data/store';
import { KindIcon } from './icons';
import { Warn } from './ShiftControl';
import { closeSheet, openSheet } from './state';
import { WorkoutEditor } from './Workout';

export function Stepper({ label, value, onChange, step = 1, min = 0, max = 999, unit }: {
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
          <Minus size={16} strokeWidth={1.75} />
        </button>
        <strong>
          {value}
          {unit && <small> {unit}</small>}
        </strong>
        <button aria-label={`Plus ${label}`} onClick={() => set(value + step)}>
          <Plus size={16} strokeWidth={1.75} />
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

const fromTemplate = (tpl: CardTemplate, date: ISODate, id: string): Session => ({
  id,
  kind: tpl.kind,
  title: tpl.title,
  date,
  originalDate: date,
  status: 'planned',
  plan: {
    ...structuredClone({ ...tpl.plan, workout: undefined }),
    workout: tpl.plan.workout ? cloneWorkout(tpl.plan.workout) : undefined,
    intensity: tpl.intensity,
  },
  source: 'manuel',
});

/** Création et modification d'une séance : sport, modèle, puis réglages au pouce. */
export function CardEditor({ id, date: initialDate }: { id?: string; date?: ISODate }) {
  const t = today.value;
  const cfg = settings.value;
  const existing = id ? sessions.value.find((s) => s.id === id) : undefined;
  const [tplId, setTplId] = useState<string>(existing ? '' : 'run-easy');
  const [s, setS] = useState<Session>(() => existing ?? fromTemplate(libraryFor('run')[0], initialDate ?? addDays(t, 1), newId()));
  const plan = s.plan;
  const setPlan = (p: Partial<SessionPlan>) => setS({ ...s, plan: { ...plan, ...p } });

  const pickTemplate = (tpl: CardTemplate) => {
    setTplId(tpl.id);
    const base = fromTemplate(tpl, s.date, s.id);
    setS({ ...base, plan: { ...base.plan, notes: plan.notes } });
  };
  const pickSport = (k: SessionKind) => pickTemplate(libraryFor(k)[0]);

  const days = Array.from({ length: 14 }, (_, i) => addDays(t, i));
  if (!days.includes(s.date) && s.date >= t) days.unshift(s.date);
  const warnings = shiftWarnings(s, s.date, sessions.value, workDays.value, t);
  if (plan.intensity === 'intense' && s.kind === 'run' && s.date < cfg.noIntensityUntil)
    warnings.push(`Séance intense : tes principes disent pas de fractionné avant le ${shortLabel(cfg.noIntensityUntil)} Garde l’EF d’ici là.`);
  const ceiling = plan.hrCeiling ?? cfg.efHrCeiling;
  const chosen = plan.exercises ?? EXERCISES.map((e) => e.id);
  const stats = plan.workout ? workoutStats(plan.workout) : null;
  const autoDuration = stats && !stats.partial;

  const setWorkout = (workout: SessionPlan['workout']) => {
    const st = workout ? workoutStats(workout) : null;
    setPlan({ workout, ...(st && !st.partial && st.sec > 0 ? { durationMin: Math.round(st.sec / 60) } : {}) });
  };

  const save = () => {
    const clean: Session = {
      ...s,
      title: s.title.trim() || sportInfo(s.kind).short,
      // Une nouvelle date choisie dans l'éditeur devient la nouvelle référence.
      originalDate: existing && existing.date === s.date ? existing.originalDate : s.date,
      plan: {
        ...plan,
        notes: plan.notes?.trim() || undefined,
        hrCeiling: plan.hrCeiling === cfg.efHrCeiling ? undefined : plan.hrCeiling,
        exercises: plan.exercises && plan.exercises.length < EXERCISES.length ? plan.exercises : undefined,
        workout: plan.workout?.length ? plan.workout : undefined,
      },
    };
    void actions.saveSession(clean);
    if (existing) openSheet({ type: 'session', id: clean.id });
    else closeSheet();
  };

  return (
    <div class="stack">
      <h2 class="sheet__title">{existing ? 'Modifier la séance' : 'Nouvelle séance'}</h2>

      {!existing && (
        <>
          <div class="sports" role="radiogroup" aria-label="Sport">
            {SPORTS.map((sp) => (
              <button
                key={sp.id}
                role="radio"
                aria-checked={sp.id === s.kind}
                class={`sport ${sp.id === s.kind ? 'sport--on' : ''}`}
                onClick={() => pickSport(sp.id)}
              >
                <KindIcon kind={sp.id} size={20} />
                <small>{sp.label}</small>
              </button>
            ))}
          </div>

          <div class="field">
            <span>Modèle</span>
            <div class="list">
              {libraryFor(s.kind).map((x) => (
                <button key={x.id} class="row" onClick={() => pickTemplate(x)} aria-pressed={x.id === tplId}>
                  <span class="row__main">
                    <span class="row__title">{x.title}</span>
                    <span class="row__meta" style={{ display: 'block' }}>
                      {x.hint}
                    </span>
                  </span>
                  <span class={`lib__int ${x.intensity === 'intense' ? 'lib__int--intense' : ''}`}>{x.intensity}</span>
                  <span style={{ width: '18px' }}>{x.id === tplId && <Check size={18} strokeWidth={2} class="lib__check" />}</span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      <label class="field">
        <span>Titre</span>
        <input value={s.title} maxLength={40} onInput={(e) => setS({ ...s, title: (e.target as HTMLInputElement).value })} />
      </label>

      <div class="field">
        <span>Jour</span>
        <div class="chips chips--scroll">
          {days.map((d) => (
            <button key={d} class={`chip ${d === s.date ? 'chip--on' : ''}`} onClick={() => setS({ ...s, date: d })}>
              {relLabel(d, t)}
            </button>
          ))}
        </div>
        {warnings.map((w) => (
          <Warn key={w} text={w} />
        ))}
      </div>

      <div class="field">
        <span>Réglages</span>
        <div class="list">
          {autoDuration ? (
            <div class="stepper">
              <span class="stepper__label">Durée</span>
              <span class="stepper__auto">{plan.durationMin} min, calculée</span>
            </div>
          ) : (
            <Stepper label={stats ? 'Durée estimée' : 'Durée'} value={plan.durationMin} step={5} min={5} max={300} unit="min" onChange={(n) => setPlan({ durationMin: n })} />
          )}

          {s.kind === 'run' && !plan.workout && (
            <div class="pad">
              <Segmented
                value={plan.runWalk ? 'rw' : 'cont'}
                options={[
                  { id: 'cont', label: 'En continu' },
                  { id: 'rw', label: 'Course + marche' },
                ]}
                onChange={(v) => setPlan({ runWalk: v === 'rw' ? { ...cfg.coach.runWalk } : undefined })}
              />
            </div>
          )}
          {s.kind === 'run' && !plan.workout && plan.runWalk && (
            <Stepper label="Course" value={plan.runWalk.runMin} min={1} max={30} unit="min" onChange={(n) => setPlan({ runWalk: { ...plan.runWalk!, runMin: n } })} />
          )}
          {s.kind === 'run' && !plan.workout && plan.runWalk && (
            <Stepper label="Marche" value={plan.runWalk.walkMin} min={1} max={10} unit="min" onChange={(n) => setPlan({ runWalk: { ...plan.runWalk!, walkMin: n } })} />
          )}
          {s.kind === 'run' && (
            <Stepper label="FC max visée" value={ceiling} min={110} max={190} unit="bpm" onChange={(n) => setPlan({ hrCeiling: n })} />
          )}
          {s.kind === 'strength' && !plan.workout && (
            <div class="pad">
              <Segmented
                value={String(plan.sets ?? 2) as '2' | '3'}
                options={[
                  { id: '2', label: '2 séries' },
                  { id: '3', label: '3 séries' },
                ]}
                onChange={(v) => setPlan({ sets: Number(v) })}
              />
            </div>
          )}
        </div>
      </div>

      {s.kind === 'strength' && !plan.workout && (
        <div class="field">
          <span>Exercices</span>
          <div class="list">
            {EXERCISES.map((e) => {
              const on = chosen.includes(e.id);
              return (
                <button
                  key={e.id}
                  class="check-row"
                  aria-pressed={on}
                  onClick={() => setPlan({ exercises: on ? chosen.filter((x) => x !== e.id) : [...chosen, e.id] })}
                >
                  <span class={`tick ${on ? 'tick--on' : ''}`}>{on && <Check size={14} strokeWidth={2.5} />}</span>
                  {e.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div class="field">
        <span>
          Étapes
          {stats ? ` · ${stats.steps}${stats.meters > 0 ? ` · ${stats.meters} m` : ''}` : ''}
        </span>
        {plan.workout ? (
          <>
            <WorkoutEditor items={plan.workout} sport={s.kind} onChange={setWorkout} />
            <button class="link link--quiet" onClick={() => setPlan({ workout: undefined })}>
              Revenir à une séance simple
            </button>
          </>
        ) : (
          <button class="link" onClick={() => setWorkout(defaultWorkout(plan.durationMin))}>
            Détailler la séance : étapes, tours, repos
          </button>
        )}
      </div>

      <label class="field">
        <span>Consignes</span>
        <textarea
          rows={3}
          placeholder="Parcours le long de la Moselle, bassin de 25 m…"
          value={plan.notes ?? ''}
          onInput={(e) => setPlan({ notes: (e.target as HTMLTextAreaElement).value })}
        />
      </label>

      <button class="btn btn--block" onClick={save} disabled={s.kind === 'strength' && !plan.workout && chosen.length === 0}>
        {existing ? 'Enregistrer' : 'Créer la séance'}
      </button>
    </div>
  );
}
