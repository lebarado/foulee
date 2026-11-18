import type { ComponentChildren } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { shiftWarnings } from '../domain/cards';
import { EXERCISES, TEMPLATES, exerciseDose } from '../domain/catalog';
import { addDays, type ISODate } from '../domain/dates';
import { relLabel, rpeLabel } from '../domain/format';
import type { CardTemplate, Session, SessionLog } from '../domain/types';
import { actions, sessions, settings, today, workDays } from '../data/store';
import { SessionCard } from './SessionCard';
import { closeSheet, sheet } from './state';
import { planText } from './text';

export function SheetHost() {
  const st = sheet.value;
  if (!st) return null;
  const s = 'id' in st ? sessions.value.find((x) => x.id === st.id) : undefined;
  if ('id' in st && !s) return null;
  return (
    <Sheet>
      {st.type === 'runDone' && s && <RunDone s={s} />}
      {st.type === 'strength' && s && <StrengthRun s={s} />}
      {st.type === 'session' && s && <SessionDetail s={s} />}
      {st.type === 'new' && <NewCard initialDate={st.date} />}
    </Sheet>
  );
}

function Sheet({ children }: { children: ComponentChildren }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closeSheet();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  return (
    <div class="overlay" onClick={(e) => e.target === e.currentTarget && closeSheet()}>
      <div class="sheet" role="dialog" aria-modal="true">
        <div class="sheet__handle" />
        <button class="sheet__close" aria-label="Fermer" onClick={closeSheet}>
          ✕
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
        <span class="rpe__num">{value}</span>/10 · {rpeLabel(value)}
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
      <h2 class="sheet__title">Bravo ! 🎉</h2>
      <p class="muted">Comment tu t’es senti ?</p>
      <RpePicker value={rpe} onChange={setRpe} />

      {!more ? (
        <button class="link" onClick={() => setMore(true)}>
          + Ajouter les chiffres de la montre (facultatif)
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
  const [idx, setIdx] = useState(0);
  const [sets, setSets] = useState<Record<string, boolean[]>>(
    () => s.log?.sets ?? Object.fromEntries(EXERCISES.map((e) => [e.id, Array(setsCount).fill(false)])),
  );
  const [pain, setPain] = useState(0);
  const [rpe, setRpe] = useState(4);
  const last = idx === EXERCISES.length;
  const ex = EXERCISES[idx];

  const toggle = (id: string, i: number) =>
    setSets({ ...sets, [id]: sets[id].map((v, j) => (j === i ? !v : v)) });

  const finish = () => {
    closeSheet();
    void actions.markDone(s.id, { sets, pain, rpe });
  };

  return (
    <div class="stack">
      <div class="dots" aria-label={`Étape ${idx + 1} sur ${EXERCISES.length + 1}`}>
        {[...EXERCISES, null].map((e, i) => (
          <span
            key={i}
            class={`dot ${i === idx ? 'dot--on' : ''} ${e && sets[e.id].every(Boolean) ? 'dot--done' : ''}`}
          />
        ))}
      </div>

      {!last && ex ? (
        <>
          <p class="muted">
            Exercice {idx + 1}/{EXERCISES.length}
          </p>
          <h2 class="sheet__title">{ex.name}</h2>
          <p class="dose">{exerciseDose(ex, setsCount)}</p>
          {ex.tempo && <p class="tempo">⏱ {ex.tempo}</p>}
          <ul class="cues">
            {ex.cues.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
          <div class="sets">
            {sets[ex.id].map((v, i) => (
              <button
                key={i}
                class={`set ${v ? 'set--on' : ''}`}
                aria-pressed={v}
                onClick={() => toggle(ex.id, i)}
              >
                {v ? '✓' : `Série ${i + 1}`}
              </button>
            ))}
          </div>
          <p class="hint hint--calm">Douleur au-dessus de 3/10 ? Stop sur cet exercice, passe au suivant.</p>
        </>
      ) : (
        <>
          <h2 class="sheet__title">Dernière étape 💪</h2>
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
          {pain > 3 && <p class="hint hint--warn">⚠️ Au-dessus de 3/10 : allège la prochaine fois. Si ça persiste, consulte.</p>}
          <p class="muted">Ressenti global</p>
          <RpePicker value={rpe} onChange={setRpe} />
        </>
      )}

      <div class="row">
        {idx > 0 && (
          <button class="btn btn--ghost" onClick={() => setIdx(idx - 1)}>
            ←
          </button>
        )}
        {last ? (
          <button class="btn btn--big" onClick={finish}>
            Terminer
          </button>
        ) : (
          <button class="btn btn--big" onClick={() => setIdx(idx + 1)}>
            Suivant →
          </button>
        )}
      </div>
    </div>
  );
}

/* ---------- Détail d'une carte (depuis le planning) ---------- */

function gcalLink(s: Session, detail: string): string {
  const d = s.date.replace(/-/g, '');
  const end = addDays(s.date, 1).replace(/-/g, '');
  const p = new URLSearchParams({ action: 'TEMPLATE', text: `Foulée · ${s.title}`, dates: `${d}/${end}`, details: detail });
  return `https://calendar.google.com/calendar/render?${p.toString()}`;
}

function SessionDetail({ s }: { s: Session }) {
  const removable = s.status !== 'done';
  return (
    <div class="stack">
      <SessionCard s={s} coach />
      {s.log?.notes && <p class="muted">📝 {s.log.notes}</p>}
      <div class="row">
        <a class="btn btn--ghost" href={gcalLink(s, planText(s, settings.value))} target="_blank" rel="noopener">
          📅 Google Agenda
        </a>
        {removable && (
          <button
            class="btn btn--ghost"
            onClick={() => {
              if (confirm('Supprimer cette carte ?')) {
                closeSheet();
                void actions.remove(s.id);
              }
            }}
          >
            🗑 Supprimer
          </button>
        )}
      </div>
    </div>
  );
}

/* ---------- Nouvelle carte ---------- */

function NewCard({ initialDate }: { initialDate?: ISODate }) {
  const t = today.value;
  const [tpl, setTpl] = useState<CardTemplate>(TEMPLATES[0]);
  const [date, setDate] = useState<ISODate>(initialDate ?? addDays(t, 1));
  const days = Array.from({ length: 8 }, (_, i) => addDays(t, i));
  const draft: Session = { id: 'draft', kind: tpl.kind, title: tpl.title, date, originalDate: date, status: 'planned', plan: tpl.plan };
  const warnings = shiftWarnings(draft, date, sessions.value, workDays.value, t);

  return (
    <div class="stack">
      <h2 class="sheet__title">Nouvelle carte</h2>
      <div class="tiles">
        {TEMPLATES.map((x) => (
          <button key={x.id} class={`tile tile--${x.kind} ${x.id === tpl.id ? 'tile--on' : ''}`} onClick={() => setTpl(x)}>
            <span class="tile__emoji">{x.kind === 'run' ? '🏃' : '💪'}</span>
            <strong>{x.title}</strong>
            <small>{x.hint}</small>
          </button>
        ))}
      </div>
      <p class="muted">Quel jour ?</p>
      <div class="chips chips--wrap">
        {days.map((d) => (
          <button key={d} class={`chip ${d === date ? 'chip--on' : ''}`} onClick={() => setDate(d)}>
            {relLabel(d, t)}
          </button>
        ))}
      </div>
      {warnings.map((w) => (
        <p class="hint hint--warn" key={w}>⚠️ {w}</p>
      ))}
      <button
        class="btn btn--big"
        onClick={() => {
          closeSheet();
          void actions.add(tpl, date);
        }}
      >
        Créer la carte
      </button>
    </div>
  );
}
