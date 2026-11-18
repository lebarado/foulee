import { CalendarDays, ChartColumn, Check, ChevronLeft, ChevronRight, GripVertical, Package, Plus } from 'lucide-preact';
import { useRef, useState } from 'preact/hooks';
import { cardState } from '../../domain/cards';
import { addDays, fromISO, toISO, weekStart, type ISODate } from '../../domain/dates';
import { DOW_SHORT, MONTHS_LONG, shortLabel } from '../../domain/format';
import { loadCheck } from '../../domain/load';
import type { Session } from '../../domain/types';
import { actions, sessions, settings, today, workDays } from '../../data/store';
import { KindIcon } from '../icons';
import { openSheet } from '../state';
import { Section } from './Today';

interface Drag {
  id: string;
  title: string;
  kind: Session['kind'];
  x: number;
  y: number;
  over: ISODate | null;
}

/** Jour sous le doigt (lignes marquées data-day). */
function dayAt(x: number, y: number): ISODate | null {
  const el = document.elementFromPoint(x, y) as HTMLElement | null;
  return (el?.closest('[data-day]') as HTMLElement | null)?.dataset.day ?? null;
}

export function Planning() {
  const [offset, setOffset] = useState(0);
  const [drag, setDrag] = useState<Drag | null>(null);
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
  const canDrop = (d: ISODate | null) => !!d && d >= t;

  return (
    <>
      <h1 class="page-title">Planning</h1>

      <div class="weeknav">
        <button class="icon-btn" aria-label="Semaine précédente" onClick={() => setOffset(offset - 1)}>
          <ChevronLeft size={22} />
        </button>
        <div class="weeknav__label">
          <strong>Semaine du {shortLabel(ws)}</strong>
          <small>
            {runsDone}/{cfg.weeklyRunTarget} sorties faites · {runsPlanned} prévues
          </small>
        </div>
        <button class="icon-btn" aria-label="Semaine suivante" onClick={() => setOffset(offset + 1)}>
          <ChevronRight size={22} />
        </button>
      </div>
      {offset !== 0 && (
        <button class="link link--center" onClick={() => setOffset(0)}>
          Revenir à cette semaine
        </button>
      )}
      {lc?.over && (
        <div class="banner banner--warn">
          <ChartColumn size={18} /> {Math.round(lc.plannedMin)} min prévues pour un repère de {Math.round(lc.allowedMin)} min (+10 % max).
        </div>
      )}

      <ul class={`days ${drag ? 'days--dragging' : ''}`}>
        {days.map((d) => {
          const items = byDay(d);
          const dt = fromISO(d);
          const over = drag?.over === d;
          return (
            <li
              key={d}
              data-day={d}
              class={`day ${d === t ? 'day--today' : ''} ${heavy.has(d) ? 'day--heavy' : ''} ${over ? (canDrop(d) ? 'day--drop' : 'day--nodrop') : ''}`}
            >
              <div class="day__label">
                <span>{DOW_SHORT[dt.getDay()]}</span>
                <b>{dt.getDate()}</b>
              </div>
              <div class="day__items">
                {items.map((s) => (
                  <DraggablePill key={s.id} s={s} drag={drag} setDrag={setDrag} canDrop={canDrop} />
                ))}
                {!items.length &&
                  (d < t ? (
                    <span class="day__rest">Repos</span>
                  ) : (
                    <button class="day__add" onClick={() => openSheet({ type: 'edit', date: d })}>
                      <Plus size={15} /> carte
                    </button>
                  ))}
              </div>
              <button
                class={`depot ${heavy.has(d) ? 'depot--on' : ''}`}
                aria-pressed={heavy.has(d)}
                aria-label="Journée de dépôt lourde"
                title="Journée de dépôt lourde"
                onClick={() => actions.toggleWorkDay(d)}
              >
                <Package size={20} />
              </button>
            </li>
          );
        })}
      </ul>
      <p class="help">
        <GripVertical size={14} /> Fais glisser une carte sur un autre jour pour la déplacer. <Package size={14} /> marque une
        journée de dépôt éreintante.
      </p>

      {drag && (
        <div class={`ghost pill pill--${drag.kind}`} style={{ left: `${drag.x}px`, top: `${drag.y}px` }} aria-hidden="true">
          <KindIcon kind={drag.kind} size={15} /> {drag.title}
        </div>
      )}

      <MonthGrid anchor={ws} />
    </>
  );
}

/**
 * Carte du planning : un toucher ouvre le détail, un glisser la déplace.
 * Événements pointer (souris + tactile) : le drag démarre après 8 px de mouvement.
 */
function DraggablePill({ s, drag, setDrag, canDrop }: {
  s: Session;
  drag: Drag | null;
  setDrag: (d: Drag | null) => void;
  canDrop: (d: ISODate | null) => boolean;
}) {
  const st = cardState(s, today.value, settings.value);
  const start = useRef<{ x: number; y: number; moved: boolean } | null>(null);
  const draggable = s.status !== 'done';

  const onPointerDown = (e: PointerEvent) => {
    start.current = { x: e.clientX, y: e.clientY, moved: false };
    if (!draggable) return;
    e.preventDefault(); // pas de sélection de texte pendant le geste
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: PointerEvent) => {
    const p = start.current;
    if (!p || !draggable) return;
    if (!p.moved && Math.hypot(e.clientX - p.x, e.clientY - p.y) < 8) return;
    p.moved = true;
    setDrag({ id: s.id, title: s.title, kind: s.kind, x: e.clientX, y: e.clientY, over: dayAt(e.clientX, e.clientY) });
  };
  const onPointerUp = (e: PointerEvent) => {
    const p = start.current;
    start.current = null;
    if (!p) return;
    if (p.moved) {
      const target = dayAt(e.clientX, e.clientY);
      setDrag(null);
      if (target && target !== s.date && canDrop(target)) void actions.reschedule(s.id, target);
    } else openSheet({ type: 'session', id: s.id });
  };
  const onPointerCancel = () => {
    start.current = null;
    setDrag(null);
  };

  return (
    <button
      class={`pill pill--${s.kind} pill--${st} ${draggable ? 'pill--drag' : ''} ${drag?.id === s.id ? 'pill--lifted' : ''}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onClick={(e) => {
        // Clavier (Entrée/Espace) : pas de pointeur, on ouvre le détail.
        if ((e as MouseEvent).detail === 0) openSheet({ type: 'session', id: s.id });
      }}
    >
      <KindIcon kind={s.kind} size={15} /> {s.title}
      {st === 'done' && <Check size={15} strokeWidth={3} />}
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
    <Section title={`${MONTHS_LONG[a.getMonth()]} ${a.getFullYear()}`} icon={CalendarDays}>
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
      <p class="help">Point plein = séance faite, cercle = prévue. Une couleur par sport.</p>
    </Section>
  );
}
