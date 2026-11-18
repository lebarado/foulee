import { Check, Dumbbell, Footprints, Gift, Lock, Palette, Plus, Shield, Sparkles, Star, Target, Trash2 } from 'lucide-preact';
import { useState } from 'preact/hooks';
import { shortLabel } from '../domain/format';
import { ACTIVE_DAYS_GOAL, XP, levelThreshold, xpEvents } from '../domain/gamification';
import { THEMES, isThemeUnlocked, levelTitle, unlocksAt, type Unlock } from '../domain/levels';
import type { PersonalReward } from '../domain/types';
import { actions, level, newId, sessions, settings, today, xpTotal } from '../data/store';

type View = 'path' | 'rewards' | 'xp';

export function LevelSheet() {
  const [view, setView] = useState<View>('path');
  const lv = level.value;
  const deg = Math.round(lv.progress * 360);
  return (
    <div class="stack">
      <div class="lv-hero">
        <div class="ring ring--big" style={{ background: `conic-gradient(var(--xp) ${deg}deg, var(--surface-3) 0)` }}>
          <div class="ring__inner">
            <small>Niveau</small>
            <strong>{lv.level}</strong>
          </div>
        </div>
        <h2 class="sheet__title">{levelTitle(lv.level)}</h2>
        <div class="bar bar--big">
          <div class="bar__fill" style={{ width: `${lv.progress * 100}%` }} />
        </div>
        <p class="muted">
          {lv.into} / {lv.span} XP · encore <strong class="xp-text">{lv.span - lv.into} XP</strong> pour le niveau {lv.level + 1}
        </p>
      </div>

      <NextReward />

      <div class="seg" role="tablist">
        {(
          [
            ['path', 'Parcours'],
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

/* ---------- Prochaine récompense ---------- */

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

function RewardChip({ r, locked }: { r: RewardItem; locked?: boolean }) {
  const I = KIND_ICON[r.kind];
  return (
    <div class={`reward reward--${r.kind} ${locked ? 'reward--locked' : ''}`}>
      <span class="reward__icon">
        <I size={18} />
      </span>
      <div>
        <strong>{r.kind === 'perso' ? `Cadeau : ${r.label}` : r.label}</strong>
        {r.desc && <small>{r.desc}</small>}
      </div>
    </div>
  );
}

function NextReward() {
  const lv = level.value.level;
  const perso = settings.value.rewards;
  for (let l = lv + 1; l <= lv + 30; l++) {
    const items = rewardsAt(l, perso);
    if (!items.length) continue;
    const missing = levelThreshold(l) - xpTotal.value;
    return (
      <div class="next-reward">
        <p class="next-reward__title">
          <Sparkles size={16} /> Prochaine récompense · niveau {l} · encore {missing} XP
        </p>
        {items.map((r) => (
          <RewardChip key={r.label} r={r} locked />
        ))}
      </div>
    );
  }
  return null;
}

/* ---------- Parcours des niveaux ---------- */

function Path() {
  const lv = level.value.level;
  const perso = settings.value.rewards;
  const max = Math.max(10, lv + 4, ...perso.map((r) => r.level));
  return (
    <ol class="path">
      {Array.from({ length: max }, (_, i) => i + 1).map((l) => {
        const state = l < lv ? 'done' : l === lv ? 'current' : 'locked';
        const items = rewardsAt(l, perso);
        return (
          <li key={l} class={`path__step path__step--${state}`}>
            <span class="path__dot">{state === 'done' ? <Check size={16} strokeWidth={3} /> : state === 'locked' ? <Lock size={14} /> : l}</span>
            <div class="path__body">
              <div class="path__head">
                <strong>
                  Niv. {l} · {levelTitle(l)}
                </strong>
                <small>{levelThreshold(l)} XP</small>
              </div>
              {items.map((r) => (
                <RewardChip key={r.label} r={r} locked={state === 'locked'} />
              ))}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/* ---------- Récompenses : cadeaux perso + thèmes ---------- */

function Rewards() {
  const cfg = settings.value;
  const lv = level.value.level;
  const save = (rewards: PersonalReward[]) => actions.saveSettings({ ...cfg, rewards });
  const sorted = [...cfg.rewards].sort((a, b) => a.level - b.level);
  return (
    <>
      <section class="block">
        <h3 class="block__title">
          <Gift size={16} /> Tes cadeaux
        </h3>
        <p class="block__text muted">Choisis ce que tu t’offres en vrai à chaque palier. C’est ta carotte.</p>
        <ul class="perso">
          {sorted.map((r) => (
            <li key={r.id} class={r.level <= lv ? 'perso--won' : ''}>
              <div class="perso__lvl">
                <button aria-label="Niveau moins" onClick={() => save(cfg.rewards.map((x) => (x.id === r.id ? { ...x, level: Math.max(2, x.level - 1) } : x)))}>
                  −
                </button>
                <span>Niv. {r.level}</span>
                <button aria-label="Niveau plus" onClick={() => save(cfg.rewards.map((x) => (x.id === r.id ? { ...x, level: x.level + 1 } : x)))}>
                  +
                </button>
              </div>
              <input
                value={r.label}
                aria-label="Cadeau"
                onChange={(e) => save(cfg.rewards.map((x) => (x.id === r.id ? { ...x, label: (e.target as HTMLInputElement).value } : x)))}
              />
              <button class="icon-btn icon-btn--small" aria-label="Supprimer le cadeau" onClick={() => save(cfg.rewards.filter((x) => x.id !== r.id))}>
                <Trash2 size={16} />
              </button>
            </li>
          ))}
        </ul>
        <button
          class="btn btn--soft"
          onClick={() => save([...cfg.rewards, { id: newId(), level: Math.max(lv + 1, 2), label: 'Un petit plaisir' }])}
        >
          <Plus size={18} /> Ajouter un cadeau
        </button>
      </section>

      <section class="block">
        <h3 class="block__title">
          <Palette size={16} /> Thèmes
        </h3>
        <div class="themes">
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
                  {!unlocked && <Lock size={16} color="#000" />}
                  {on && <Check size={18} color={t.ink} strokeWidth={3} />}
                </span>
                <small>{unlocked ? t.label : `Niv. ${t.level}`}</small>
              </button>
            );
          })}
        </div>
      </section>
    </>
  );
}

/* ---------- Gagner de l'XP ---------- */

function EarnXp() {
  const cfg = settings.value;
  const events = xpEvents(sessions.value, cfg, today.value).slice(0, 10);
  const rows: [typeof Footprints, string, number][] = [
    [Footprints, 'Une sortie faite (même décalée)', XP.run],
    [Dumbbell, 'Une séance de renfo', XP.strength],
    [Star, 'FC moyenne sous le plafond', XP.underCeiling],
    [Star, 'Ressenti noté', XP.rpe],
    [Star, 'Chiffres de la montre saisis', XP.details],
    [Target, `Quête : ${cfg.weeklyRunTarget} sorties dans la semaine`, 100],
    [Target, 'Quête : séances de renfo', 30],
    [Target, `Quête : bouger ${ACTIVE_DAYS_GOAL} jours différents`, 30],
    [Target, 'Quête : ressenti à chaque sortie', 20],
  ];
  return (
    <>
      <section class="block">
        <h3 class="block__title">Pourquoi monter de niveau ?</h3>
        <ul class="why">
          <li>
            <Shield size={20} />
            <span>
              <strong>Des jokers en plus</strong> (niveaux 4 et 8) : ta série tient même quand le travail mange une sortie.
            </span>
          </li>
          <li>
            <Gift size={20} />
            <span>
              <strong>Tes cadeaux</strong> : tu fixes une vraie récompense par palier, l’app te prévient quand tu l’as gagnée.
            </span>
          </li>
          <li>
            <Palette size={20} />
            <span>
              <strong>Des thèmes</strong> qui changent la couleur de tes cartes.
            </span>
          </li>
          <li>
            <Sparkles size={20} />
            <span>
              <strong>Un nouveau titre</strong> à chaque niveau, jusqu’à « Légende de la Moselle ».
            </span>
          </li>
        </ul>
        <p class="block__text muted">L’XP récompense la régularité, jamais la vitesse. Une séance manquée ne fait rien perdre.</p>
      </section>

      <section class="block">
        <h3 class="block__title">Barème</h3>
        <ul class="xp-lines">
          {rows.map(([I, label, xp]) => (
            <li key={label}>
              <span>
                <I size={16} /> {label}
              </span>
              <b>+{xp}</b>
            </li>
          ))}
        </ul>
      </section>

      <section class="block">
        <h3 class="block__title">Dernières XP gagnées</h3>
        {events.length ? (
          <ul class="xp-lines">
            {events.map((e, i) => (
              <li key={i}>
                <span>
                  <small class="muted">{shortLabel(e.date)}</small> {e.label}
                </span>
                <b>+{e.xp}</b>
              </li>
            ))}
          </ul>
        ) : (
          <p class="muted">Ta première séance faite apparaîtra ici.</p>
        )}
      </section>
    </>
  );
}
