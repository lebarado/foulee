import type { ComponentChildren } from 'preact';
import { Check, ChevronDown, ChevronLeft, ChevronRight, Timer, TriangleAlert, X } from 'lucide-preact';
import { useEffect, useState } from 'preact/hooks';
import { exerciseDose } from '../domain/catalog';
import { rpeLabel } from '../domain/format';
import type { Session, SessionLog } from '../domain/types';
import { actions, sessions } from '../data/store';
import { CardEditor } from './CardEditor';
import { RpeIcon } from './icons';
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
        <button class="sheet__close" aria-label="Fermer" onClick={closeSheet}>
          <X size={20} />
        </button>
        {children}
      </div>
    </div>
  );
}

/* ---------- Ressenti ---------- */

function RpePicker({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div class="rpe">
      <div class="rpe__value">
        <span class="rpe__num">{value}</span>/10
        <span class="rpe__label">
          <RpeIcon value={value} size={22} /> {rpeLabel(value)}
        </span>
      </div>
      <input
        type="range"
        min={1}
        max={10}
        step={1}
        value={value}
        aria-label="Ressenti sur 10"
        onInput={(e) => onChange(Number((e.target as HTMLInputElement).value))}
      />
      <div class="rpe__scale">
        <span>Facile</span>
        <span>Très dur</span>
      </div>
    </div>
  );
}

/* ---------- Sortie faite ---------- */

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

  const save = () => {
    const min = num(f.min) ?? 0;
    const sec = num(f.sec) ?? 0;
    const log: SessionLog = {
      rpe,
      durationSec: min * 60 + sec || undefined,
      distanceKm: num(f.km),
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
      <h2 class="sheet__title">Bravo !</h2>
      <p class="muted">Comment tu t’es senti ?</p>
      <RpePicker value={rpe} onChange={setRpe} />

      {!more ? (
        <button class="link" onClick={() => setMore(true)}>
          <ChevronDown size={16} /> Ajouter les chiffres de la montre (+5 XP)
        </button>
      ) : (
        <div class="form">
          <label>
            Durée
            <div class="row">
              <input inputMode="numeric" placeholder="min" {...field('min')} />
              <input inputMode="numeric" placeholder="s" {...field('sec')} />
            </div>
          </label>
          <label>
            Distance (km)
            <input inputMode="decimal" placeholder="3,4" {...field('km')} />
          </label>
          <div class="row">
            <label>
              FC moy
              <input inputMode="numeric" placeholder="145" {...field('avg')} />
            </label>
            <label>
              FC max
              <input inputMode="numeric" placeholder="165" {...field('max')} />
            </label>
          </div>
          <label>
            Cadence (pas/min)
            <input inputMode="numeric" placeholder="160" {...field('cad')} />
          </label>
          <label>
            Notes
            <textarea rows={2} placeholder="Jambes lourdes, belle lumière…" {...field('notes')} />
          </label>
        </div>
      )}

      <button class="btn btn--big" onClick={save}>
        Valider
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
      <div class="dots" aria-label={`Étape ${idx + 1} sur ${list.length + 1}`}>
        {[...list, null].map((e, i) => (
          <span key={i} class={`dot ${i === idx ? 'dot--on' : ''} ${e && sets[e.id]?.every(Boolean) ? 'dot--done' : ''}`} />
        ))}
      </div>

      {!last && ex ? (
        <>
          <p class="muted">
            Exercice {idx + 1}/{list.length}
          </p>
          <h2 class="sheet__title">{ex.name}</h2>
          <p class="dose">{exerciseDose(ex, setsCount)}</p>
          {ex.tempo && (
            <p class="tempo">
              <Timer size={16} /> {ex.tempo}
            </p>
          )}
          <ul class="cues">
            {ex.cues.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
          <div class="sets">
            {sets[ex.id].map((v, i) => (
              <button key={i} class={`set ${v ? 'set--on' : ''}`} aria-pressed={v} onClick={() => toggle(ex.id, i)}>
                {v ? <Check size={30} strokeWidth={3} /> : `Série ${i + 1}`}
              </button>
            ))}
          </div>
          <p class="hint hint--calm">Douleur au-dessus de 3/10 ? Stop sur cet exercice, passe au suivant.</p>
        </>
      ) : (
        <>
          <h2 class="sheet__title">Dernière étape</h2>
          <p class="muted">Douleur max ressentie</p>
          <div class="rpe">
            <div class="rpe__value">
              <span class="rpe__num">{pain}</span>/10
            </div>
            <input
              type="range"
              min={0}
              max={10}
              step={1}
              value={pain}
              aria-label="Douleur sur 10"
              onInput={(e) => setPain(Number((e.target as HTMLInputElement).value))}
            />
          </div>
          {pain > 3 && (
            <p class="hint hint--warn">
              <TriangleAlert size={16} /> Au-dessus de 3/10 : allège la prochaine fois. Si ça persiste, consulte.
            </p>
          )}
          <p class="muted">Ressenti global</p>
          <RpePicker value={rpe} onChange={setRpe} />
        </>
      )}

      <div class="row">
        {idx > 0 && (
          <button class="btn btn--ghost btn--icon" aria-label="Exercice précédent" onClick={() => setIdx(idx - 1)}>
            <ChevronLeft size={22} />
          </button>
        )}
        {last ? (
          <button class="btn btn--big" onClick={finish}>
            Terminer
          </button>
        ) : (
          <button class="btn btn--big" onClick={() => setIdx(idx + 1)}>
            Suivant <ChevronRight size={20} />
          </button>
        )}
      </div>
    </div>
  );
}
