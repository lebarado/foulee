import type { SessionKind } from './types';

export interface SportInfo {
  id: SessionKind;
  label: string;
  /** Nom court pour une carte sans titre. */
  short: string;
  /** Unité de distance à la saisie. */
  distanceUnit?: 'km' | 'm';
}

export const SPORTS: SportInfo[] = [
  { id: 'run', label: 'Course', short: 'Course', distanceUnit: 'km' },
  { id: 'strength', label: 'Renfo', short: 'Renfo' },
  { id: 'cali', label: 'Calisthénie', short: 'Calisthénie' },
  { id: 'swim', label: 'Natation', short: 'Piscine', distanceUnit: 'm' },
  { id: 'bike', label: 'Vélo', short: 'Vélo', distanceUnit: 'km' },
];

export const sportInfo = (k: SessionKind) => SPORTS.find((s) => s.id === k) ?? SPORTS[0];

export const isStrengthLike = (k: SessionKind) => k === 'strength' || k === 'cali';
