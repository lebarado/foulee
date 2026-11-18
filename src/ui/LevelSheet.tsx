import { Check, Gift, Lock, Palette, Shield, Trash2 } from 'lucide-preact';
import { useState } from 'preact/hooks';
import { shortLabel } from '../domain/format';
import { ACTIVE_DAYS_GOAL, XP, levelThreshold, xpEvents } from '../domain/gamification';
import { THEMES, isThemeUnlocked, levelTitle, unlocksAt, type Unlock } from '../domain/levels';
import type { PersonalReward } from '../domain/types';
import { actions, level, newId, sessions, settings, today, xpTotal } from '../data/store';
import { Progress, Section } from './kit';

type View = 'path' | 'rewards' | 'xp';

export function LevelSheet() {
  const [view, setView] = useState<View>('path');
  const lv = level.value;
  return (
    <div class="stack">
      <div class="lv">
        <div class="lv__num">{lv.level}</div>
        <p class="lv__title">{levelTitle(lv.level)}</p>
        <Progress value={lv.progress} />
        <p class="lv__meta">
          {lv.into} sur {lv.span} XP · encore {lv.span - lv.into} XP pour le niveau {lv.level + 1}
        </p>
      </div>

      <NextReward />

      <div class="seg" role="tablist">
        {(
          [
            ['path', 'Paliers'],
            ['rewards', 'Récompenses'],
            ['xp', 'XP'],
          ] as [View, string][]
        ).map(([id, label]) => (
          <button key={id} role="tab" aria-selected={view === id} class={view === id ? 'seg--on' : ''} onClick={() => setView(id)}>
            {label}
          </button>
        ))}
      </div>

      {view === 'path' && <Path />}
      {view === 'rewards' && <Rewards />}
      {view === 'xp' && <EarnXp />}
    </div>
  );
}

/* ---------- Récompenses d'un palier ---------- */

interface RewardItem {
  level: number;
  label: string;
  desc?: string;
  kind: Unlock['kind'] | 'perso';
}

function rewardsAt(lvl: number, perso: PersonalReward[]): RewardItem[] {
  return [
    ...unlocksAt(lvl).map<RewardItem>((u) => ({ level: lvl, label: u.label, desc: u.desc, kind: u.kind })),
    ...perso.filter((r) => r.level === lvl).map<RewardItem>((r) => ({ level: lvl, label: r.label, kind: 'perso' })),
  ];
}

const KIND_ICON = { theme: Palette, joker: Shield, perso: Gift } as const;
const rewardLabel = (r: RewardItem) => (r.kind === 'perso' ? `Cadeau : ${r.label}` : r.label);

function NextReward() {
  const lv = level.value.level;
  const perso = settings.value.rewards;
  for (let l = lv + 1; l <= lv + 30; l++) {
    const items = rewardsAt(l, perso);
    if (!items.length) continue;
    const missing = levelThreshold(l) - xpTotal.value;
    return (
      <Section title={`Prochaine récompense · niveau ${l}`} aside={`encore ${missing} XP`}>
        <div class="list">
          {items.map((r) => {
            const I = KIND_ICON[r.kind];
            return (
              <div key={r.label} class="row">
                <span class="row__icon">
                  <I size={18} strokeWidth={1.75} />
                </span>
                <span class="row__main">
                  <span class="row__title">{rewardLabel(r)}</span>
                  {r.desc && (
                    <span class="row__meta" style={{ display: 'block' }}>
                      {r.desc}
                    </span>
                  )}
                </span>
              </div>
            );
          })}
        </div>
      </Section>
    );
  }
  return null;
}

/* ---------- Paliers ---------- */

function Path() {
  const lv = level.value.level;
  const perso = settings.value.rewards;
  const max = Math.max(10, lv + 4, ...perso.map((r) => r.level));
  return (
    <div class="list">
      {Array.from({ length: max }, (_, i) => i + 1).map((l) => {
        const state = l < lv ? 'done' : l === lv ? 'current' : 'locked';
        const items = rewardsAt(l, perso);
        return (
          <div key={l} class={`row ${state === 'locked' ? 'row--locked' : ''}`}>
            <span class={`path__mark path__mark--${state}`}>{state === 'done' ? <Check size={13} strokeWidth={2.5} /> : l}</span>
            <div class="row__main">
              <div class="row__title">{levelTitle(l)}</div>
              {items.length > 0 && (
                <ul class="path__rewards">
                  {items.map((r) => {
                    const I = KIND_ICON[r.kind];
                    return (
                      <li key={r.label}>
                        <I size={13} strokeWidth={1.75} /> {rewardLabel(r)}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
            <span class="row__aside" style={{ alignSelf: 'flex-start', fontSize: '13px' }}>
              {levelThreshold(l)} XP
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* ---------- Cadeaux perso + thèmes ---------- */

function Rewards() {
  const cfg = settings.value;
  const lv = level.value.level;
  const save = (rewards: PersonalReward[]) => actions.saveSettings({ ...cfg, rewards });
  const sorted = [...cfg.rewards].sort((a, b) => a.level - b.level);
  return (
    <>
      <div>
        <Section title="Tes cadeaux">
          <div class="list">
            {sorted.map((r) => (
              <div key={r.id} class={`perso ${r.level <= lv ? 'perso--won' : ''}`}>
                <div class="mini">
                  <button aria-label="Niveau moins" onClick={() => save(cfg.rewards.map((x) => (x.id === r.id ? { ...x, level: Math.max(2, x.level - 1) } : x)))}>
                    −
                  </button>
                  <span>
                    niv. <strong>{r.level}</strong>
                  </span>
                  <button aria-label="Niveau plus" onClick={() => save(cfg.rewards.map((x) => (x.id === r.id ? { ...x, level: x.level + 1 } : x)))}>
                    +
                  </button>
                </div>
                <input
                  value={r.label}
                  aria-label="Cadeau"
                  onChange={(e) => save(cfg.rewards.map((x) => (x.id === r.id ? { ...x, label: (e.target as HTMLInputElement).value } : x)))}
                />
                <button class="icon-btn" aria-label="Supprimer le cadeau" onClick={() => save(cfg.rewards.filter((x) => x.id !== r.id))}>
                  <Trash2 size={16} strokeWidth={1.75} />
                </button>
              </div>
            ))}
          </div>
          <button class="link" onClick={() => save([...cfg.rewards, { id: newId(), level: Math.max(lv + 1, 2), label: 'Un petit plaisir' }])}>
            Ajouter un cadeau
          </button>
          <p class="help">Une vraie récompense que tu t’offres en atteignant le palier.</p>
        </Section>
      </div>

      <Section title="Couleur d’accent">
        <div class="list themes">
          {THEMES.map((t) => {
            const unlocked = isThemeUnlocked(t.id, lv);
            const on = cfg.theme === t.id;
            return (
              <button
                key={t.id}
                class={`theme ${on ? 'theme--on' : ''}`}
                disabled={!unlocked}
                onClick={() => actions.saveSettings({ ...cfg, theme: t.id })}
              >
                <span class="theme__swatch" style={{ background: t.color }}>
                  {!unlocked && <Lock size={14} strokeWidth={2} />}
                </span>
                {unlocked ? t.label : `Niv. ${t.level}`}
              </button>
            );
          })}
        </div>
      </Section>
    </>
  );
}

/* ---------- XP ---------- */

function EarnXp() {
  const cfg = settings.value;
  const events = xpEvents(sessions.value, cfg, today.value).slice(0, 10);
  const rows: [string, number][] = [
    ['Une sortie faite, même décalée', XP.run],
    ['Natation ou vélo', XP.swim],
    ['Renfo ou calisthénie', XP.strength],
    ['FC moyenne sous le plafond', XP.underCeiling],
    ['Ressenti noté', XP.rpe],
    ['Chiffres de la montre saisis', XP.details],
    [`Quête : ${cfg.weeklyRunTarget} sorties dans la semaine`, 100],
    ['Quête : séances de renfo', 30],
    [`Quête : bouger ${ACTIVE_DAYS_GOAL} jours différents`, 30],
    ['Quête : ressenti à chaque sortie', 20],
  ];
  return (
    <>
      <Section title="À quoi sert l’XP">
        <div class="list">
          <ul class="tips">
            <li>Des jokers en plus aux niveaux 4 et 8 : ta série tient quand le travail mange une sortie.</li>
            <li>Tes cadeaux : une vraie récompense par palier, que tu choisis.</li>
            <li>De nouvelles couleurs d’accent, et un titre par niveau.</li>
            <li>La régularité rapporte, jamais la vitesse. Une séance manquée ne fait rien perdre.</li>
          </ul>
        </div>
      </Section>

      <Section title="Barème">
        <div class="list">
          {rows.map(([label, xp]) => (
            <div key={label} class="row">
              <span class="row__main row__title">{label}</span>
              <span class="row__aside">+{xp}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Dernières XP gagnées">
        <div class="list">
          {events.length ? (
            events.map((e, i) => (
              <div key={i} class="row">
                <span class="row__main">
                  <span class="row__title">{e.label}</span>
                  <span class="row__meta" style={{ display: 'block' }}>
                    {shortLabel(e.date)}
                  </span>
                </span>
                <span class="row__aside">+{e.xp}</span>
              </div>
            ))
          ) : (
            <p class="empty">Ta première séance apparaîtra ici.</p>
          )}
        </div>
      </Section>
    </>
  );
}
