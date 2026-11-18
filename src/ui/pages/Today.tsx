import type { ComponentChildren } from 'preact';
import { cardState, type CardState } from '../../domain/cards';
import { weekStart } from '../../domain/dates';
import { longLabel, relLabel } from '../../domain/format';
import { streak, weekQuests } from '../../domain/gamification';
import { loadCheck } from '../../domain/load';
import type { Session } from '../../domain/types';
import { level, sessions, settings, today, xpTotal } from '../../data/store';
import { SessionCard } from '../SessionCard';
import { openSheet } from '../state';
import { kindEmoji } from '../text';

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
  const soon = pick('toConfirm', 'confirmed');
  const later = pick('upcoming').slice(0, 5);
  const nextRun = items.find((x) => x.s.kind === 'run' && ['today', 'toConfirm', 'confirmed', 'upcoming', 'overdue'].includes(x.st));
  const week = weekStart(t);
  const lc = loadCheck(all, cfg, week);

  return (
    <>
      <Header />

      {lc?.over && (
        <div class="banner banner--warn">
          📊 Cette semaine : {Math.round(lc.plannedMin)} min de course prévues, repère conseillé ≈ {Math.round(lc.allowedMin)} min
          (+10 % max). Pense à raccourcir une sortie.
        </div>
      )}

      {overdue.length > 0 && (
        <Section title="À rattraper" emoji="⏪">
          {overdue.map(({ s }) => (
            <SessionCard key={s.id} s={s} coach={s.id === nextRun?.s.id} />
          ))}
        </Section>
      )}

      <Section title="Aujourd’hui" emoji="📍">
        {todays.length ? (
          todays.map(({ s }) => <SessionCard key={s.id} s={s} coach={s.id === nextRun?.s.id} />)
        ) : (
          <div class="rest-card">
            <span class="rest-card__emoji">😌</span>
            <div>
              <strong>Jour de repos</strong>
              <p class="muted">La récup fait partie de l’entraînement.</p>
            </div>
          </div>
        )}
      </Section>

      {soon.length > 0 && (
        <Section title="À caler · 48 h" emoji="👆">
          {soon.map(({ s }) => (
            <SessionCard key={s.id} s={s} coach={s.id === nextRun?.s.id} />
          ))}
        </Section>
      )}

      <Quests week={week} />

      {later.length > 0 && (
        <Section title="Plus tard" emoji="🔭">
          <ul class="later">
            {later.map(({ s }) => (
              <li key={s.id}>
                <button class="later__item" onClick={() => openSheet({ type: 'session', id: s.id })}>
                  <span aria-hidden="true">{kindEmoji(s)}</span>
                  <span class="later__title">{s.title}</span>
                  <span class="muted">{relLabel(s.date, t)}</span>
                </button>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <button class="fab" aria-label="Nouvelle carte" onClick={() => openSheet({ type: 'new' })}>
        +
      </button>
      <p class="sr-only">XP total : {xpTotal.value}</p>
    </>
  );
}

function Header() {
  const t = today.value;
  const lv = level.value;
  const st = streak(sessions.value, settings.value, t);
  const deg = Math.round(lv.progress * 360);
  return (
    <header class="hero">
      <div class="hero__text">
        <p class="muted">{longLabel(t)}</p>
        <h1 class="hero__title">On garde le rythme</h1>
        <div class="hero__pills">
          <span class="pill-stat pill-stat--fire">🔥 {st.current} sem.</span>
          <span class="pill-stat pill-stat--xp">⭐ {xpTotal.value} XP</span>
          {st.jokersLeft > 0 && <span class="pill-stat">🃏 {st.jokersLeft} joker</span>}
        </div>
      </div>
      <div class="ring" style={{ background: `conic-gradient(var(--xp) ${deg}deg, var(--surface-3) 0)` }}>
        <div class="ring__inner">
          <small>Niv.</small>
          <strong>{lv.level}</strong>
        </div>
      </div>
    </header>
  );
}

function Quests({ week }: { week: string }) {
  const qs = weekQuests(sessions.value, settings.value, week);
  return (
    <Section title="Quêtes de la semaine" emoji="🎯">
      <div class="quests">
        {qs.map((q) => (
          <div key={q.id} class={`quest ${q.done ? 'quest--done' : ''}`}>
            <span class="quest__emoji" aria-hidden="true">{q.done ? '✅' : q.emoji}</span>
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
        ))}
      </div>
    </Section>
  );
}

export function Section({ title, emoji, children }: { title: string; emoji: string; children: ComponentChildren }) {
  return (
    <section class="section">
      <h2 class="section__title">
        <span aria-hidden="true">{emoji}</span> {title}
      </h2>
      {children}
    </section>
  );
}
