import { isISODate } from '../domain/dates';
import type { Session, Settings, WorkDay } from '../domain/types';

export interface Backup {
  app: 'foulee';
  schemaVersion: 1;
  exportedAt: string;
  settings: Settings;
  sessions: Session[];
  workDays: WorkDay[];
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;

function isSession(v: unknown): v is Session {
  return (
    isObj(v) &&
    typeof v.id === 'string' &&
    (v.kind === 'run' || v.kind === 'strength') &&
    isISODate(v.date) &&
    isISODate(v.originalDate) &&
    ['planned', 'confirmed', 'done', 'skipped'].includes(v.status as string) &&
    isObj(v.plan)
  );
}

/** Vérifie un fichier de sauvegarde ; lève une erreur lisible sinon. */
export function parseBackup(text: string): Backup {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('Ce fichier n’est pas du JSON valide.');
  }
  if (!isObj(data) || data.app !== 'foulee') throw new Error('Ce fichier ne vient pas de Foulée.');
  if (data.schemaVersion !== 1) throw new Error('Version de sauvegarde inconnue.');
  if (!Array.isArray(data.sessions) || !data.sessions.every(isSession)) throw new Error('Séances illisibles.');
  if (!Array.isArray(data.workDays)) throw new Error('Jours de travail illisibles.');
  if (!isObj(data.settings)) throw new Error('Réglages illisibles.');
  return data as unknown as Backup;
}
