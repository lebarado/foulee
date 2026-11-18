import { signal } from '@preact/signals';

export type Tab = 'today' | 'plan' | 'progress' | 'settings';
export const tab = signal<Tab>('today');

export type SheetState =
  /** `durationSec` : durée chronométrée par le mode en cours. */
  | { type: 'runDone'; id: string; durationSec?: number }
  /** `sets` / `atEnd` : séries cochées par le mode en cours, on va directement à la fin. */
  | { type: 'strength'; id: string; durationSec?: number; sets?: Record<string, boolean[]>; atEnd?: boolean }
  | { type: 'session'; id: string }
  | { type: 'edit'; id?: string; date?: string }
  | { type: 'level' };

export const sheet = signal<SheetState | null>(null);

export const openSheet = (s: SheetState) => (sheet.value = s);
export const closeSheet = () => (sheet.value = null);
