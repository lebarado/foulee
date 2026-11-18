import { Check, ChevronRight, Plus, TriangleAlert } from 'lucide-preact';
import { cardState, type CardState } from '../../domain/cards';
import { weekStart } from '../../domain/dates';
import { longLabel, relLabel } from '../../domain/format';
import { streak, weekQuests } from '../../domain/gamification';
import { levelTitle } from '../../domain/levels';
import { loadCheck } from '../../domain/load';
import type { Session } from '../../domain/types';
import { cfgEff, level, sessions, settings, today, xpTotal } from '../../data/store';
import { KindIcon } from '../icons';
import { Progress, Ring, Section } from '../kit';
import { SessionCard } from '../SessionCard';
import { openSheet } from '../state';

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
  // Une seule action principale : la première séance du jour encore à faire.
  const primaryId = todays.find((x) => x.st === 'today')?.s.id;
  const week = weekStart(t);
  const lc = loadCheck(all, cfg, week);
  const card = (s: Session) => <SessionCard key={s.id} s={s} coach={s.id === nextRun?.s.id} primary={s.id === primaryId} />;

  return (
    <>
      <Header />

      {lc?.over && (
        <p class="notice">
          <TriangleAlert size={16} strokeWidth={1.75} />
          <span>
            {Math.round(lc.plannedMin)} min de course prévues cette semaine, pour un repère de {Math.round(lc.allowedMin)} min
            (+10 % max). Raccourcis une sortie.
          </span>
        </p>
      )}

      {overdue.length > 0 && (
        <Section title="À rattraper">
          <div class="list">{overdue.map(({ s }) => card(s))}</div>
        </Section>
      )}

      <Section title="Au programme">
        <div class="list">{todays.length ? todays.map(({ s }) => card(s)) : <p class="empty">Repos. Rien de prévu aujourd’hui.</p>}</div>
      </Section>

      {soon.length > 0 && (
        <Section title="Prochaines 48 h">
          <div class="list">{soon.map(({ s }) => card(s))}</div>
        </Section>
      )}

      <Quests week={week} />

      {later.length > 0 && (
        <Section title="Plus tard">
          <div class="list">
            {later.map(({ s }) => (
              <button key={s.id} class="row" onClick={() => openSheet({ type: 'session', id: s.id })}>
                <span class="row__icon">
                  <KindIcon kind={s.kind} size={18} />
                </span>
                <span class="row__main row__title">{s.title}</span>
                <span class="row__aside">{relLabel(s.date, t)}</span>
              </button>
            ))}
          </div>
        </Section>
      )}

      <button class="fab" aria-label="Nouvelle séance" onClick={() => openSheet({ type: 'edit' })}>
        <Plus size={24} strokeWidth={2} />
      </button>
    </>
  );
}

function Header() {
  const t = today.value;
  const lv = level.value;
  const st = streak(sessions.value, cfgEff.value, t);
  const extra = [`${xpTotal.value} XP`, `série de ${st.current} sem.`];
  if (st.jokersLeft > 0) extra.push(`${st.jokersLeft} joker${st.jokersLeft > 1 ? 's' : ''}`);
  return (
    <header class="page-head">
      <p class="eyebrow">{longLabel(t)}</p>
      <h1 class="title">Aujourd’hui</h1>
      <button class="level" onClick={() => openSheet({ type: 'level' })} aria-label={`Niveau ${lv.level}, voir le détail`}>
        <Ring value={lv.progress} size={22} />
        <span>
          <strong>
            Niveau {lv.level} · {levelTitle(lv.level)}
          </strong>
          <br />
          {extra.join(' · ')}
        </span>
        <ChevronRight size={16} strokeWidth={1.75} class="level__chev" />
      </button>
    </header>
  );
}

function Quests({ week }: { week: string }) {
  const qs = weekQuests(sessions.value, settings.value, week);
  return (
    <Section title="Cette semaine">
      <div class="list">
        {qs.map((q) => (
          <div key={q.id} class={`quest ${q.done ? 'quest--done' : ''}`}>
            <div class="quest__top">
              <span class="quest__label">{q.label}</span>
              {q.done ? (
                <Check size={16} strokeWidth={2.25} class="quest__done" aria-label="Terminée" />
              ) : (
                <span class="quest__count">
                  {q.progress}/{q.goal}
                </span>
              )}
              <span class="quest__xp">+{q.xp}</span>
            </div>
            <Progress value={q.progress / q.goal} />
          </div>
        ))}
      </div>
    </Section>
  );
}
