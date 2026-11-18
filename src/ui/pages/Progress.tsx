import { Lock } from 'lucide-preact';
import { addDays, diffDays, monthKey, weekStart } from '../../domain/dates';
import { fmtNum, formatPace, MONTHS_LONG, shortLabel } from '../../domain/format';
import { badges, hrCeilingOf, records, streak, type WeekMark } from '../../domain/gamification';
import { doneRunMinutesByWeek, loadCheck } from '../../domain/load';
import { efficiency, paceSecPerKm } from '../../domain/metrics';
import { cfgEff, sessions, settings, today } from '../../data/store';
import { badgeIcon } from '../icons';
import { Section } from '../kit';

const MARK_LABEL: Record<WeekMark, string> = {
  full: 'Semaine tenue',
  protected: 'Protégée par un joker',
  broken: 'Semaine à trou',
  pending: 'En cours',
};

export function Progress() {
  const t = today.value;
  const cfg = cfgEff.value;
  const all = sessions.value;
  const runs = all.filter((s) => s.kind === 'run' && s.status === 'done').sort((a, b) => a.date.localeCompare(b.date));
  const reprise = runs.filter((s) => s.date >= cfg.repriseStart);
  const st = streak(all, cfg, t);
  const rec = records(all, cfg, t);
  const kmMonth = runs.filter((s) => monthKey(s.date) === monthKey(t)).reduce((a, s) => a + (s.log?.distanceKm ?? 0), 0);
  const allBadges = badges(all, cfg, t);

  return (
    <>
      <header class="page-head">
        <h1 class="title">Progrès</h1>
      </header>

      <div class="list stats">
        <Stat label="Sorties depuis la reprise" value={String(reprise.length)} />
        <Stat label="Km ce mois-ci" value={fmtNum(kmMonth)} />
        <Stat label="Série actuelle" value={`${st.current} sem.`} />
        <Stat label="Meilleure série" value={`${st.best} sem.`} />
      </div>

      <Section title="Régularité">
        <div class="list">
          <div class="weeks">
            {st.marks.map((m) => (
              <div key={m.week} class={`wk wk--${m.mark}`} title={`${shortLabel(m.week)} · ${MARK_LABEL[m.mark]}`}>
                {m.runs}
              </div>
            ))}
          </div>
        </div>
        <p class="help">
          Une case par semaine, le chiffre compte les sorties. <span class="lg lg--full" /> tenue · <span class="lg lg--protected" />{' '}
          joker · <span class="lg lg--broken" /> trou
        </p>
      </Section>

      <WeeklyVolume />
      <EfficiencyChart />
      <RpeChart />

      <Section title="Records">
        <div class="list">
          <Row label="Plus longue sortie" value={rec.longestKm ? `${fmtNum(rec.longestKm.value, 2)} km` : '—'} />
          <Row label="Plus longue durée" value={rec.longestMin ? `${Math.round(rec.longestMin.value)} min` : '—'} />
          <Row label="Meilleure efficacité" value={rec.bestEfficiency ? fmtNum(rec.bestEfficiency.value, 3) : '—'} />
          <Row label="Plus grosse semaine" value={rec.bestWeekMin ? `${Math.round(rec.bestWeekMin.value)} min` : '—'} />
          <Row label="Plus longue série" value={`${rec.bestStreak} sem.`} />
        </div>
      </Section>

      <Section title="Badges" aside={`${allBadges.filter((b) => b.unlocked).length} sur ${allBadges.length}`}>
        <div class="list badges">
          {allBadges.map((b) => {
            const I = b.unlocked ? badgeIcon(b.id) : Lock;
            return (
              <div key={b.id} class={`badge ${b.unlocked ? 'badge--on' : ''}`} title={b.desc}>
                <I size={22} strokeWidth={1.5} />
                <strong>{b.name}</strong>
                <small>{b.desc}</small>
              </div>
            );
          })}
        </div>
      </Section>

      <MonthlyHistory />

      <Section title="Dernières sorties">
        <div class="list">
          {runs
            .slice(-6)
            .reverse()
            .map((s) => {
              const p = paceSecPerKm(s.log);
              const value = [
                s.log?.distanceKm ? `${fmtNum(s.log.distanceKm, 2)} km` : '',
                p ? formatPace(p) : '',
                s.log?.avgHr ? `${s.log.avgHr} bpm` : '',
              ]
                .filter(Boolean)
                .join(' · ');
              return (
                <div key={s.id} class="row">
                  <div class="row__main">
                    <div class="row__title">{s.title}</div>
                    <div class="row__meta">{shortLabel(s.date)}</div>
                  </div>
                  <span class="row__aside">{value}</span>
                </div>
              );
            })}
        </div>
        <p class="help">Plafond FC actuel : {cfg.efHrCeiling} bpm, modifiable dans les réglages.</p>
      </Section>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div class="stat">
      <small>{label}</small>
      <strong>{value}</strong>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div class="row">
      <span class="row__main row__title">{label}</span>
      <span class="row__aside">{value}</span>
    </div>
  );
}

/* ---------- Graphiques SVG légers ---------- */

const W = 320;
const H = 140;
const PAD = { l: 28, r: 8, t: 12, b: 22 };

function WeeklyVolume() {
  const t = today.value;
  const cfg = settings.value;
  const done = doneRunMinutesByWeek(sessions.value);
  const cur = weekStart(t);
  const weeks = Array.from({ length: 8 }, (_, i) => addDays(cur, -7 * (7 - i)));
  const vals = weeks.map((w) => done.get(w) ?? 0);
  const lc = loadCheck(sessions.value, cfg, cur);
  const max = Math.max(30, ...vals, lc?.allowedMin ?? 0) * 1.15;
  const bw = (W - PAD.l - PAD.r) / weeks.length;
  const y = (v: number) => H - PAD.b - (v / max) * (H - PAD.t - PAD.b);

  return (
    <Section title="Volume hebdomadaire" aside="minutes de course">
      <div class="list">
        <svg viewBox={`0 0 ${W} ${H}`} class="chart" role="img" aria-label="Minutes de course par semaine sur 8 semaines">
          <line x1={PAD.l} x2={W - PAD.r} y1={y(0)} y2={y(0)} class="axis" />
          {weeks.map((w, i) => (
            <g key={w}>
              <rect
                x={PAD.l + i * bw + 7}
                y={y(vals[i])}
                width={bw - 14}
                height={Math.max(0, y(0) - y(vals[i]))}
                rx={3}
                class={w === cur ? 'bar-cur' : 'bar-past'}
              />
              {vals[i] > 0 && (
                <text x={PAD.l + i * bw + bw / 2} y={y(vals[i]) - 4} class="lbl" text-anchor="middle">
                  {Math.round(vals[i])}
                </text>
              )}
              <text x={PAD.l + i * bw + bw / 2} y={H - 6} class="lbl" text-anchor="middle">
                {shortLabel(w).split(' ')[1]}
              </text>
            </g>
          ))}
          {lc && (
            <>
              <line x1={PAD.l} x2={W - PAD.r} y1={y(lc.allowedMin)} y2={y(lc.allowedMin)} class="limit" />
              <text x={PAD.l + 2} y={y(lc.allowedMin) - 4} class="lbl lbl--warn">
                max conseillé {Math.round(lc.allowedMin)}
              </text>
            </>
          )}
        </svg>
      </div>
      <p class="help">La ligne des +10 % apparaît après deux semaines d’historique.</p>
    </Section>
  );
}

function EfficiencyChart() {
  const cfg = settings.value;
  const pts = sessions.value
    .filter((s) => s.kind === 'run' && s.status === 'done')
    .map((s) => ({ s, ef: efficiency(s.log) }))
    .filter((p): p is { s: (typeof p)['s']; ef: number } => p.ef !== undefined)
    .sort((a, b) => a.s.date.localeCompare(b.s.date));

  if (pts.length === 0) return null;
  const first = pts[0].s.date;
  const span = Math.max(14, diffDays(first, pts[pts.length - 1].s.date));
  const lo = Math.min(...pts.map((p) => p.ef)) * 0.9;
  const hi = Math.max(...pts.map((p) => p.ef)) * 1.1;
  const x = (d: string) => PAD.l + (diffDays(first, d) / span) * (W - PAD.l - PAD.r - 10) + 5;
  const y = (v: number) => H - PAD.b - ((v - lo) / (hi - lo || 1)) * (H - PAD.t - PAD.b);
  const path = pts.map((p, i) => `${i ? 'L' : 'M'}${x(p.s.date)},${y(p.ef)}`).join(' ');

  return (
    <Section title="Efficacité à l’effort" aside="vitesse ÷ FC">
      <div class="list">
        <svg viewBox={`0 0 ${W} ${H}`} class="chart" role="img" aria-label="Évolution de l’efficacité : vitesse divisée par la fréquence cardiaque">
          <line x1={PAD.l} x2={W - PAD.r} y1={H - PAD.b} y2={H - PAD.b} class="axis" />
          {pts.length > 1 && <path d={path} class="line" />}
          {pts.map((p) => (
            <g key={p.s.id}>
              <circle cx={x(p.s.date)} cy={y(p.ef)} r={4} class={p.s.log!.avgHr! <= hrCeilingOf(p.s, cfg) ? 'pt' : 'pt pt--hot'} />
              <text x={x(p.s.date)} y={H - 6} class="lbl" text-anchor="middle">
                {shortLabel(p.s.date).split(' ').slice(1).join(' ')}
              </text>
            </g>
          ))}
        </svg>
      </div>
      <p class="help">
        Si la courbe monte, tu vas plus vite pour le même effort. <span class="lg lg--full" /> sous le plafond FC ·{' '}
        <span class="lg lg--hot" /> au-dessus
      </p>
    </Section>
  );
}

function RpeChart() {
  const pts = sessions.value
    .filter((s) => s.status === 'done' && s.log?.rpe != null)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-12);
  if (!pts.length) return null;
  const bw = (W - PAD.l - PAD.r) / 12;
  const y = (v: number) => H - PAD.b - (v / 10) * (H - PAD.t - PAD.b);
  return (
    <Section title="Ressenti" aside="12 dernières séances">
      <div class="list">
        <svg viewBox={`0 0 ${W} ${H}`} class="chart" role="img" aria-label="Ressenti des 12 dernières séances">
          {[3, 7].map((v) => (
            <line key={v} x1={PAD.l} x2={W - PAD.r} y1={y(v)} y2={y(v)} class="grid" />
          ))}
          <text x={8} y={y(3) + 4} class="lbl">
            3
          </text>
          <text x={8} y={y(7) + 4} class="lbl">
            7
          </text>
          {pts.map((s, i) => (
            <circle key={s.id} cx={PAD.l + i * bw + bw / 2} cy={y(s.log!.rpe!)} r={4} class={s.kind === 'run' ? 'pt' : 'pt pt--other'} />
          ))}
        </svg>
      </div>
      <p class="help">En endurance fondamentale, vise 3 à 5 sur 10.</p>
    </Section>
  );
}

function MonthlyHistory() {
  const cfg = settings.value;
  const runs = sessions.value.filter((s) => s.kind === 'run' && s.status === 'done');
  const months = new Map<string, number>(cfg.history.map((h) => [h.month, h.km]));
  for (const s of runs) {
    const m = monthKey(s.date);
    if (cfg.history.some((h) => h.month === m)) continue; // l'historique saisi fait foi
    months.set(m, (months.get(m) ?? 0) + (s.log?.distanceKm ?? 0));
  }
  const rows = [...months.entries()].sort(([a], [b]) => a.localeCompare(b)).slice(-8);
  const max = Math.max(...rows.map(([, v]) => v), 1);
  return (
    <Section title="Volume mensuel" aside="km">
      <div class="list">
        <ul class="hbars">
          {rows.map(([m, km]) => (
            <li key={m}>
              <span>{MONTHS_LONG[Number(m.slice(5)) - 1].slice(0, 4)}.</span>
              <div class="hbar">
                <i style={{ width: `${(km / max) * 100}%` }} />
              </div>
              <b>{fmtNum(km)}</b>
            </li>
          ))}
        </ul>
      </div>
    </Section>
  );
}
