import { effect, signal } from '@preact/signals';
import {
  buildSteps,
  completedSets,
  isLastStep,
  nextStep,
  pausePlayer,
  resumePlayer,
  startPlayer,
  totalElapsed,
  undoStep,
  type PlayerState,
} from '../domain/player';
import type { Session } from '../domain/types';
import { openSheet } from './state';
import { isGuidedStrength } from './text';

const KEY = 'foulee-player';

function load(): PlayerState | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as PlayerState) : null;
  } catch {
    return null;
  }
}

/** Séance en cours (survit à un rechargement ou à la fermeture de l'app). */
export const player = signal<PlayerState | null>(load());
/** L'écran en cours est réduit : on navigue dans l'app pendant que le chrono tourne. */
export const playerMinimized = signal(false);
/** Horodatage du dernier passage d'étape, pour proposer « Annuler » bien en vue. */
export const lastAdvanceAt = signal(0);

effect(() => {
  try {
    if (player.value) localStorage.setItem(KEY, JSON.stringify(player.value));
    else localStorage.removeItem(KEY);
  } catch {
    /* stockage indisponible : le chrono marche quand même, sans reprise */
  }
});

let audio: AudioContext | null = null;

/** Petit bip + vibration aux changements d'étape automatiques. */
export function signalStep() {
  navigator.vibrate?.([180, 80, 180]);
  try {
    if (!audio) return;
    const o = audio.createOscillator();
    const g = audio.createGain();
    o.frequency.value = 880;
    g.gain.setValueAtTime(0.15, audio.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.25);
    o.connect(g).connect(audio.destination);
    o.start();
    o.stop(audio.currentTime + 0.25);
  } catch {
    /* pas de son, tant pis */
  }
}

const now = () => Date.now();

export const playerActions = {
  start(s: Session) {
    if (player.value && player.value.sessionId !== s.id && !confirm('Une autre séance est en cours. La remplacer ?')) return;
    try {
      // Le son doit être activé par un geste de l'utilisateur : on le prépare ici.
      audio ??= new AudioContext();
    } catch {
      audio = null;
    }
    if (player.value?.sessionId !== s.id) player.value = startPlayer(s.id, buildSteps(s), now());
    playerMinimized.value = false;
  },
  next(at = now()) {
    if (!player.value) return;
    player.value = nextStep(player.value, at);
    lastAdvanceAt.value = Date.now();
  },
  undo() {
    if (player.value) player.value = undoStep(player.value, now());
    lastAdvanceAt.value = 0;
  },
  pause() {
    if (player.value) player.value = pausePlayer(player.value, now());
  },
  resume() {
    if (player.value) player.value = resumePlayer(player.value, now());
  },
  abandon() {
    player.value = null;
  },
  /** Fin de séance : on passe à la saisie (ressenti…) avec la durée chronométrée. */
  finish(s: Session) {
    const p = player.value;
    if (!p) return;
    const durationSec = Math.round(totalElapsed(p, now()) / 1000);
    if (isGuidedStrength(s)) openSheet({ type: 'strength', id: s.id, durationSec, sets: completedSets(p, isLastStep(p)), atEnd: true });
    else openSheet({ type: 'runDone', id: s.id, durationSec });
    player.value = null;
    playerMinimized.value = false;
  },
};
