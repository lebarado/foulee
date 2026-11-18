import type { CardTemplate } from './types';
import { D, OPEN, R, S, T, cool, recover, repeat, rest, warm, work } from './workout';

/**
 * Bibliothèque des séances les plus classiques, par sport.
 * Les séances « intense » sont signalées : pas avant la date fixée dans tes principes (course).
 */
export const LIBRARY: CardTemplate[] = [
  /* ---------------- Course ---------------- */
  {
    id: 'run-easy',
    kind: 'run',
    title: 'Course tranquille',
    hint: '30 min en continu, tu peux parler',
    intensity: 'facile',
    plan: { durationMin: 30 },
  },
  {
    id: 'run-walk',
    kind: 'run',
    title: 'Course / marche 4-1',
    hint: '6 × (4 min course + 1 min marche)',
    intensity: 'facile',
    plan: {
      durationMin: 40,
      workout: [warm(T(5), 'Marche rapide'), repeat(6, work(T(4), 'Course', 'EF, test de la parole'), recover(T(1), 'Marche')), cool(T(5), 'Marche')],
    },
  },
  {
    id: 'run-ef-structured',
    kind: 'run',
    title: 'Footing EF',
    hint: 'Échauffement, 30 min EF, retour au calme',
    intensity: 'facile',
    plan: { durationMin: 40, workout: [warm(T(5), 'Marche puis trot'), work(T(30), 'Footing', 'FC sous le plafond'), cool(T(5), 'Marche')] },
  },
  {
    id: 'run-long',
    kind: 'run',
    title: 'Sortie longue',
    hint: '60 min très facile, la base de l’endurance',
    intensity: 'modéré',
    plan: { durationMin: 65, workout: [warm(T(10), 'Trot très lent'), work(T(50), 'Endurance', 'EF stricte, marche si la FC monte'), cool(T(5), 'Marche')] },
  },
  {
    id: 'run-fartlek',
    kind: 'run',
    title: 'Fartlek',
    hint: '8 × (1 min vif + 2 min lent), au feeling',
    intensity: 'modéré',
    plan: {
      durationMin: 49,
      workout: [warm(T(15), 'Footing'), repeat(8, work(T(1), 'Vif', 'RPE 7'), recover(T(2), 'Footing lent')), cool(T(10), 'Footing')],
    },
  },
  {
    id: 'run-3030',
    kind: 'run',
    title: '30/30',
    hint: '2 séries de 10 × 30 s vite / 30 s trot',
    intensity: 'intense',
    plan: {
      durationMin: 53,
      workout: [
        warm(T(20), 'Footing'),
        repeat(10, work(S(30), 'Vite', 'RPE 8-9'), recover(S(30), 'Trot')),
        recover(T(3), 'Trot'),
        repeat(10, work(S(30), 'Vite', 'RPE 8-9'), recover(S(30), 'Trot')),
        cool(T(10), 'Footing'),
      ],
    },
  },
  {
    id: 'run-400',
    kind: 'run',
    title: '10 × 400 m',
    hint: 'Le classique de la VMA, récup 1 min 30',
    intensity: 'intense',
    plan: {
      durationMin: 55,
      workout: [warm(T(20), 'Footing + 3 accélérations'), repeat(10, work(D(400), '400 m', 'Allure VMA, RPE 9'), recover(T(1, 30), 'Trot')), cool(T(10), 'Footing')],
    },
  },
  {
    id: 'run-seuil',
    kind: 'run',
    title: 'Seuil 3 × 8 min',
    hint: 'Allure soutenue mais contrôlée',
    intensity: 'intense',
    plan: {
      durationMin: 55,
      workout: [warm(T(15), 'Footing'), repeat(3, work(T(8), 'Seuil', 'RPE 7, phrases courtes'), recover(T(2), 'Trot')), cool(T(10), 'Footing')],
    },
  },
  {
    id: 'run-cotes',
    kind: 'run',
    title: 'Côtes 8 × 30 s',
    hint: 'Montée dynamique, retour en trottinant',
    intensity: 'intense',
    plan: {
      durationMin: 45,
      workout: [warm(T(20), 'Footing jusqu’à la côte'), repeat(8, work(S(30), 'Montée', 'Genoux hauts, buste droit'), recover(OPEN, 'Redescente en trottinant')), cool(T(10), 'Footing')],
    },
  },

  /* ---------------- Renfo coureur ---------------- */
  {
    id: 'strength',
    kind: 'strength',
    title: 'Renfo coureur',
    hint: '8 exercices guidés, 2 séries',
    intensity: 'facile',
    plan: { durationMin: 15, sets: 2 },
  },
  {
    id: 'strength-core',
    kind: 'strength',
    title: 'Gainage express',
    hint: '3 tours, 7 minutes',
    intensity: 'facile',
    plan: {
      durationMin: 7,
      workout: [
        repeat(
          3,
          work(S(30), 'Planche'),
          work(S(20), 'Planche latérale gauche'),
          work(S(20), 'Planche latérale droite'),
          work(S(30), 'Pont fessier tenu'),
          rest(S(30)),
        ),
      ],
    },
  },

  /* ---------------- Calisthénie ---------------- */
  {
    id: 'cali-beginner',
    kind: 'cali',
    title: 'Full body débutant',
    hint: '3 tours : pompes, tractions, squats, dips, gainage',
    intensity: 'facile',
    plan: {
      durationMin: 25,
      workout: [
        warm(T(5), 'Mobilité articulaire'),
        repeat(
          3,
          work(R(8), 'Pompes', 'Sur les genoux si besoin'),
          work(R(8), 'Tractions australiennes', 'Sous une table solide'),
          work(R(15), 'Squats'),
          work(R(8), 'Dips sur chaise'),
          work(S(30), 'Planche'),
          rest(S(90)),
        ),
        cool(T(5), 'Étirements'),
      ],
    },
  },
  {
    id: 'cali-push',
    kind: 'cali',
    title: 'Push (poussée)',
    hint: '4 tours : pompes, pompes piquées, dips',
    intensity: 'modéré',
    plan: {
      durationMin: 30,
      workout: [
        warm(T(5), 'Épaules, poignets'),
        repeat(4, work(R(12), 'Pompes'), work(R(6), 'Pompes piquées', 'Fesses hautes'), work(R(8), 'Dips'), rest(T(2))),
        cool(T(5), 'Étirements pectoraux'),
      ],
    },
  },
  {
    id: 'cali-pull',
    kind: 'cali',
    title: 'Pull (tirage)',
    hint: '4 tours : tractions australiennes, négatives, superman',
    intensity: 'modéré',
    plan: {
      durationMin: 30,
      workout: [
        warm(T(5), 'Épaules, omoplates'),
        repeat(4, work(R(10), 'Tractions australiennes'), work(R(4), 'Tractions négatives', 'Descente en 5 s'), work(R(12), 'Superman'), rest(T(2))),
        cool(T(5), 'Étirements dos'),
      ],
    },
  },
  {
    id: 'cali-legs',
    kind: 'cali',
    title: 'Jambes',
    hint: '4 tours : squats, fentes, pistol assisté, mollets',
    intensity: 'modéré',
    plan: {
      durationMin: 30,
      workout: [
        warm(T(5), 'Hanches, chevilles'),
        repeat(4, work(R(20), 'Squats'), work(R(12), 'Fentes alternées'), work(R(5), 'Pistol squat assisté', 'Par jambe'), work(R(20), 'Mollets'), rest(S(90))),
        cool(T(5), 'Étirements'),
      ],
    },
  },
  {
    id: 'cali-emom',
    kind: 'cali',
    title: 'EMOM 12 min',
    hint: 'Chaque minute, un exercice ; repos le reste de la minute',
    intensity: 'intense',
    plan: {
      durationMin: 22,
      workout: [
        warm(T(5)),
        repeat(4, work(T(1), '5 pompes + 10 squats'), work(T(1), '6 tractions australiennes'), work(T(1), 'Planche 40 s')),
        cool(T(5)),
      ],
    },
  },
  {
    id: 'cali-tabata',
    kind: 'cali',
    title: 'Tabata',
    hint: '8 × (20 s à fond + 10 s repos)',
    intensity: 'intense',
    plan: {
      durationMin: 14,
      workout: [warm(T(5)), repeat(8, work(S(20), 'Burpees ou mountain climbers', 'À fond'), rest(S(10))), cool(T(5))],
    },
  },

  /* ---------------- Natation ---------------- */
  {
    id: 'swim-endurance',
    kind: 'swim',
    title: 'Endurance 1 000 m',
    hint: '4 × 200 m crawl régulier',
    intensity: 'facile',
    plan: {
      durationMin: 35,
      workout: [warm(D(100), 'Crawl souple + dos'), repeat(4, work(D(200), 'Crawl', 'Régulier, souffle tous les 3 temps'), rest(S(30))), cool(D(100), 'Nage au choix')],
    },
  },
  {
    id: 'swim-technique',
    kind: 'swim',
    title: 'Technique crawl',
    hint: 'Éducatifs puis nage complète',
    intensity: 'facile',
    plan: {
      durationMin: 35,
      workout: [
        warm(D(200), 'Nage au choix'),
        repeat(6, work(D(50), 'Éducatif', 'Rattrapé ou poings fermés'), rest(S(20))),
        repeat(4, work(D(100), 'Crawl complet', 'Allonge la coulée'), rest(S(20))),
        cool(D(100), 'Dos'),
      ],
    },
  },
  {
    id: 'swim-pyramid',
    kind: 'swim',
    title: 'Pyramide',
    hint: '50-100-150-200-150-100-50 m',
    intensity: 'modéré',
    plan: {
      durationMin: 40,
      workout: [
        warm(D(200), 'Souple'),
        work(D(50)),
        rest(S(15)),
        work(D(100)),
        rest(S(20)),
        work(D(150)),
        rest(S(20)),
        work(D(200), undefined, 'Allure la plus régulière possible'),
        rest(S(30)),
        work(D(150)),
        rest(S(20)),
        work(D(100)),
        rest(S(15)),
        work(D(50), undefined, 'Un peu plus vite'),
        cool(D(100), 'Souple'),
      ],
    },
  },
  {
    id: 'swim-pull',
    kind: 'swim',
    title: 'Pull buoy 4 × 200 m',
    hint: 'Travail des bras, focus traction',
    intensity: 'modéré',
    plan: {
      durationMin: 35,
      workout: [warm(D(200)), repeat(4, work(D(200), 'Pull buoy', 'Traction longue sous le corps'), rest(S(30))), cool(D(100))],
    },
  },
  {
    id: 'swim-100',
    kind: 'swim',
    title: '10 × 100 m',
    hint: 'Soutenu, 20 s de repos',
    intensity: 'intense',
    plan: {
      durationMin: 40,
      workout: [warm(D(300), 'Progressif'), repeat(10, work(D(100), 'Crawl', 'Soutenu, RPE 7'), rest(S(20))), cool(D(200), 'Souple')],
    },
  },

  /* ---------------- Vélo ---------------- */
  {
    id: 'bike-recovery',
    kind: 'bike',
    title: 'Récupération',
    hint: '45 min très souple',
    intensity: 'facile',
    plan: { durationMin: 45, workout: [work(T(45), 'Souple', 'Petit braquet, cadence 90')] },
  },
  {
    id: 'bike-z2',
    kind: 'bike',
    title: 'Sortie endurance',
    hint: '1 h 30 en zone 2',
    intensity: 'facile',
    plan: { durationMin: 90, workout: [warm(T(10), 'Souple'), work(T(70), 'Endurance', 'Zone 2, tu peux parler'), cool(T(10), 'Souple')] },
  },
  {
    id: 'bike-cadence',
    kind: 'bike',
    title: 'Vélocité',
    hint: '6 × 1 min à cadence très haute',
    intensity: 'facile',
    plan: {
      durationMin: 53,
      workout: [warm(T(10)), repeat(6, work(T(1), 'Vélocité', 'Cadence 110+'), recover(T(2), 'Souple')), work(T(20), 'Endurance', 'Zone 2'), cool(T(5))],
    },
  },
  {
    id: 'bike-sweetspot',
    kind: 'bike',
    title: 'Sweet spot 3 × 10 min',
    hint: 'Soutenu mais tenable, récup 5 min',
    intensity: 'modéré',
    plan: {
      durationMin: 70,
      workout: [warm(T(15)), repeat(3, work(T(10), 'Sweet spot', '88-93 % FTP · RPE 6-7'), recover(T(5), 'Souple')), cool(T(10))],
    },
  },
  {
    id: 'bike-vo2',
    kind: 'bike',
    title: 'Intervalles 5 × 3 min',
    hint: 'Durs, récup égale',
    intensity: 'intense',
    plan: {
      durationMin: 55,
      workout: [warm(T(15)), repeat(5, work(T(3), 'Intervalle', 'RPE 8-9'), recover(T(3), 'Souple')), cool(T(10))],
    },
  },
  {
    id: 'bike-hills',
    kind: 'bike',
    title: 'Côtes 6 × 4 min',
    hint: 'Montées assis, cadence basse',
    intensity: 'intense',
    plan: {
      durationMin: 70,
      workout: [warm(T(20)), repeat(6, work(T(4), 'Montée', 'Assis, cadence 70'), recover(OPEN, 'Descente tranquille')), cool(T(10))],
    },
  },
];

export const libraryFor = (kind: CardTemplate['kind']) => LIBRARY.filter((t) => t.kind === kind);
