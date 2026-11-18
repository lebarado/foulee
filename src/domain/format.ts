import { diffDays, fromISO, type ISODate } from './dates';

export const DOW_SHORT = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'];
const DOW_LONG = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const MONTHS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
export const MONTHS_LONG = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
];

const pad = (n: number) => String(n).padStart(2, '0');
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function shortLabel(s: ISODate): string {
  const d = fromISO(s);
  return `${DOW_SHORT[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

export function longLabel(s: ISODate): string {
  const d = fromISO(s);
  return cap(`${DOW_LONG[d.getDay()]} ${d.getDate()} ${MONTHS_LONG[d.getMonth()]}`);
}

export function relLabel(s: ISODate, today: ISODate): string {
  const n = diffDays(today, s);
  if (n === 0) return "Aujourd'hui";
  if (n === 1) return 'Demain';
  if (n === 2) return 'Après-demain';
  if (n === -1) return 'Hier';
  return cap(shortLabel(s));
}

export function formatPace(secPerKm: number): string {
  let m = Math.floor(secPerKm / 60);
  let s = Math.round(secPerKm - m * 60);
  if (s === 60) {
    m++;
    s = 0;
  }
  return `${m}:${pad(s)}/km`;
}

export function formatDuration(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.round(sec % 60);
  return h ? `${h} h ${pad(m)}` : `${m}:${pad(s)}`;
}

export function rpeLabel(n: number): string {
  if (n <= 2) return 'Très facile';
  if (n <= 4) return 'Facile';
  if (n <= 6) return 'Moyen';
  if (n <= 8) return 'Dur';
  return 'Très dur';
}

export const fmtNum = (n: number, digits = 1) =>
  n.toLocaleString('fr-FR', { maximumFractionDigits: digits });
