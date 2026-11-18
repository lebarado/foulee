/**
 * Mode « en cours » : la séance déroulée étape par étape, avec chrono.
 * Tout est calculé à partir d'horodatages (pas de compteur qui dérive),
 * pour rester juste même si l'écran s'éteint ou si l'app est rechargée.
 */
import { runBlocks } from './cards';
import { EXERCISES } from './catalog';
import type { Exercise, Session } from './types';
import { flatten, type Measure, type StepKind } from './workout';

export interface PlayerStep {
  kind: StepKind;
  label: string;
  measure: Measure;
  /** Texte de dose quand la mesure n'est pas chiffrable (« 12 par côté »). */
  dose?: string;
  target?: string;
  round?: number;
  rounds?: number;
  /** Renfo guidé : exercice et numéro de série (0-based), pour cocher les séries. */
  exerciseId?: string;
  set?: number;
  /** Renfo en circuit : position de l'exercice dans le tour (1-based). */
  exIndex?: number;
  exCount?: number;
}

/** Courte pause pour changer d'exercice dans un tour. */
export const REST_BETWEEN_EXERCISES_SEC = 20;
/** Vraie récupération entre deux tours du circuit. */
export const REST_BETWEEN_ROUNDS_SEC = 90;

const T = (min: number): Measure => ({ type: 'time', sec: Math.round(min * 60) });

/** Construit la liste des étapes à enchaîner pour une séance. */
export function buildSteps(s: Session, exercises: Exercise[] = EXERCISES): PlayerStep[] {
  if (s.plan.workout?.length)
    return flatten(s.plan.workout).map((w) => ({
      kind: w.kind,
      label: w.label ?? '',
      measure: w.measure,
      target: w.target,
      round: w.round,
      rounds: w.rounds,
    }));

  if (s.kind === 'strength') {
    // En circuit : tous les exercices une fois (tour 1), puis tous une deuxième fois, etc.
    // Jamais deux fois le même exercice d'affilée.
    const sets = s.plan.sets ?? 2;
    const list = s.plan.exercises ? exercises.filter((e) => s.plan.exercises!.includes(e.id)) : exercises;
    const out: PlayerStep[] = [];
    for (let i = 0; i < sets; i++) {
      list.forEach((e, ei) => {
        out.push({
          kind: 'work',
          label: e.name,
          measure: { type: 'open' },
          dose: `${e.reps}${/^\d+$/.test(e.reps) ? ' rép.' : ''}${e.perSide ? ' par côté' : ''}`,
          target: e.tempo ? `Tempo ${e.tempo}` : e.cues[0],
          round: i + 1,
          rounds: sets,
          exerciseId: e.id,
          set: i,
          exIndex: ei + 1,
          exCount: list.length,
        });
        const lastOfRound = ei === list.length - 1;
        const lastOfAll = lastOfRound && i === sets - 1;
        if (lastOfAll) return;
        out.push(
          lastOfRound
            ? { kind: 'rest', label: 'Repos entre les tours', measure: { type: 'time', sec: REST_BETWEEN_ROUNDS_SEC } }
            : { kind: 'rest', label: 'Transition', measure: { type: 'time', sec: REST_BETWEEN_EXERCISES_SEC } },
        );
      });
    }
    return out;
  }

  if (s.kind === 'run') {
    const out: PlayerStep[] = [{ kind: 'warmup', label: 'Échauffement', measure: T(5), target: 'Marche rapide puis trot très lent' }];
    const rw = s.plan.runWalk;
    if (rw) {
      const { reps, rest } = runBlocks(s.plan.durationMin, rw.runMin, rw.walkMin);
      for (let r = 1; r <= reps; r++) {
        out.push({ kind: 'work', label: 'Course', measure: T(rw.runMin), target: 'Très facile, tu peux parler', round: r, rounds: reps });
        out.push({ kind: 'recover', label: 'Marche', measure: T(rw.walkMin), round: r, rounds: reps });
      }
      if (rest) out.push({ kind: 'work', label: 'Course', measure: T(rest), target: 'Très facile' });
    } else {
      out.push({ kind: 'work', label: 'Course en continu', measure: T(s.plan.durationMin), target: 'Très facile, tu peux parler' });
    }
    out.push({ kind: 'cooldown', label: 'Retour au calme', measure: T(5), target: 'Marche puis étirements doux' });
    return out;
  }

  return [{ kind: 'work', label: 'Séance', measure: { type: 'open' }, target: `${s.plan.durationMin} min prévues` }];
}

/* ---------- Chrono ---------- */

export interface PlayerState {
  sessionId: string;
  steps: PlayerStep[];
  index: number;
  /** Temps total accumulé (ms) avant `runningSince`. */
  totalMs: number;
  /** Temps accumulé sur l'étape en cours (ms) avant `runningSince`. */
  stepMs: number;
  /** Horodatage de reprise ; null = en pause. */
  runningSince: number | null;
  /** Pile pour « Annuler » : étape quittée et son temps. */
  history: { index: number; stepMs: number }[];
  startedAt: number;
}

const live = (s: PlayerState, now: number) => (s.runningSince === null ? 0 : Math.max(0, now - s.runningSince));

export const totalElapsed = (s: PlayerState, now: number) => s.totalMs + live(s, now);
export const stepElapsed = (s: PlayerState, now: number) => s.stepMs + live(s, now);

/** Fige le temps écoulé dans l'état (avant tout changement). */
function commit(s: PlayerState, now: number): PlayerState {
  const d = live(s, now);
  return { ...s, totalMs: s.totalMs + d, stepMs: s.stepMs + d, runningSince: s.runningSince === null ? null : now };
}

export function startPlayer(sessionId: string, steps: PlayerStep[], now: number): PlayerState {
  return { sessionId, steps, index: 0, totalMs: 0, stepMs: 0, runningSince: now, history: [], startedAt: now };
}

export const isLastStep = (s: PlayerState) => s.index >= s.steps.length - 1;

/** Étape suivante. Sans effet sur la dernière étape (c'est « Terminer » qui conclut). */
export function nextStep(s: PlayerState, now: number): PlayerState {
  if (isLastStep(s)) return s;
  const c = commit(s, now);
  return { ...c, history: [...c.history, { index: c.index, stepMs: c.stepMs }], index: c.index + 1, stepMs: 0 };
}

/**
 * Annuler le dernier passage (mauvais clic) : on revient à l'étape précédente.
 * Le temps passé par erreur sur l'étape suivante est rendu à l'étape restaurée ; le chrono total ne recule jamais.
 */
export function undoStep(s: PlayerState, now: number): PlayerState {
  const h = s.history[s.history.length - 1];
  if (!h) return s;
  const c = commit(s, now);
  return { ...c, history: c.history.slice(0, -1), index: h.index, stepMs: h.stepMs + c.stepMs };
}

export const pausePlayer = (s: PlayerState, now: number): PlayerState => ({ ...commit(s, now), runningSince: null });
export const resumePlayer = (s: PlayerState, now: number): PlayerState => (s.runningSince === null ? { ...s, runningSince: now } : s);

/** Temps restant (ms) d'une étape chronométrée, sinon null. */
export function stepRemaining(s: PlayerState, now: number): number | null {
  const m = s.steps[s.index]?.measure;
  if (!m || m.type !== 'time') return null;
  return m.sec * 1000 - stepElapsed(s, now);
}

/** Séries réellement faites (renfo guidé) : étapes franchies, plus l'étape en cours si `includeCurrent`. */
export function completedSets(s: PlayerState, includeCurrent: boolean): Record<string, boolean[]> {
  const out: Record<string, boolean[]> = {};
  s.steps.forEach((st, i) => {
    if (st.exerciseId === undefined || st.set === undefined) return;
    const arr = (out[st.exerciseId] ??= Array(st.rounds ?? 1).fill(false));
    arr[st.set] = i < s.index || (includeCurrent && i === s.index);
  });
  return out;
}

export function formatClock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const sec = total % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h ? `${h}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
}
