/**
 * Séance structurée, à la manière des entraînements Garmin :
 * une liste d'étapes (échauffement, effort, récup, repos, retour au calme)
 * et de blocs « Répéter N fois ».
 */

export type StepKind = 'warmup' | 'work' | 'recover' | 'rest' | 'cooldown';

export type Measure =
  | { type: 'time'; sec: number }
  | { type: 'distance'; m: number }
  | { type: 'reps'; n: number }
  | { type: 'open' };

export interface WorkoutStep {
  id: string;
  type: 'step';
  kind: StepKind;
  /** Nom de l'exercice ou de l'effort (« Pompes », « 400 m »…). */
  label?: string;
  measure: Measure;
  /** Cible libre : « FC < 150 », « RPE 8 », « crawl souple »… */
  target?: string;
}

export interface RepeatBlock {
  id: string;
  type: 'repeat';
  rounds: number;
  steps: WorkoutStep[];
}

export type WorkoutItem = WorkoutStep | RepeatBlock;

export const STEP_LABEL: Record<StepKind, string> = {
  warmup: 'Échauffement',
  work: 'Effort',
  recover: 'Récupération',
  rest: 'Repos',
  cooldown: 'Retour au calme',
};

let seq = 0;
export const stepId = () => `w${Date.now().toString(36)}${(++seq).toString(36)}`;

/* ---------- Petits constructeurs (bibliothèque, tests) ---------- */

export const T = (min: number, sec = 0): Measure => ({ type: 'time', sec: min * 60 + sec });
export const S = (sec: number): Measure => ({ type: 'time', sec });
export const D = (m: number): Measure => ({ type: 'distance', m });
export const R = (n: number): Measure => ({ type: 'reps', n });
export const OPEN: Measure = { type: 'open' };

const step = (kind: StepKind) => (measure: Measure, label?: string, target?: string): WorkoutStep => ({
  id: stepId(),
  type: 'step',
  kind,
  measure,
  label,
  target,
});

export const warm = step('warmup');
export const work = step('work');
export const recover = step('recover');
export const rest = step('rest');
export const cool = step('cooldown');

export const repeat = (rounds: number, ...steps: WorkoutStep[]): RepeatBlock => ({
  id: stepId(),
  type: 'repeat',
  rounds,
  steps,
});

/* ---------- Calculs ---------- */

/** Déroule les blocs de répétition : la liste exacte des étapes à enchaîner. */
export function flatten(items: WorkoutItem[]): (WorkoutStep & { round?: number; rounds?: number })[] {
  const out: (WorkoutStep & { round?: number; rounds?: number })[] = [];
  for (const it of items) {
    if (it.type === 'step') out.push(it);
    else for (let r = 1; r <= it.rounds; r++) for (const s of it.steps) out.push({ ...s, round: r, rounds: it.rounds });
  }
  return out;
}

export interface WorkoutStats {
  /** Durée des étapes chronométrées. */
  sec: number;
  /** Distance des étapes en distance. */
  meters: number;
  /** Vrai si certaines étapes ne sont pas en temps (distance, reps, libre) : la durée est alors une estimation. */
  partial: boolean;
  steps: number;
}

export function workoutStats(items: WorkoutItem[]): WorkoutStats {
  const flat = flatten(items);
  let sec = 0;
  let meters = 0;
  let partial = false;
  for (const s of flat) {
    if (s.measure.type === 'time') sec += s.measure.sec;
    else {
      partial = true;
      if (s.measure.type === 'distance') meters += s.measure.m;
    }
  }
  return { sec, meters, partial, steps: flat.length };
}

const pad = (n: number) => String(n).padStart(2, '0');

export function formatSec(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (m === 0) return `${s} s`;
  if (s === 0) return `${m} min`;
  return `${m} min ${pad(s)}`;
}

export function formatMeters(m: number): string {
  return m >= 1000 ? `${(m / 1000).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} km` : `${m} m`;
}

export function measureLabel(m: Measure): string {
  switch (m.type) {
    case 'time':
      return formatSec(m.sec);
    case 'distance':
      return formatMeters(m.m);
    case 'reps':
      return `${m.n} rép.`;
    case 'open':
      return 'Libre';
  }
}

/** Copie profonde avec de nouveaux identifiants (pour réutiliser un modèle). */
export function cloneWorkout(items: WorkoutItem[]): WorkoutItem[] {
  return items.map((it) =>
    it.type === 'step'
      ? { ...it, measure: { ...it.measure }, id: stepId() }
      : { ...it, id: stepId(), steps: it.steps.map((s) => ({ ...s, measure: { ...s.measure }, id: stepId() })) },
  );
}

/** Séance détaillée par défaut quand on « détaille » une séance simple. */
export function defaultWorkout(durationMin: number): WorkoutItem[] {
  const body = Math.max(5, durationMin - 15);
  return [warm(T(10)), work(T(body)), cool(T(5))];
}
