import type { Exercise, Settings } from './types';

export const DEFAULT_SETTINGS: Settings = {
  schemaVersion: 1,
  repriseStart: '2026-11-18',
  // Provisoire : à recalibrer avec le test de la parole (ou FC repos / FC max).
  efHrCeiling: 150,
  windowDays: 2,
  maxShiftDays: 2,
  weeklyRunTarget: 3,
  weeklyStrengthTarget: 2,
  jokersPerMonth: 1,
  volume: { maxIncrease: 0.1, minIncreaseMin: 10 },
  noIntensityUntil: '2027-01-13',
  history: [
    { month: '2026-04', km: 41 },
    { month: '2026-06', km: 20 },
    { month: '2026-07', km: 6 },
    { month: '2026-09', km: 4 },
  ],
  coach: {
    hrMargin: 5,
    rpeHigh: 7,
    rpeEasy: 4,
    stepUpMin: 5,
    stepDownPct: 0.15,
    gapDays: 10,
    gapPct: 0.2,
    maxRunMin: 60,
    runWalk: { runMin: 4, walkMin: 1 },
  },
  theme: 'menthe',
  rewards: [
    { id: 'r3', level: 3, label: 'Une paire de chaussettes de running' },
    { id: 'r6', level: 6, label: 'Une sortie découverte au Mont Saint-Quentin' },
    { id: 'r10', level: 10, label: 'Une nouvelle paire de chaussures' },
  ],
};

export const EXERCISES: Exercise[] = [
  {
    id: 'mollets-debout',
    name: 'Mollets debout',
    reps: '12',
    tempo: '2 s montée / 3 s descente',
    cues: ['Sur une marche, talons dans le vide', 'Monte sur la pointe en 2 s', 'Redescends en 3 s, sous la marche'],
  },
  {
    id: 'mollets-flechi',
    name: 'Mollets genou fléchi',
    reps: '12',
    tempo: '2 s montée / 3 s descente',
    cues: ['Genoux légèrement fléchis tout du long', 'Même tempo : ça cible le soléaire'],
  },
  {
    id: 'squat-chaise',
    name: 'Squat sur chaise',
    reps: '10',
    cues: ['Pieds largeur de hanches', 'Effleure la chaise et remonte', 'Genoux dans l’axe des pieds'],
  },
  {
    id: 'fente-arriere',
    name: 'Fente arrière',
    reps: '8',
    perSide: true,
    cues: ['Grand pas en arrière', 'Le genou arrière descend vers le sol', 'Buste droit, pousse dans le talon avant'],
  },
  {
    id: 'pont-fessier',
    name: 'Pont fessier',
    reps: '12',
    cues: ['Sur le dos, pieds proches des fesses', 'Pousse dans les talons', 'Serre les fessiers 2 s en haut'],
  },
  {
    id: 'abduction',
    name: 'Abduction de hanche',
    reps: '12',
    perSide: true,
    cues: ['Allongé sur le côté', 'Jambe du dessus tendue, monte en 2 s', 'Pointe de pied légèrement vers le bas'],
  },
  {
    id: 'gainage',
    name: 'Gainage planche + latéral',
    reps: '30 s face + 20 s par côté',
    cues: ['Corps aligné, ne creuse pas le dos', 'Respire calmement'],
  },
  {
    id: 'equilibre',
    name: 'Équilibre sur une jambe',
    reps: '30 s',
    perSide: true,
    cues: ['Genou légèrement fléchi', 'Trop facile ? Ferme les yeux'],
  },
];

export function exerciseDose(ex: Exercise, sets: number): string {
  return `${sets} × ${ex.reps}${ex.perSide ? ' par côté' : ''}`;
}
