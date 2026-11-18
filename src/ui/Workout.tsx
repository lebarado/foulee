import { ArrowDown, ArrowUp, ChevronDown, ChevronUp, Plus, Repeat2, Trash2 } from 'lucide-preact';
import { useState } from 'preact/hooks';
import type { SessionKind } from '../domain/types';
import {
  STEP_LABEL,
  measureLabel,
  stepId,
  type Measure,
  type RepeatBlock,
  type StepKind,
  type WorkoutItem,
  type WorkoutStep,
} from '../domain/workout';

/* =========================================================
   Affichage (fiche de séance)
   ========================================================= */

function StepLine({ s, n }: { s: WorkoutStep; n?: number }) {
  return (
    <li class={`wstep wstep--${s.kind}`}>
      {n !== undefined && <span class="wstep__n">{n}</span>}
      <div class="wstep__body">
        <div class="wstep__top">
          <strong>{s.label || STEP_LABEL[s.kind]}</strong>
          <span class="wstep__measure">{measureLabel(s.measure)}</span>
        </div>
        <small>
          {s.label ? STEP_LABEL[s.kind] : ''}
          {s.label && s.target ? ' · ' : ''}
          {s.target}
        </small>
      </div>
    </li>
  );
}

/** Lecture d'une séance structurée : étapes numérotées, blocs « × N ». */
export function WorkoutView({ items }: { items: WorkoutItem[] }) {
  let n = 0;
  return (
    <ol class="wlist">
      {items.map((it) =>
        it.type === 'step' ? (
          <StepLine key={it.id} s={it} n={++n} />
        ) : (
          <li key={it.id} class="wrepeat">
            <div class="wrepeat__head">
              <Repeat2 size={16} /> Répéter <strong>{it.rounds} fois</strong>
            </div>
            <ol class="wlist">
              {it.steps.map((s) => (
                <StepLine key={s.id} s={s} n={++n} />
              ))}
            </ol>
          </li>
        ),
      )}
    </ol>
  );
}

/* =========================================================
   Éditeur (façon Garmin)
   ========================================================= */

const KINDS: StepKind[] = ['warmup', 'work', 'recover', 'rest', 'cooldown'];

function Mini({ value, onChange, step = 1, min = 0, max = 9999, unit }: {
  value: number;
  onChange: (n: number) => void;
  step?: number;
  min?: number;
  max?: number;
  unit: string;
}) {
  const set = (n: number) => onChange(Math.min(max, Math.max(min, n)));
  return (
    <div class="mini">
      <button aria-label={`Moins ${unit}`} onClick={() => set(value - step)}>
        −
      </button>
      <span>
        <strong>{value}</strong> {unit}
      </span>
      <button aria-label={`Plus ${unit}`} onClick={() => set(value + step)}>
        +
      </button>
    </div>
  );
}

function MeasureEditor({ m, onChange, sport }: { m: Measure; onChange: (m: Measure) => void; sport: SessionKind }) {
  const types: { id: Measure['type']; label: string }[] = [
    { id: 'time', label: 'Temps' },
    { id: 'distance', label: 'Distance' },
    { id: 'reps', label: 'Rép.' },
    { id: 'open', label: 'Libre' },
  ];
  const setType = (t: Measure['type']) => {
    if (t === m.type) return;
    if (t === 'time') onChange({ type: 'time', sec: 300 });
    else if (t === 'distance') onChange({ type: 'distance', m: sport === 'swim' ? 100 : 1000 });
    else if (t === 'reps') onChange({ type: 'reps', n: 10 });
    else onChange({ type: 'open' });
  };
  const distStep = sport === 'swim' ? 25 : 100;
  return (
    <>
      <div class="seg seg--small">
        {types.map((t) => (
          <button key={t.id} class={t.id === m.type ? 'seg--on' : ''} onClick={() => setType(t.id)}>
            {t.label}
          </button>
        ))}
      </div>
      {m.type === 'time' && (
        <div class="row">
          <Mini value={Math.floor(m.sec / 60)} unit="min" max={300} onChange={(v) => onChange({ type: 'time', sec: v * 60 + (m.sec % 60) })} />
          <Mini value={m.sec % 60} unit="s" step={5} max={55} onChange={(v) => onChange({ type: 'time', sec: Math.floor(m.sec / 60) * 60 + v })} />
        </div>
      )}
      {m.type === 'distance' && <Mini value={m.m} unit="m" step={distStep} min={distStep} max={100000} onChange={(v) => onChange({ type: 'distance', m: v })} />}
      {m.type === 'reps' && <Mini value={m.n} unit="rép." min={1} max={500} onChange={(v) => onChange({ type: 'reps', n: v })} />}
      {m.type === 'open' && <p class="help">Étape sans durée : tu passes à la suivante quand tu veux (comme le bouton Lap).</p>}
    </>
  );
}

interface RowProps {
  s: WorkoutStep;
  open: boolean;
  onToggle: () => void;
  onChange: (s: WorkoutStep) => void;
  onMove: (dir: -1 | 1) => void;
  onDelete: () => void;
  sport: SessionKind;
}

function StepRow({ s, open, onToggle, onChange, onMove, onDelete, sport }: RowProps) {
  return (
    <div class={`erow wstep--${s.kind} ${open ? 'erow--open' : ''}`}>
      <button class="erow__head" onClick={onToggle} aria-expanded={open}>
        <span class="erow__bar" />
        <span class="erow__title">
          <strong>{s.label || STEP_LABEL[s.kind]}</strong>
          <small>
            {measureLabel(s.measure)}
            {s.target ? ` · ${s.target}` : ''}
          </small>
        </span>
        {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
      </button>
      {open && (
        <div class="erow__body">
          <div class="chips chips--wrap chips--tight">
            {KINDS.map((k) => (
              <button key={k} class={`chip chip--small ${k === s.kind ? 'chip--on' : ''}`} onClick={() => onChange({ ...s, kind: k })}>
                {STEP_LABEL[k]}
              </button>
            ))}
          </div>
          <input
            class="input"
            placeholder="Nom (Pompes, 400 m, Crawl…)"
            value={s.label ?? ''}
            onInput={(e) => onChange({ ...s, label: (e.target as HTMLInputElement).value || undefined })}
          />
          <MeasureEditor m={s.measure} sport={sport} onChange={(measure) => onChange({ ...s, measure })} />
          <input
            class="input"
            placeholder="Cible : FC < 150, RPE 7, allure souple…"
            value={s.target ?? ''}
            onInput={(e) => onChange({ ...s, target: (e.target as HTMLInputElement).value || undefined })}
          />
          <div class="erow__tools">
            <button aria-label="Monter l’étape" onClick={() => onMove(-1)}>
              <ArrowUp size={18} />
            </button>
            <button aria-label="Descendre l’étape" onClick={() => onMove(1)}>
              <ArrowDown size={18} />
            </button>
            <button class="danger" aria-label="Supprimer l’étape" onClick={onDelete}>
              <Trash2 size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const newStep = (kind: StepKind = 'work'): WorkoutStep => ({ id: stepId(), type: 'step', kind, measure: { type: 'time', sec: 300 } });

function move<T>(list: T[], i: number, dir: -1 | 1): T[] {
  const j = i + dir;
  if (j < 0 || j >= list.length) return list;
  const out = [...list];
  [out[i], out[j]] = [out[j], out[i]];
  return out;
}

/** Éditeur d'étapes : étapes, blocs de répétition, mesures (temps, distance, rép., libre), cibles. */
export function WorkoutEditor({ items, onChange, sport }: { items: WorkoutItem[]; onChange: (w: WorkoutItem[]) => void; sport: SessionKind }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const toggle = (id: string) => setOpenId(openId === id ? null : id);

  const setItem = (i: number, it: WorkoutItem) => onChange(items.map((x, j) => (j === i ? it : x)));
  const remove = (i: number) => onChange(items.filter((_, j) => j !== i));

  const add = (it: WorkoutItem, focus: string) => {
    onChange([...items, it]);
    setOpenId(focus);
  };

  return (
    <div class="weditor">
      {items.map((it, i) =>
        it.type === 'step' ? (
          <StepRow
            key={it.id}
            s={it}
            sport={sport}
            open={openId === it.id}
            onToggle={() => toggle(it.id)}
            onChange={(s) => setItem(i, s)}
            onMove={(d) => onChange(move(items, i, d))}
            onDelete={() => remove(i)}
          />
        ) : (
          <RepeatEditor
            key={it.id}
            block={it}
            sport={sport}
            openId={openId}
            toggle={toggle}
            setOpenId={setOpenId}
            onChange={(b) => setItem(i, b)}
            onMove={(d) => onChange(move(items, i, d))}
            onDelete={() => remove(i)}
          />
        ),
      )}
      <div class="row">
        <button
          class="btn btn--soft btn--small"
          onClick={() => {
            const s = newStep();
            add(s, s.id);
          }}
        >
          <Plus size={18} /> Étape
        </button>
        <button
          class="btn btn--soft btn--small"
          onClick={() => {
            const a = newStep('work');
            const b = newStep('recover');
            b.measure = { type: 'time', sec: 60 };
            add({ id: stepId(), type: 'repeat', rounds: 4, steps: [a, b] }, a.id);
          }}
        >
          <Repeat2 size={18} /> Répétition
        </button>
      </div>
    </div>
  );
}

function RepeatEditor({ block, sport, openId, toggle, setOpenId, onChange, onMove, onDelete }: {
  block: RepeatBlock;
  sport: SessionKind;
  openId: string | null;
  toggle: (id: string) => void;
  setOpenId: (id: string) => void;
  onChange: (b: RepeatBlock) => void;
  onMove: (d: -1 | 1) => void;
  onDelete: () => void;
}) {
  const setStep = (i: number, s: WorkoutStep) => onChange({ ...block, steps: block.steps.map((x, j) => (j === i ? s : x)) });
  return (
    <div class="erepeat">
      <div class="erepeat__head">
        <Repeat2 size={18} />
        <span>Répéter</span>
        <Mini value={block.rounds} unit="fois" min={1} max={50} onChange={(rounds) => onChange({ ...block, rounds })} />
        <div class="erow__tools erow__tools--inline">
          <button aria-label="Monter le bloc" onClick={() => onMove(-1)}>
            <ArrowUp size={16} />
          </button>
          <button aria-label="Descendre le bloc" onClick={() => onMove(1)}>
            <ArrowDown size={16} />
          </button>
          <button class="danger" aria-label="Supprimer le bloc" onClick={onDelete}>
            <Trash2 size={16} />
          </button>
        </div>
      </div>
      {block.steps.map((s, i) => (
        <StepRow
          key={s.id}
          s={s}
          sport={sport}
          open={openId === s.id}
          onToggle={() => toggle(s.id)}
          onChange={(x) => setStep(i, x)}
          onMove={(d) => onChange({ ...block, steps: move(block.steps, i, d) })}
          onDelete={() => onChange({ ...block, steps: block.steps.filter((_, j) => j !== i) })}
        />
      ))}
      <button
        class="link"
        onClick={() => {
          const s = newStep();
          onChange({ ...block, steps: [...block.steps, s] });
          setOpenId(s.id);
        }}
      >
        <Plus size={16} /> Étape dans le bloc
      </button>
    </div>
  );
}
