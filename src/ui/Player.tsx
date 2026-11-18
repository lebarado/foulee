import { ChevronDown, ChevronRight, Pause, Play, Undo2, X } from 'lucide-preact';
import type { ComponentChildren } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { useSwipeDown } from './useSwipeDown';
import {
  formatClock,
  isLastStep,
  stepElapsed,
  stepRemaining,
  totalElapsed,
  type PlayerStep,
} from '../domain/player';
import { STEP_LABEL, measureLabel } from '../domain/workout';
import { sessions } from '../data/store';
import { lastAdvanceAt, player, playerActions, playerMinimized, signalStep } from './playerStore';

/** Rafraîchit l'affichage plusieurs fois par seconde tant que le composant est monté. */
function useNow(ms = 250) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}

/** Garde l'écran allumé pendant la séance (si le navigateur le permet). */
function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    const get = () =>
      navigator.wakeLock
        .request('screen')
        .then((l) => (lock = l))
        .catch(() => undefined);
    void get();
    const onVis = () => document.visibilityState === 'visible' && void get();
    document.addEventListener('visibilitychange', onVis);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      void lock?.release();
    };
  }, [active]);
}

const stepTitle = (s: PlayerStep) => s.label || STEP_LABEL[s.kind];

function stepSub(s: PlayerStep) {
  if (!s.round || !s.rounds) return '';
  return s.exerciseId ? `Série ${s.round} sur ${s.rounds}` : `Tour ${s.round} sur ${s.rounds}`;
}

/** Écran « séance en cours » : chrono, étape en grand, gros bouton suivant, annulation facile. */
export function PlayerView() {
  const p = player.value;
  const session = p ? sessions.value.find((x) => x.id === p.sessionId) : undefined;
  const now = useNow();
  const [ask, setAsk] = useState<'quit' | 'finish' | null>(null);
  const autoDone = useRef<number>(-1);
  useWakeLock(!!p && !playerMinimized.value);

  // Étape chronométrée terminée : passage automatique (bip + vibration). Annulable.
  const remaining = p ? stepRemaining(p, now) : null;
  useEffect(() => {
    if (!p || remaining === null || remaining > 0 || p.runningSince === null) return;
    if (autoDone.current === p.index) return;
    autoDone.current = p.index;
    signalStep();
    if (!isLastStep(p)) playerActions.next();
  }, [p, remaining]);

  // Séance supprimée entre-temps : on libère le chrono.
  useEffect(() => {
    if (p && !session) playerActions.abandon();
  }, [p, session]);

  if (!p || !session) return null;
  if (playerMinimized.value) return <MiniBar title={session.title} elapsed={totalElapsed(p, now)} />;

  const step = p.steps[p.index];
  const next = p.steps[p.index + 1];
  const last = isLastStep(p);
  const running = p.runningSince !== null;
  const recentAdvance = now - lastAdvanceAt.value < 5000 && p.history.length > 0;
  const timeUp = remaining !== null && remaining <= 0;

  return (
    <SwipeShell kind={session.kind}>
      <div class="player__grab" aria-hidden="true" />
      <div class="player__top">
        <button class="player__icon" aria-label="Quitter la séance" onClick={() => setAsk('quit')}>
          <X size={22} />
        </button>
        <div class="player__title">
          <small>{session.title}</small>
          <strong class="player__total">{formatClock(totalElapsed(p, now))}</strong>
        </div>
        <button class="player__icon" aria-label="Réduire" onClick={() => (playerMinimized.value = true)}>
          <ChevronDown size={22} />
        </button>
      </div>

      <div class="player__progress" aria-hidden="true">
        <i style={{ width: `${((p.index + (last ? 1 : 0)) / p.steps.length) * 100}%` }} />
      </div>
      <p class="player__count">
        Étape {p.index + 1} sur {p.steps.length}
      </p>

      <div class={`player__step player__step--${step.kind}`}>
        <span class="player__kind">{STEP_LABEL[step.kind]}</span>
        {stepSub(step) && <span class="player__round">{stepSub(step)}</span>}
        <h2 class="player__label">{stepTitle(step)}</h2>

        {remaining !== null ? (
          <div class={`player__clock ${timeUp ? 'player__clock--up' : ''}`}>{timeUp ? 'Terminé' : formatClock(remaining + 999)}</div>
        ) : (
          <>
            <div class="player__dose">{step.dose ?? measureLabel(step.measure)}</div>
            <div class="player__clock player__clock--small">{formatClock(stepElapsed(p, now))}</div>
          </>
        )}
        {step.target && <p class="player__target">{step.target}</p>}
        {!running && <p class="player__paused">En pause</p>}
      </div>

      {next && (
        <p class="player__next">
          Ensuite : <strong>{stepTitle(next)}</strong> · {next.dose ?? measureLabel(next.measure)}
        </p>
      )}

      <div class="player__bottom">
        {ask ? (
          <Confirm
            kind={ask}
            onCancel={() => setAsk(null)}
            onFinish={() => playerActions.finish(session)}
            onAbandon={() => {
              if (confirm('Abandonner la séance ? Le chrono sera perdu.')) playerActions.abandon();
            }}
          />
        ) : (
          <>
            <div class="player__aux">
              <button
                class={`player__undo ${recentAdvance ? 'player__undo--hot' : ''}`}
                disabled={p.history.length === 0}
                onClick={() => playerActions.undo()}
              >
                <Undo2 size={18} /> {recentAdvance ? 'Oups, annuler' : 'Étape précédente'}
              </button>
              <button class="player__pause" onClick={() => (running ? playerActions.pause() : playerActions.resume())}>
                {running ? <Pause size={18} /> : <Play size={18} />} {running ? 'Pause' : 'Reprendre'}
              </button>
            </div>
            {last ? (
              <button class="player__go player__go--finish" onClick={() => setAsk('finish')}>
                Terminer la séance
              </button>
            ) : (
              <button class="player__go" onClick={() => playerActions.next()}>
                Étape suivante <ChevronRight size={30} strokeWidth={2.6} />
              </button>
            )}
          </>
        )}
      </div>
    </SwipeShell>
  );
}

/** Conteneur plein écran : glisser vers le bas réduit la séance (le chrono continue). */
function SwipeShell({ kind, children }: { kind: string; children: ComponentChildren }) {
  const ref = useSwipeDown<HTMLDivElement>(() => (playerMinimized.value = true));
  return (
    <div ref={ref} class={`player player--${kind}`} role="dialog" aria-modal="true" aria-label="Séance en cours">
      {children}
    </div>
  );
}

function Confirm({ kind, onCancel, onFinish, onAbandon }: {
  kind: 'quit' | 'finish';
  onCancel: () => void;
  onFinish: () => void;
  onAbandon: () => void;
}) {
  return (
    <div class="player__confirm">
      <p>{kind === 'finish' ? 'Terminer la séance ?' : 'Quitter la séance en cours ?'}</p>
      <button class="player__go player__go--finish" onClick={onFinish}>
        Terminer et enregistrer
      </button>
      <div class="player__aux">
        <button class="player__pause" onClick={onCancel}>
          Continuer la séance
        </button>
        {kind === 'quit' && (
          <button class="player__pause player__danger" onClick={onAbandon}>
            Abandonner
          </button>
        )}
      </div>
    </div>
  );
}

/** Barre « séance en cours » quand l'écran est réduit. */
function MiniBar({ title, elapsed }: { title: string; elapsed: number }) {
  return (
    <button class="player-mini" onClick={() => (playerMinimized.value = false)}>
      <span class="player-mini__dot" />
      <span class="player-mini__title">{title}</span>
      <strong>{formatClock(elapsed)}</strong>
      <span class="player-mini__go">Reprendre</span>
    </button>
  );
}
