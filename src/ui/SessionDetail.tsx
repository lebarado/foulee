import { CalendarPlus, Pencil, Trash2 } from 'lucide-preact';
import { cardState, runBlocks } from '../domain/cards';
import { exerciseDose } from '../domain/catalog';
import { addDays, diffDays } from '../domain/dates';
import { fmtNum, formatDuration, formatPace, longLabel, rpeLabel } from '../domain/format';
import { sessionXpLines } from '../domain/gamification';
import { paceSecPerKm } from '../domain/metrics';
import { sportInfo } from '../domain/sports';
import type { Session } from '../domain/types';
import { formatMeters, workoutStats } from '../domain/workout';
import { actions, settings, today } from '../data/store';
import { KindIcon } from './icons';
import { Section } from './kit';
import { openDone } from './SessionCard';
import { ShiftControl } from './ShiftControl';
import { closeSheet, openSheet } from './state';
import { isGuidedStrength, planText, sessionExercises } from './text';
import { WorkoutView } from './Workout';

function gcalLink(s: Session, detail: string): string {
  const d = s.date.replace(/-/g, '');
  const end = addDays(s.date, 1).replace(/-/g, '');
  const p = new URLSearchParams({ action: 'TEMPLATE', text: `Foulée · ${s.title}`, dates: `${d}/${end}`, details: detail });
  return `https://calendar.google.com/calendar/render?${p.toString()}`;
}

const INTENSITY_LABEL = { facile: 'facile', modéré: 'modéré', intense: 'intense' } as const;

/** Résumé en une ligne : durée, distance, cible, intensité. */
function summary(s: Session): string {
  const cfg = settings.value;
  const parts: string[] = [];
  if (s.plan.workout) {
    const st = workoutStats(s.plan.workout);
    parts.push(`${st.partial ? '≈ ' : ''}${s.plan.durationMin} min`);
    if (st.meters) parts.push(formatMeters(st.meters));
  } else {
    parts.push(`${s.plan.durationMin} min`);
    if (isGuidedStrength(s)) parts.push(`${s.plan.sets ?? 2} séries`);
  }
  if (s.kind === 'run') parts.push(`FC < ${s.plan.hrCeiling ?? cfg.efHrCeiling}`);
  if (s.plan.intensity) parts.push(INTENSITY_LABEL[s.plan.intensity]);
  return parts.join(' · ');
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
    <div class="stack">
      <div>
        <p class="detail__kicker">
          <KindIcon kind={s.kind} size={15} />
          {sportInfo(s.kind).label} · {longLabel(s.date)}
          {shift > 0 && ` · décalée de ${shift} j`}
        </p>
        <h2 class="sheet__title">{s.title}</h2>
        <p class="detail__summary">{summary(s)}</p>
      </div>

      {canDo && (
        <div>
          <button
            class="btn btn--block"
            onClick={() => {
              closeSheet();
              openDone(s);
            }}
          >
            Fait
          </button>
          <ShiftControl s={s} />
        </div>
      )}

      {done && <DoneBlock s={s} />}

      <div>
        <h3 class="block__title">{done ? 'Programme prévu' : 'Programme'}</h3>
        <div class="list">
          {s.plan.workout ? (
            <WorkoutView items={s.plan.workout} />
          ) : s.kind === 'run' ? (
            <RunProgram s={s} />
          ) : isGuidedStrength(s) ? (
            <StrengthProgram s={s} />
          ) : (
            <p class="empty">Séance libre. Modifie-la pour la détailler étape par étape.</p>
          )}
        </div>
      </div>

      {s.kind === 'run' && !s.plan.workout && (
        <div class="list">
          <ul class="tips">
            <li>Test de la parole : tu dois pouvoir faire des phrases complètes.</li>
            <li>Petits pas légers, cadence vive plutôt que grandes foulées.</li>
          </ul>
        </div>
      )}

      {s.plan.notes && (
        <div>
          <h3 class="block__title">Consignes</h3>
          <div class="list pad">
            <p class="text">{s.plan.notes}</p>
          </div>
        </div>
      )}

      <div class="toolbar">
        {!done && (
          <button class="link link--quiet" onClick={() => openSheet({ type: 'edit', id: s.id })}>
            <Pencil size={18} strokeWidth={1.75} />
            Modifier
          </button>
        )}
        <a class="link link--quiet" href={gcalLink(s, planText(s, cfg))} target="_blank" rel="noopener">
          <CalendarPlus size={18} strokeWidth={1.75} />
          Agenda
        </a>
        {!done && (
          <button
            class="link link--danger"
            onClick={() => {
              if (confirm('Supprimer cette séance ?')) {
                closeSheet();
                void actions.remove(s.id);
              }
            }}
          >
            <Trash2 size={18} strokeWidth={1.75} />
            Supprimer
          </button>
        )}
      </div>
    </div>
  );
}

function Step({ n, title, measure, text }: { n: number; title: string; measure?: string; text: string }) {
  return (
    <li class="step">
      <span class="step__n">{n}</span>
      <div class="step__body">
        <div class="step__top">
          <strong>{title}</strong>
          {measure && <span class="step__measure">{measure}</span>}
        </div>
        <p class="step__sub">{text}</p>
      </div>
    </li>
  );
}

function RunProgram({ s }: { s: Session }) {
  const rw = s.plan.runWalk;
  const blocks = rw ? runBlocks(s.plan.durationMin, rw.runMin, rw.walkMin) : null;
  return (
    <ol class="steps">
      <Step n={1} title="Échauffement" measure="5 min" text="Marche rapide, puis trottine très doucement les 2 dernières minutes." />
      {rw && blocks ? (
        <Step
          n={2}
          title={`${blocks.reps} × (${rw.runMin} min course + ${rw.walkMin} min marche)`}
          text={`Course très facile, marche active entre les blocs.${blocks.rest ? ` Termine par ${blocks.rest} min de course facile.` : ''}`}
        />
      ) : (
        <Step
          n={2}
          title="Course en continu"
          measure={`${s.plan.durationMin} min`}
          text="Allure très facile et régulière. Si la FC dépasse le plafond, marche 1 min puis repars."
        />
      )}
      <Step n={3} title="Retour au calme" measure="5 min" text="Marche, puis étire doucement mollets et cuisses." />
    </ol>
  );
}

function StrengthProgram({ s }: { s: Session }) {
  const sets = s.plan.sets ?? 2;
  return (
    <ol class="steps">
      {sessionExercises(s).map((e, i) => (
        <Step
          key={e.id}
          n={i + 1}
          title={e.name}
          measure={exerciseDose(e, sets)}
          text={[e.tempo ? `Tempo ${e.tempo}.` : '', e.cues.join(' · ')].filter(Boolean).join(' ')}
        />
      ))}
    </ol>
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
  if (l.avgHr) cells.push(['FC moy.', `${l.avgHr}`]);
  if (l.maxHr) cells.push(['FC max', `${l.maxHr}`]);
  if (l.cadence) cells.push(['Cadence', `${l.cadence}`]);
  if (l.rpe != null) cells.push(['Ressenti', `${l.rpe}/10`]);
  if (l.pain != null && s.kind === 'strength') cells.push(['Douleur', `${l.pain}/10`]);
  const setsDone = l.sets ? Object.values(l.sets).flat().filter(Boolean).length : 0;
  const setsTotal = l.sets ? Object.values(l.sets).flat().length : 0;
  if (setsTotal) cells.push(['Séries', `${setsDone}/${setsTotal}`]);
  const total = xp.reduce((a, x) => a + x.xp, 0);

  return (
    <>
      <div>
        <h3 class="block__title">Réalisé{l.rpe != null ? ` · ${rpeLabel(l.rpe).toLowerCase()}` : ''}</h3>
        {cells.length > 0 && (
          <div class="list kv">
            {cells.map(([k, v]) => (
              <div key={k}>
                <small>{k}</small>
                <strong>{v}</strong>
              </div>
            ))}
          </div>
        )}
        {l.notes && <p class="help">{l.notes}</p>}
      </div>
      {xp.length > 0 && (
        <Section title="Expérience" aside={`+${total} XP`}>
          <div class="list">
            {xp.map((x) => (
              <div key={x.label} class="row">
                <span class="row__main row__title">{x.label}</span>
                <span class="row__aside">+{x.xp}</span>
              </div>
            ))}
          </div>
        </Section>
      )}
    </>
  );
}
