import { computed, effect, signal } from '@preact/signals';
import { completeSession, moveSession, shiftWarnings } from '../domain/cards';
import { DEFAULT_SETTINGS } from '../domain/catalog';
import type { Suggestion } from '../domain/coach';
import { isISODate, toISO, type ISODate } from '../domain/dates';
import { relLabel } from '../domain/format';
import { levelInfo, totalXp } from '../domain/gamification';
import { effectiveSettings, isThemeUnlocked, levelTitle, themeById, unlocksAt } from '../domain/levels';
import { seedSessions } from '../domain/seed';
import type { Session, SessionLog, Settings, WorkDay } from '../domain/types';
import { parseBackup, type Backup } from './backup';
import { db } from './db';

/* ---------- État ---------- */

/** `?today=2026-11-20` dans l'URL permet de simuler une date (tests manuels). */
function todayISO(): ISODate {
  const p = new URLSearchParams(location.search).get('today');
  return isISODate(p) ? p : toISO(new Date());
}

export const today = signal<ISODate>(todayISO());
export const sessions = signal<Session[]>([]);
export const workDays = signal<WorkDay[]>([]);
export const settings = signal<Settings>(DEFAULT_SETTINGS);
export const ready = signal(false);

export const xpTotal = computed(() => totalXp(sessions.value, settings.value, today.value));
export const level = computed(() => levelInfo(xpTotal.value));
/** Réglages + bonus débloqués par le niveau (jokers…). */
export const cfgEff = computed(() => effectiveSettings(settings.value, level.value.level));

/* Thème : la couleur d'accent suit le thème choisi, s'il est débloqué (sinon le premier). */
effect(() => {
  const t = themeById(settings.value.theme);
  const use = isThemeUnlocked(t.id, level.value.level) ? t : themeById('');
  const root = document.documentElement.style;
  root.setProperty('--accent-l', use.color);
  root.setProperty('--accent-d', use.dark);
});

export interface Toast {
  id: number;
  title: string;
  sub?: string;
  party?: boolean;
}
export const toast = signal<Toast | null>(null);

export function showToast(t: Omit<Toast, 'id'>) {
  const id = Date.now();
  toast.value = { ...t, id };
  setTimeout(() => {
    if (toast.value?.id === id) toast.value = null;
  }, t.party ? 3600 : 2200);
}

/* ---------- Chargement ---------- */

async function seed() {
  await db.transaction('rw', db.sessions, db.workDays, db.meta, async () => {
    await Promise.all([db.sessions.clear(), db.workDays.clear(), db.meta.clear()]);
    await db.sessions.bulkPut(seedSessions());
    await db.meta.put({ key: 'settings', value: DEFAULT_SETTINGS });
  });
}

async function load() {
  const [s, w, m] = await Promise.all([db.sessions.toArray(), db.workDays.toArray(), db.meta.get('settings')]);
  sessions.value = s;
  workDays.value = w;
  // Fusion avec les défauts : un réglage ajouté plus tard reçoit sa valeur par défaut.
  settings.value = { ...DEFAULT_SETTINGS, ...m?.value, coach: { ...DEFAULT_SETTINGS.coach, ...m?.value.coach } };
}

export async function init() {
  if (!(await db.meta.get('settings'))) await seed();
  await load();
  navigator.storage?.persist?.().catch(() => undefined);
  const refresh = () => (today.value = todayISO());
  document.addEventListener('visibilitychange', refresh);
  setInterval(refresh, 60_000);
  ready.value = true;
}

/* ---------- Écritures ---------- */

const nowIso = () => new Date().toISOString();
export const newId = () =>
  crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

async function put(s: Session) {
  await db.sessions.put(s);
  sessions.value = [...sessions.value.filter((x) => x.id !== s.id), s];
}

async function update(id: string, fn: (s: Session) => Session) {
  const s = sessions.value.find((x) => x.id === id);
  if (s) await put(fn(s));
}

/** Exécute une action et affiche l'XP gagnée (et un éventuel passage de niveau). */
async function withXp(fn: () => Promise<void>, party = false): Promise<number> {
  const before = xpTotal.value;
  const lvl = level.value.level;
  await fn();
  const gained = xpTotal.value - before;
  if (gained > 0) {
    const now = level.value.level;
    if (now > lvl) {
      const unlocked = unlocksAt(now).map((u) => u.label);
      const perso = settings.value.rewards.filter((r) => r.level === now).map((r) => r.label);
      showToast({
        title: `Niveau ${now} · ${levelTitle(now)}`,
        sub: [`+${gained} XP`, ...unlocked, ...perso.map((p) => `Cadeau : ${p}`)].join(' · '),
        party: true,
      });
    } else {
      showToast({ title: `+${gained} XP`, party });
    }
  }
  return gained;
}

export const actions = {
  move: async (id: string, date: ISODate) => {
    await update(id, (s) => moveSession(s, date));
    showToast({ title: `Décalée · ${relLabel(date, today.value)}` });
  },

  /** Glisser-déposer sur le planning : on replanifie, la nouvelle date devient la référence. */
  reschedule: async (id: string, date: ISODate) => {
    await update(id, (s) => ({ ...s, date, originalDate: date }));
    const s = sessions.value.find((x) => x.id === id);
    const w = s ? shiftWarnings(s, date, sessions.value, workDays.value, today.value) : [];
    showToast({ title: `Déplacée · ${relLabel(date, today.value)}`, sub: w[0] });
  },

  markDone: (id: string, log: SessionLog) =>
    withXp(
      () => update(id, (s) => ({ ...completeSession(s, today.value, nowIso()), log: { ...s.log, ...log } })),
      true,
    ),

  skip: (id: string) => update(id, (s) => ({ ...s, status: 'skipped' })),

  async remove(id: string) {
    await db.sessions.delete(id);
    sessions.value = sessions.value.filter((s) => s.id !== id);
  },

  /** Crée ou met à jour une carte depuis l'éditeur. */
  saveSession: (s: Session) => put(s),

  applySuggestion: (id: string, sug: Suggestion) =>
    update(id, (s) => ({ ...s, plan: { ...s.plan, durationMin: sug.durationMin, runWalk: sug.runWalk } })),

  async toggleWorkDay(date: ISODate) {
    const on = workDays.value.some((w) => w.date === date && w.heavy);
    if (on) {
      await db.workDays.delete(date);
      workDays.value = workDays.value.filter((w) => w.date !== date);
    } else {
      const w = { date, heavy: true };
      await db.workDays.put(w);
      workDays.value = [...workDays.value.filter((x) => x.date !== date), w];
    }
  },

  async saveSettings(next: Settings) {
    await db.meta.put({ key: 'settings', value: next });
    settings.value = next;
  },

  exportData(): Backup {
    return {
      app: 'foulee',
      schemaVersion: 1,
      exportedAt: nowIso(),
      settings: settings.value,
      sessions: sessions.value,
      workDays: workDays.value,
    };
  },

  async importData(text: string) {
    const b = parseBackup(text);
    await db.transaction('rw', db.sessions, db.workDays, db.meta, async () => {
      await Promise.all([db.sessions.clear(), db.workDays.clear()]);
      await db.sessions.bulkPut(b.sessions);
      await db.workDays.bulkPut(b.workDays);
      await db.meta.put({ key: 'settings', value: b.settings });
    });
    await load();
  },

  async reset() {
    await seed();
    await load();
  },
};
