import { signal } from '@preact/signals';

export type Tab = 'today' | 'plan' | 'progress' | 'settings';
export const tab = signal<Tab>('today');

export type SheetState =
  | { type: 'runDone'; id: string }
  | { type: 'strength'; id: string }
  | { type: 'session'; id: string }
  | { type: 'edit'; id?: string; date?: string }
  | { type: 'level' };

export const sheet = signal<SheetState | null>(null);

export const openSheet = (s: SheetState) => (sheet.value = s);
export const closeSheet = () => (sheet.value = null);
