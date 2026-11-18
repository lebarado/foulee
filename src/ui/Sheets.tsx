import type { ComponentChildren } from 'preact';
import { Check, ChevronLeft, TriangleAlert, X } from 'lucide-preact';
import { useEffect, useState } from 'preact/hooks';
import { exerciseDose } from '../domain/catalog';
import { rpeLabel } from '../domain/format';
import { sportInfo } from '../domain/sports';
import type { Session, SessionLog } from '../domain/types';
import { actions, sessions } from '../data/store';
import { CardEditor } from './CardEditor';
import { LevelSheet } from './LevelSheet';
import { SessionDetail } from './SessionDetail';
import { closeSheet, sheet } from './state';
import { sessionExercises } from './text';

export function SheetHost() {
  const st = sheet.value;
  if (!st) return null;
  const id = 'id' in st ? st.id : undefined;
  const s = id ? sessions.value.find((x) => x.id === id) : undefined;
  if (id && !s && st.type !== 'edit') return null;
  return (
    <Sheet key={`${st.type}-${id ?? ''}`}>
      {st.type === 'runDone' && s && <RunDone s={s} />}
      {st.type === 'strength' && s && <StrengthRun s={s} />}
      {st.type === 'session' && s && <SessionDetail s={s} />}
      {st.type === 'edit' && <CardEditor id={st.id} date={st.date} />}
      {st.type === 'level' && <LevelSheet />}
    </Sheet>
  );
}

function Sheet({ children }: { children: ComponentChildren }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closeSheet();
    window.addEventListener('keydown', onKey);
    document.body.classList.add('no-scroll');
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.classList.remove('no-scroll');
    };
  }, []);
  return (
    <div class="overlay" onClick={(e) => e.target === e.currentTarget && closeSheet()}>
      <div class="sheet" role="dialog" aria-modal="true">
        <div class="sheet__handle" />
        <button class="icon-btn sheet__close" aria-label="Fermer" onClick={closeSheet}>
          <X size={20} strokeWidth={1.75} />
        </button>
        {children}
      </div>
    </div>
  );
}

/* ---------- Échelles 0–10 ---------- */

function Scale({ label, value, min, max, onChange, describe, ends }: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (n: number) => void;
  describe?: (n: number) => string;
  ends?: [string, string];
}) {
  return (
    <div class="field">
      <span>{label}</span>
      <div class="list scale">
        <div class="scale__value">
          <strong>{value}</strong>
          <span>sur 10{describe ? ` · ${describe(value)}` : ''}</span>
        </div>
        <input
          type="range"
          min={min}
          max={max}
          step={1}
          value={value}
          aria-label={label}
          onInput={(e) => onChange(Number((e.target as HTMLInputElement).value))}
        />
        {ends && (
          <div class="scale__ends">
            <span>{ends[0]}</span>
            <span>{ends[1]}</span>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- Séance faite ---------- */

const num = (v: string) => {
  const n = Number(v.replace(',', '.'));
  return v.trim() && Number.isFinite(n) && n > 0 ? n : undefined;
};

function RunDone({ s }: { s: Session }) {
  const [rpe, setRpe] = useState(s.log?.rpe ?? 4);
  const [more, setMore] = useState(false);
  const [f, setF] = useState({ min: '', sec: '', km: '', avg: '', max: '', cad: '', notes: '' });
  const field = (k: keyof typeof f) => ({
    value: f[k],
    onInput: (e: Event) => setF({ ...f, [k]: (e.target as HTMLInputElement).value }),
  });

  const unit = sportInfo(s.kind).distanceUnit;
  const save = () => {
    const min = num(f.min) ?? 0;
    const sec = num(f.sec) ?? 0;
    const dist = num(f.km);
    const log: SessionLog = {
      rpe,
      durationSec: min * 60 + sec || undefined,
      distanceKm: dist !== undefined && unit === 'm' ? dist / 1000 : dist,
      avgHr: num(f.avg),
      maxHr: num(f.max),
      cadence: num(f.cad),
      notes: f.notes.trim() || undefined,
    };
    for (const k of Object.keys(log) as (keyof SessionLog)[]) if (log[k] === undefined) delete log[k];
    closeSheet();
    void actions.markDone(s.id, log);
  };

  return (
    <div class="stack">
      <div>
        <h2 class="sheet__title">{s.title}</h2>
        <p class="detail__summary">Comment ça s’est passé ?</p>
      </div>

      <Scale label="Ressenti" value={rpe} min={1} max={10} onChange={setRpe} describe={rpeLabel} ends={['Facile', 'Très dur']} />

      {!more ? (
        <button class="link" onClick={() => setMore(true)}>
          Ajouter les chiffres de la montre
        </button>
      ) : (
        <>
          <div class="grid-2">
            <label class="field">
              <span>Minutes</span>
              <input inputMode="numeric" placeholder="26" {...field('min')} />
            </label>
            <label class="field">
              <span>Secondes</span>
              <input inputMode="numeric" placeholder="36" {...field('sec')} />
            </label>
          </div>
          {unit && (
            <label class="field">
              <span>Distance ({unit})</span>
              <input inputMode="decimal" placeholder={unit === 'm' ? '1000' : '3,4'} {...field('km')} />
            </label>
          )}
          <div class="grid-2">
            <label class="field">
              <span>FC moyenne</span>
              <input inputMode="numeric" placeholder="145" {...field('avg')} />
            </label>
            <label class="field">
              <span>FC max</span>
              <input inputMode="numeric" placeholder="165" {...field('max')} />
            </label>
          </div>
          {(s.kind === 'run' || s.kind === 'bike') && (
            <label class="field">
              <span>Cadence ({s.kind === 'run' ? 'pas/min' : 'tr/min'})</span>
              <input inputMode="numeric" placeholder={s.kind === 'run' ? '160' : '85'} {...field('cad')} />
            </label>
          )}
          <label class="field">
            <span>Notes</span>
            <textarea rows={2} placeholder="Jambes lourdes, vent de face…" {...field('notes')} />
          </label>
        </>
      )}

      <button class="btn btn--block" onClick={save}>
        Enregistrer
      </button>
    </div>
  );
}

/* ---------- Renfo guidé ---------- */

function StrengthRun({ s }: { s: Session }) {
  const setsCount = s.plan.sets ?? 2;
  const list = sessionExercises(s);
  const [idx, setIdx] = useState(0);
  const [sets, setSets] = useState<Record<string, boolean[]>>(
    () => s.log?.sets ?? Object.fromEntries(list.map((e) => [e.id, Array(setsCount).fill(false)])),
  );
  const [pain, setPain] = useState(0);
  const [rpe, setRpe] = useState(4);
  const last = idx === list.length;
  const ex = list[idx];

  const toggle = (id: string, i: number) => setSets({ ...sets, [id]: sets[id].map((v, j) => (j === i ? !v : v)) });

  const finish = () => {
    closeSheet();
    void actions.markDone(s.id, { sets, pain, rpe });
  };

  return (
    <div class="stack">
      {!last && ex ? (
        <>
          <div>
            <p class="counter">
              Exercice {idx + 1} sur {list.length}
            </p>
            <h2 class="sheet__title">{ex.name}</h2>
            <p class="dose">{exerciseDose(ex, setsCount)}</p>
          </div>
          <div class="list">
            <ul class="tips">
              {ex.tempo && <li>Tempo : {ex.tempo}</li>}
              {ex.cues.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          </div>
          <div class="sets">
            {sets[ex.id].map((v, i) => (
              <button key={i} class={`set ${v ? 'set--on' : ''}`} aria-pressed={v} onClick={() => toggle(ex.id, i)}>
                {v ? <Check size={22} strokeWidth={2.25} /> : `Série ${i + 1}`}
              </button>
            ))}
          </div>
          <p class="help">Douleur au-dessus de 3 sur 10 : arrête cet exercice et passe au suivant.</p>
        </>
      ) : (
        <>
          <h2 class="sheet__title">Fin de séance</h2>
          <Scale label="Douleur maximale" value={pain} min={0} max={10} onChange={setPain} />
          {pain > 3 && (
            <p class="note note--warn">
              <TriangleAlert size={14} strokeWidth={1.75} /> Au-dessus de 3 sur 10 : allège la prochaine fois. Si ça persiste, consulte.
            </p>
          )}
          <Scale label="Ressenti global" value={rpe} min={1} max={10} onChange={setRpe} describe={rpeLabel} />
        </>
      )}

      <div class="row-actions">
        {idx > 0 && (
          <button class="btn btn--secondary" style={{ flex: '0 0 56px', padding: 0 }} aria-label="Exercice précédent" onClick={() => setIdx(idx - 1)}>
            <ChevronLeft size={20} strokeWidth={1.75} />
          </button>
        )}
        {last ? (
          <button class="btn" onClick={finish}>
            Terminer
          </button>
        ) : (
          <button class="btn" onClick={() => setIdx(idx + 1)}>
            Suivant
          </button>
        )}
      </div>
    </div>
  );
}
