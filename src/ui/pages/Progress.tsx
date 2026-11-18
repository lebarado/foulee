import { Award, ChartColumn, Flame, Footprints, HeartPulse, History, Lock, Smile, Trophy } from 'lucide-preact';
import { addDays, diffDays, monthKey, weekStart } from '../../domain/dates';
import { fmtNum, formatPace, MONTHS_LONG, shortLabel } from '../../domain/format';
import { badges, hrCeilingOf, records, streak, type WeekMark } from '../../domain/gamification';
import { doneRunMinutesByWeek, loadCheck } from '../../domain/load';
import { efficiency, paceSecPerKm } from '../../domain/metrics';
import { cfgEff, sessions, settings, today } from '../../data/store';
import { badgeIcon } from '../icons';
import { Section } from './Today';

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

  return (
    <>
      <h1 class="page-title">Progrès</h1>

      <div class="stats">
        <Stat label="Sorties depuis la reprise" value={String(reprise.length)} />
        <Stat label="Km ce mois-ci" value={fmtNum(kmMonth)} />
        <Stat label="Série actuelle" value={`${st.current} sem.`} />
        <Stat label="Meilleure série" value={`${st.best} sem.`} />
      </div>

      <Section title="Régularité" icon={Flame}>
        <div class="weeks">
          {st.marks.map((m) => (
            <div key={m.week} class={`wk wk--${m.mark}`} title={`${shortLabel(m.week)} · ${MARK_LABEL[m.mark]}`}>
              <span>{m.runs}</span>
            </div>
          ))}
        </div>
        <p class="help">
          Une case = une semaine (chiffre = sorties). <span class="lg lg--full" /> tenue · <span class="lg lg--protected" /> joker ·{' '}
          <span class="lg lg--broken" /> trou · <span class="lg lg--pending" /> en cours
        </p>
      </Section>

      <WeeklyVolume />
      <EfficiencyChart />
      <RpeChart />

      <Section title="Records" icon={Trophy}>
        <ul class="records">
          <li>
            <span>Plus longue sortie</span>
            <b>{rec.longestKm ? `${fmtNum(rec.longestKm.value, 2)} km` : '—'}</b>
          </li>
          <li>
            <span>Plus longue durée</span>
            <b>{rec.longestMin ? `${Math.round(rec.longestMin.value)} min` : '—'}</b>
          </li>
          <li>
            <span>Meilleure efficacité</span>
            <b>{rec.bestEfficiency ? fmtNum(rec.bestEfficiency.value, 3) : '—'}</b>
          </li>
          <li>
            <span>Plus grosse semaine</span>
            <b>{rec.bestWeekMin ? `${Math.round(rec.bestWeekMin.value)} min` : '—'}</b>
          </li>
          <li>
            <span>Plus longue série</span>
            <b>{rec.bestStreak} sem.</b>
          </li>
        </ul>
      </Section>

      <Section title="Badges" icon={Award}>
        <div class="badges">
          {badges(all, cfg, t).map((b) => {
            const I = b.unlocked ? badgeIcon(b.id) : Lock;
            return (
            <div key={b.id} class={`badge ${b.unlocked ? 'badge--on' : ''}`} title={b.desc}>
              <span class="badge__icon">
                <I size={26} />
              </span>
              <strong>{b.name}</strong>
              <small>{b.desc}</small>
            </div>
            );
          })}
        </div>
      </Section>

      <MonthlyHistory />

      <Section title="Dernières sorties" icon={Footprints}>
        <ul class="records">
          {runs
            .slice(-6)
            .reverse()
            .map((s) => {
              const p = paceSecPerKm(s.log);
              return (
                <li key={s.id}>
                  <span>
                    {shortLabel(s.date)} · {s.title}
                  </span>
                  <b>
                    {s.log?.distanceKm ? `${fmtNum(s.log.distanceKm, 2)} km` : ''}
                    {p ? ` · ${formatPace(p)}` : ''}
                    {s.log?.avgHr ? ` · ${s.log.avgHr} bpm` : ''}
                  </b>
                </li>
              );
            })}
        </ul>
        <p class="help">Plafond FC actuel : {cfg.efHrCeiling} bpm (modifiable dans les réglages).</p>
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
    <Section title="Volume hebdo (minutes de course)" icon={ChartColumn}>
      <svg viewBox={`0 0 ${W} ${H}`} class="chart" role="img" aria-label="Minutes de course par semaine sur 8 semaines">
        <line x1={PAD.l} x2={W - PAD.r} y1={y(0)} y2={y(0)} class="axis" />
        {weeks.map((w, i) => (
          <g key={w}>
            <rect
              x={PAD.l + i * bw + 4}
              y={y(vals[i])}
              width={bw - 8}
              height={Math.max(0, y(0) - y(vals[i]))}
              rx={5}
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
      <p class="help">Règle des 10 % : la ligne apparaît dès qu’il y a 2 semaines d’historique.</p>
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
    <Section title="Efficacité à l’effort" icon={HeartPulse}>
      <svg viewBox={`0 0 ${W} ${H}`} class="chart" role="img" aria-label="Évolution de l’efficacité : vitesse divisée par la fréquence cardiaque">
        <line x1={PAD.l} x2={W - PAD.r} y1={H - PAD.b} y2={H - PAD.b} class="axis" />
        {pts.length > 1 && <path d={path} class="line" />}
        {pts.map((p) => (
          <g key={p.s.id}>
            <circle
              cx={x(p.s.date)}
              cy={y(p.ef)}
              r={5}
              class={p.s.log!.avgHr! <= hrCeilingOf(p.s, cfg) ? 'pt pt--ok' : 'pt pt--hot'}
            />
            <text x={x(p.s.date)} y={H - 6} class="lbl" text-anchor="middle">
              {shortLabel(p.s.date).split(' ').slice(1).join(' ')}
            </text>
          </g>
        ))}
      </svg>
      <p class="help">
        Vitesse ÷ FC. Si la courbe monte, tu vas plus vite pour le même effort : c’est LE signe de progrès en EF.{' '}
        <span class="lg lg--full" /> sous le plafond · <span class="lg lg--hot" /> au-dessus
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
    <Section title="Ressenti" icon={Smile}>
      <svg viewBox={`0 0 ${W} ${H}`} class="chart" role="img" aria-label="Ressenti des 12 dernières séances">
        {[3, 7].map((v) => (
          <line key={v} x1={PAD.l} x2={W - PAD.r} y1={y(v)} y2={y(v)} class="grid" />
        ))}
        <text x={2} y={y(3) + 4} class="lbl">3</text>
        <text x={2} y={y(7) + 4} class="lbl">7</text>
        {pts.map((s, i) => (
          <circle
            key={s.id}
            cx={PAD.l + i * bw + bw / 2}
            cy={y(s.log!.rpe!)}
            r={6}
            class={s.kind === 'run' ? 'pt pt--run' : 'pt pt--str'}
          />
        ))}
      </svg>
      <p class="help">En endurance fondamentale, vise 3 à 5 / 10. Au-dessus de 7 souvent, le coach allège.</p>
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
    <Section title="Volume mensuel (km)" icon={History}>
      <ul class="hbars">
        {rows.map(([m, km]) => (
          <li key={m}>
            <span>{MONTHS_LONG[Number(m.slice(5)) - 1].slice(0, 4)}.</span>
            <div class="hbar">
              <div class="hbar__fill" style={{ width: `${(km / max) * 100}%` }} />
            </div>
            <b>{fmtNum(km)}</b>
          </li>
        ))}
      </ul>
    </Section>
  );
}
