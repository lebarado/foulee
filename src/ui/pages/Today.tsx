import type { ComponentChildren } from 'preact';
import { CalendarClock, ChartColumn, Clock, Flame, MapPin, Moon, Plus, RotateCcw, Shield, Star, Target } from 'lucide-preact';
import { cardState, type CardState } from '../../domain/cards';
import { weekStart } from '../../domain/dates';
import { longLabel, relLabel } from '../../domain/format';
import { streak, weekQuests } from '../../domain/gamification';
import { levelTitle } from '../../domain/levels';
import { loadCheck } from '../../domain/load';
import type { Session } from '../../domain/types';
import { cfgEff, level, sessions, settings, today, xpTotal } from '../../data/store';
import { KindIcon, QUEST_ICONS, type IconC } from '../icons';
import { SessionCard } from '../SessionCard';
import { openSheet } from '../state';
import { player } from '../playerStore';

const byDate = (a: { s: Session }, b: { s: Session }) => a.s.date.localeCompare(b.s.date) || a.s.kind.localeCompare(b.s.kind);

export function Today() {
  const t = today.value;
  const cfg = settings.value;
  const all = sessions.value;
  const items = all
    .filter((s) => s.status !== 'skipped')
    .map((s) => ({ s, st: cardState(s, t, cfg) }))
    .sort(byDate);
  const pick = (...st: CardState[]) => items.filter((x) => st.includes(x.st));

  const overdue = pick('overdue');
  const todays = items.filter((x) => x.s.date === t && x.st !== 'missed');
  const soon = pick('soon');
  const later = pick('upcoming').slice(0, 5);
  const nextRun = items.find((x) => x.s.kind === 'run' && ['today', 'soon', 'upcoming', 'overdue'].includes(x.st));
  const week = weekStart(t);
  const lc = loadCheck(all, cfg, week);
  // Gros bouton « Fait » réservé à la première séance du jour ; les autres ont le rond.
  const primaryId = items.find((x) => x.st === 'today')?.s.id;
  const card = (s: Session) => <SessionCard key={s.id} s={s} coach={s.id === nextRun?.s.id} primary={s.id === primaryId} />;

  return (
    <>
      <Header />

      {lc?.over && (
        <div class="banner banner--warn">
          <ChartColumn size={18} /> Cette semaine : {Math.round(lc.plannedMin)} min de course prévues, repère conseillé ≈{' '}
          {Math.round(lc.allowedMin)} min (+10 % max). Pense à raccourcir une sortie.
        </div>
      )}

      {overdue.length > 0 && (
        <Section title="À rattraper" icon={RotateCcw}>
          {overdue.map(({ s }) => card(s))}
        </Section>
      )}

      <Section title="Aujourd’hui" icon={MapPin}>
        {todays.length ? (
          todays.map(({ s }) => card(s))
        ) : (
          <div class="rest-card">
            <span class="rest-card__icon">
              <Moon size={26} />
            </span>
            <div>
              <strong>Jour de repos</strong>
              <p class="muted">La récup fait partie de l’entraînement.</p>
            </div>
          </div>
        )}
      </Section>

      {soon.length > 0 && (
        <Section title="Dans les 48 h" icon={Clock}>
          {soon.map(({ s }) => card(s))}
        </Section>
      )}

      <Quests week={week} />

      {later.length > 0 && (
        <Section title="Plus tard" icon={CalendarClock}>
          <ul class="later">
            {later.map(({ s }) => (
              <li key={s.id}>
                <button class={`later__item later__item--${s.kind}`} onClick={() => openSheet({ type: 'session', id: s.id })}>
                  <KindIcon kind={s.kind} size={20} />
                  <span class="later__title">{s.title}</span>
                  <span class="muted">{relLabel(s.date, t)}</span>
                </button>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {!player.value && (
        <button class="fab" aria-label="Nouvelle carte" onClick={() => openSheet({ type: 'edit' })}>
          <Plus size={30} strokeWidth={2.6} />
        </button>
      )}
    </>
  );
}

function Header() {
  const t = today.value;
  const lv = level.value;
  const st = streak(sessions.value, cfgEff.value, t);
  const deg = Math.round(lv.progress * 360);
  return (
    <header class="hero">
      <div class="hero__text">
        <p class="muted">{longLabel(t)}</p>
        <h1 class="hero__title">{levelTitle(lv.level)}</h1>
        <div class="hero__pills">
          <span class="pill-stat pill-stat--fire">
            <Flame size={16} /> {st.current} sem.
          </span>
          <span class="pill-stat pill-stat--xp">
            <Star size={16} /> {xpTotal.value} XP
          </span>
          {st.jokersLeft > 0 && (
            <span class="pill-stat">
              <Shield size={16} /> {st.jokersLeft} joker{st.jokersLeft > 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>
      <button
        class="ring ring--btn"
        aria-label={`Niveau ${lv.level}, voir le détail`}
        style={{ background: `conic-gradient(var(--xp) ${deg}deg, var(--surface-3) 0)` }}
        onClick={() => openSheet({ type: 'level' })}
      >
        <span class="ring__inner">
          <small>Niv.</small>
          <strong>{lv.level}</strong>
        </span>
      </button>
    </header>
  );
}

function Quests({ week }: { week: string }) {
  const qs = weekQuests(sessions.value, settings.value, week);
  return (
    <Section title="Quêtes de la semaine" icon={Target}>
      <div class="quests">
        {qs.map((q) => {
          const I = QUEST_ICONS[q.icon] ?? Target;
          return (
            <div key={q.id} class={`quest ${q.done ? 'quest--done' : ''}`}>
              <span class="quest__icon" aria-hidden="true">
                <I size={20} />
              </span>
              <div class="quest__body">
                <div class="quest__label">
                  <span>{q.label}</span>
                  <span class="quest__xp">+{q.xp}</span>
                </div>
                <div class="bar">
                  <div class="bar__fill" style={{ width: `${(q.progress / q.goal) * 100}%` }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Section>
  );
}

export function Section({ title, icon: I, children }: { title: string; icon: IconC; children: ComponentChildren }) {
  return (
    <section class="section">
      <h2 class="section__title">
        <I size={17} aria-hidden="true" /> {title}
      </h2>
      {children}
    </section>
  );
}
