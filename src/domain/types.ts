import type { ISODate } from './dates';

export type SessionKind = 'run' | 'strength';

/**
 * Statut stocké. Les états d'affichage (« bientôt », « à rattraper », « passée »)
 * sont calculés à partir de la date du jour : voir `cardState`.
 * `confirmed` est conservé pour compatibilité avec les anciennes sauvegardes.
 */
export type SessionStatus = 'planned' | 'confirmed' | 'done' | 'skipped';

export interface RunWalk {
  runMin: number;
  walkMin: number;
}

export interface SessionPlan {
  durationMin: number;
  runWalk?: RunWalk;
  /** Plafond FC propre à la séance ; sinon celui des réglages. */
  hrCeiling?: number;
  /** Nombre de séries (renfo). */
  sets?: number;
  /** Renfo : exercices retenus (tous si absent). */
  exercises?: string[];
  /** Consignes libres écrites sur la carte. */
  notes?: string;
}

export interface SessionLog {
  durationSec?: number;
  distanceKm?: number;
  avgHr?: number;
  maxHr?: number;
  cadence?: number;
  /** Ressenti /10. */
  rpe?: number;
  notes?: string;
  /** Renfo : séries cochées par exercice. */
  sets?: Record<string, boolean[]>;
  /** Renfo : douleur max /10. */
  pain?: number;
}

/** Une carte de séance. */
export interface Session {
  id: string;
  kind: SessionKind;
  title: string;
  date: ISODate;
  /** Date prévue au départ : le décalage est limité par rapport à elle. */
  originalDate: ISODate;
  status: SessionStatus;
  plan: SessionPlan;
  log?: SessionLog;
  confirmedAt?: string;
  doneAt?: string;
  source?: 'manuel' | 'historique' | 'garmin';
}

export interface WorkDay {
  date: ISODate;
  /** Journée de dépôt éreintante. */
  heavy: boolean;
}

export interface CoachParams {
  /** Tolérance au-dessus du plafond FC avant de proposer de la marche. */
  hrMargin: number;
  rpeHigh: number;
  rpeEasy: number;
  stepUpMin: number;
  stepDownPct: number;
  gapDays: number;
  gapPct: number;
  maxRunMin: number;
  runWalk: RunWalk;
}

export interface Settings {
  schemaVersion: 1;
  repriseStart: ISODate;
  efHrCeiling: number;
  /** Nombre de jours à l'avance où une carte passe « à caler ». */
  windowDays: number;
  /** Décalage max par rapport à la date d'origine. */
  maxShiftDays: number;
  weeklyRunTarget: number;
  weeklyStrengthTarget: number;
  jokersPerMonth: number;
  volume: { maxIncrease: number; minIncreaseMin: number };
  noIntensityUntil: ISODate;
  history: { month: string; km: number }[];
  coach: CoachParams;
  /** Thème de couleur choisi (débloqué par les niveaux). */
  theme: string;
  /** Récompenses réelles que tu t'offres en atteignant un niveau. */
  rewards: PersonalReward[];
}

export interface PersonalReward {
  id: string;
  level: number;
  label: string;
}

export interface CardTemplate {
  id: string;
  kind: SessionKind;
  title: string;
  hint: string;
  plan: SessionPlan;
}

export interface Exercise {
  id: string;
  name: string;
  reps: string;
  perSide?: boolean;
  tempo?: string;
  cues: string[];
}
