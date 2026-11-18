import { useState } from 'preact/hooks';
import { cardState } from '../../domain/cards';
import { addDays, fromISO, toISO, weekStart } from '../../domain/dates';
import { DOW_SHORT, MONTHS_LONG, shortLabel } from '../../domain/format';
import { loadCheck } from '../../domain/load';
import type { Session } from '../../domain/types';
import { actions, sessions, settings, today, workDays } from '../../data/store';
import { openSheet } from '../state';
import { kindEmoji } from '../text';

export function Planning() {
  const [offset, setOffset] = useState(0);
  const t = today.value;
  const cfg = settings.value;
  const ws = addDays(weekStart(t), offset * 7);
  const days = Array.from({ length: 7 }, (_, i) => addDays(ws, i));
  const heavy = new Set(workDays.value.filter((w) => w.heavy).map((w) => w.date));
  const visible = sessions.value.filter((s) => s.status !== 'skipped');
  const byDay = (d: string) => visible.filter((s) => s.date === d).sort((a, b) => a.kind.localeCompare(b.kind));
  const runsDone = visible.filter((s) => s.kind === 'run' && s.status === 'done' && weekStart(s.date) === ws).length;
  const runsPlanned = visible.filter((s) => s.kind === 'run' && weekStart(s.date) === ws).length;
  const lc = loadCheck(sessions.value, cfg, ws);

  return (
    <>
      <h1 class="page-title">Planning</h1>

      <div class="weeknav">
        <button class="icon-btn" aria-label="Semaine précédente" onClick={() => setOffset(offset - 1)}>
          ‹
        </button>
        <div class="weeknav__label">
          <strong>Semaine du {shortLabel(ws)}</strong>
          <small>
            🏃 {runsDone}/{cfg.weeklyRunTarget} faites · {runsPlanned} prévues
          </small>
        </div>
        <button class="icon-btn" aria-label="Semaine suivante" onClick={() => setOffset(offset + 1)}>
          ›
        </button>
      </div>
      {offset !== 0 && (
        <button class="link link--center" onClick={() => setOffset(0)}>
          Revenir à cette semaine
        </button>
      )}
      {lc?.over && (
        <div class="banner banner--warn">
          📊 {Math.round(lc.plannedMin)} min prévues pour un repère de {Math.round(lc.allowedMin)} min (+10 % max).
        </div>
      )}

      <ul class="days">
        {days.map((d) => {
          const items = byDay(d);
          const dt = fromISO(d);
          return (
            <li key={d} class={`day ${d === t ? 'day--today' : ''} ${heavy.has(d) ? 'day--heavy' : ''}`}>
              <div class="day__label">
                <span>{DOW_SHORT[dt.getDay()]}</span>
                <b>{dt.getDate()}</b>
              </div>
              <div class="day__items">
                {items.map((s) => (
                  <PillButton key={s.id} s={s} />
                ))}
                {!items.length && (
                  <button class="day__add" onClick={() => openSheet({ type: 'new', date: d })} disabled={d < t}>
                    {d < t ? 'Repos' : '+ carte'}
                  </button>
                )}
              </div>
              <button
                class={`depot ${heavy.has(d) ? 'depot--on' : ''}`}
                aria-pressed={heavy.has(d)}
                aria-label="Journée de dépôt lourde"
                title="Journée de dépôt lourde"
                onClick={() => actions.toggleWorkDay(d)}
              >
                📦
              </button>
            </li>
          );
        })}
      </ul>
      <p class="help">📦 Touche pour marquer une journée de dépôt éreintante : l’app te prévient si une sortie tombe la veille.</p>

      <MonthGrid anchor={ws} />
    </>
  );
}

function PillButton({ s }: { s: Session }) {
  const st = cardState(s, today.value, settings.value);
  return (
    <button class={`pill pill--${s.kind} pill--${st}`} onClick={() => openSheet({ type: 'session', id: s.id })}>
      <span aria-hidden="true">{kindEmoji(s)}</span> {s.title}
      {st === 'done' && ' ✓'}
      {st === 'confirmed' && ' · calée'}
    </button>
  );
}

function MonthGrid({ anchor }: { anchor: string }) {
  const a = fromISO(anchor);
  const first = toISO(new Date(a.getFullYear(), a.getMonth(), 1));
  const daysInMonth = new Date(a.getFullYear(), a.getMonth() + 1, 0).getDate();
  const lead = (fromISO(first).getDay() + 6) % 7;
  const cells: (string | null)[] = [...Array(lead).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => addDays(first, i))];
  const visible = sessions.value.filter((s) => s.status !== 'skipped');
  const t = today.value;

  return (
    <section class="section">
      <h2 class="section__title">
        📅 {MONTHS_LONG[a.getMonth()]} {a.getFullYear()}
      </h2>
      <div class="month">
        {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => (
          <span key={i} class="month__dow">
            {d}
          </span>
        ))}
        {cells.map((d, i) =>
          d ? (
            <div key={d} class={`month__cell ${d === t ? 'month__cell--today' : ''}`}>
              <span>{fromISO(d).getDate()}</span>
              <div class="month__dots">
                {visible
                  .filter((s) => s.date === d)
                  .map((s) => (
                    <i key={s.id} class={`mdot mdot--${s.kind} ${s.status === 'done' ? 'mdot--done' : ''}`} />
                  ))}
              </div>
            </div>
          ) : (
            <div key={`e${i}`} />
          ),
        )}
      </div>
      <p class="help">
        <i class="mdot mdot--run mdot--done" /> course faite · <i class="mdot mdot--run" /> prévue ·{' '}
        <i class="mdot mdot--strength mdot--done" /> renfo
      </p>
    </section>
  );
}
