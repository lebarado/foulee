import {
  CalendarPlus,
  Check,
  Gauge,
  HeartPulse,
  MessageCircle,
  Pencil,
  Play,
  Repeat,
  Ruler,
  StickyNote,
  Timer,
  Trash2,
} from 'lucide-preact';
import { cardState, runBlocks } from '../domain/cards';
import { exerciseDose } from '../domain/catalog';
import { addDays, diffDays } from '../domain/dates';
import { fmtNum, formatDuration, formatPace, longLabel, relLabel, rpeLabel } from '../domain/format';
import { sessionXpLines } from '../domain/gamification';
import { paceSecPerKm } from '../domain/metrics';
import type { Session } from '../domain/types';
import { actions, settings, today } from '../data/store';
import { KindIcon, RpeIcon } from './icons';
import { openDone } from './SessionCard';
import { ShiftControl } from './ShiftControl';
import { closeSheet, openSheet } from './state';
import { isGuidedStrength, planText, sessionExercises } from './text';
import { WorkoutView } from './Workout';
import { formatMeters, workoutStats } from '../domain/workout';
import { sportInfo } from '../domain/sports';
import { player, playerActions } from './playerStore';

function gcalLink(s: Session, detail: string): string {
  const d = s.date.replace(/-/g, '');
  const end = addDays(s.date, 1).replace(/-/g, '');
  const p = new URLSearchParams({ action: 'TEMPLATE', text: `Foulée · ${s.title}`, dates: `${d}/${end}`, details: detail });
  return `https://calendar.google.com/calendar/render?${p.toString()}`;
}

/** Fiche complète d'une séance : le programme pas à pas, puis ce que tu as fait. */
export function SessionDetail({ s }: { s: Session }) {
  const t = today.value;
  const cfg = settings.value;
  const st = cardState(s, t, cfg);
  const done = st === 'done';
  const canDo = !done && st !== 'missed' && st !== 'skipped';
  const shift = diffDays(s.originalDate, s.date);

  return (
    <div class={`stack detail detail--${s.kind}`}>
      <div class="detail__head">
        <div class="card__icon" aria-hidden="true">
          <KindIcon kind={s.kind} size={28} />
        </div>
        <div>
          <p class="muted">
            {longLabel(s.date)} · {relLabel(s.date, t)}
            {shift > 0 && ` · décalée de ${shift} j`}
          </p>
          <h2 class="sheet__title">{s.title}</h2>
        </div>
      </div>

      {canDo && (
        <div class="stack stack--tight">
          <button
            class="btn btn--big"
            onClick={() => {
              closeSheet();
              playerActions.start(s);
            }}
          >
            <Play size={22} strokeWidth={2.6} /> {player.value?.sessionId === s.id ? 'Reprendre la séance' : 'Démarrer la séance'}
          </button>
          <button
            class="btn btn--ghost"
            onClick={() => {
              closeSheet();
              openDone(s);
            }}
          >
            <Check size={20} strokeWidth={3} /> Déjà faite
          </button>
          <ShiftControl s={s} />
        </div>
      )}

      {done && <DoneBlock s={s} />}

      <section class="block">
        <h3 class="block__title">{done ? 'Le programme prévu' : 'Le programme'}</h3>
        {s.plan.workout ? (
          <StructuredProgram s={s} />
        ) : s.kind === 'run' ? (
          <RunProgram s={s} />
        ) : isGuidedStrength(s) ? (
          <StrengthProgram s={s} />
        ) : (
          <FreeProgram s={s} />
        )}
      </section>

      {s.plan.notes && (
        <section class="block">
          <h3 class="block__title">
            <StickyNote size={16} /> Tes consignes
          </h3>
          <p class="block__text">{s.plan.notes}</p>
        </section>
      )}


      <div class="actions">
        {!done && (
          <button class="action" onClick={() => openSheet({ type: 'edit', id: s.id })}>
            <Pencil size={20} />
            Modifier
          </button>
        )}
        <a class="action" href={gcalLink(s, planText(s, cfg))} target="_blank" rel="noopener">
          <CalendarPlus size={20} />
          Agenda
        </a>
        {!done && (
          <button
            class="action action--danger"
            onClick={() => {
              if (confirm('Supprimer cette carte ?')) {
                closeSheet();
                void actions.remove(s.id);
              }
            }}
          >
            <Trash2 size={20} />
            Supprimer
          </button>
        )}
      </div>
    </div>
  );
}

function Step({ n, title, text }: { n: number | string; title: string; text: string }) {
  return (
    <li class="step">
      <span class="step__n">{n}</span>
      <div>
        <strong>{title}</strong>
        <p>{text}</p>
      </div>
    </li>
  );
}

function RunProgram({ s }: { s: Session }) {
  const cfg = settings.value;
  const ceiling = s.plan.hrCeiling ?? cfg.efHrCeiling;
  const rw = s.plan.runWalk;
  const blocks = rw ? runBlocks(s.plan.durationMin, rw.runMin, rw.walkMin) : null;
  return (
    <>
      <div class="targets">
        <span>
          <Timer size={16} /> {s.plan.durationMin} min
        </span>
        <span>
          <HeartPulse size={16} /> FC &lt; {ceiling}
        </span>
        <span>
          <Gauge size={16} /> Très facile
        </span>
      </div>
      <ol class="steps">
        <Step n={1} title="Échauffement · 5 min" text="Marche rapide, puis trottine très doucement les 2 dernières minutes." />
        {rw && blocks ? (
          <Step
            n={2}
            title={`Corps · ${blocks.reps} × (${rw.runMin} min course + ${rw.walkMin} min marche)`}
            text={`Course très facile, marche active entre les blocs.${blocks.rest ? ` Termine par ${blocks.rest} min de course facile.` : ''}`}
          />
        ) : (
          <Step n={2} title={`Corps · ${s.plan.durationMin} min en continu`} text="Allure très facile, régulière. Si la FC dépasse le plafond : marche 1 min, puis repars." />
        )}
        <Step n={3} title="Retour au calme · 5 min" text="Marche, puis étire doucement mollets et cuisses." />
      </ol>
      <ul class="tips">
        <li>
          <MessageCircle size={16} /> Test de la parole : tu dois pouvoir faire des phrases complètes.
        </li>
        <li>
          <Repeat size={16} /> Petits pas légers, cadence vive plutôt que grandes foulées.
        </li>
      </ul>
    </>
  );
}

const INTENSITY_LABEL = { facile: 'Facile', modéré: 'Modéré', intense: 'Intense' } as const;

function StructuredProgram({ s }: { s: Session }) {
  const cfg = settings.value;
  const st = workoutStats(s.plan.workout!);
  return (
    <>
      <div class="targets">
        <span>
          <Timer size={16} /> {st.partial ? '≈ ' : ''}
          {s.plan.durationMin} min
        </span>
        {st.meters > 0 && (
          <span>
            <Ruler size={16} /> {formatMeters(st.meters)}
          </span>
        )}
        {s.kind === 'run' && (
          <span>
            <HeartPulse size={16} /> FC &lt; {s.plan.hrCeiling ?? cfg.efHrCeiling}
          </span>
        )}
        {s.plan.intensity && (
          <span>
            <Gauge size={16} /> {INTENSITY_LABEL[s.plan.intensity]}
          </span>
        )}
      </div>
      <WorkoutView items={s.plan.workout!} />
    </>
  );
}

function FreeProgram({ s }: { s: Session }) {
  return (
    <>
      <div class="targets">
        <span>
          <Timer size={16} /> {s.plan.durationMin} min
        </span>
      </div>
      <p class="block__text muted">Séance libre. Touche « Modifier » puis « Détailler » pour la construire étape par étape.</p>
    </>
  );
}

function StrengthProgram({ s }: { s: Session }) {
  const sets = s.plan.sets ?? 2;
  const list = sessionExercises(s);
  return (
    <>
      <div class="targets">
        <span>
          <Timer size={16} /> {s.plan.durationMin} min
        </span>
        <span>
          <Repeat size={16} /> {sets} séries
        </span>
        <span>
          <Gauge size={16} /> Douleur ≤ 3/10
        </span>
      </div>
      <ol class="steps">
        {list.map((e, i) => (
          <Step
            key={e.id}
            n={i + 1}
            title={`${e.name} · ${exerciseDose(e, sets)}`}
            text={[e.tempo ? `Tempo ${e.tempo}.` : '', e.cues.join(' · ')].filter(Boolean).join(' ')}
          />
        ))}
      </ol>
    </>
  );
}

function DoneBlock({ s }: { s: Session }) {
  const l = s.log ?? {};
  const pace = s.kind === 'run' ? paceSecPerKm(l) : undefined;
  const xp = sessionXpLines(s, settings.value);
  const cells: [string, string][] = [];
  if (l.distanceKm)
    cells.push(['Distance', sportInfo(s.kind).distanceUnit === 'm' ? `${Math.round(l.distanceKm * 1000)} m` : `${fmtNum(l.distanceKm, 2)} km`]);
  if (l.durationSec) cells.push(['Durée', formatDuration(l.durationSec)]);
  if (pace) cells.push(['Allure', formatPace(pace)]);
  if (l.avgHr) cells.push(['FC moy', `${l.avgHr}`]);
  if (l.maxHr) cells.push(['FC max', `${l.maxHr}`]);
  if (l.cadence) cells.push(['Cadence', `${l.cadence}`]);
  if (l.pain != null && s.kind === 'strength') cells.push(['Douleur', `${l.pain}/10`]);
  const setsDone = l.sets ? Object.values(l.sets).flat().filter(Boolean).length : 0;
  const setsTotal = l.sets ? Object.values(l.sets).flat().length : 0;
  if (setsTotal) cells.push(['Séries', `${setsDone}/${setsTotal}`]);

  return (
    <section class="block block--done">
      <h3 class="block__title">
        <Check size={16} /> Ce que tu as fait
      </h3>
      {l.rpe != null && (
        <p class="rpe-line">
          <RpeIcon value={l.rpe} /> Ressenti {l.rpe}/10 · {rpeLabel(l.rpe)}
        </p>
      )}
      {cells.length > 0 && (
        <div class="kv">
          {cells.map(([k, v]) => (
            <div key={k}>
              <small>{k}</small>
              <strong>{v}</strong>
            </div>
          ))}
        </div>
      )}
      {l.notes && <p class="block__text">{l.notes}</p>}
      {xp.length > 0 && (
        <ul class="xp-lines">
          {xp.map((x) => (
            <li key={x.label}>
              <span>{x.label}</span>
              <b>+{x.xp} XP</b>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
