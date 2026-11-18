import Dexie, { type Table } from 'dexie';
import type { Session, Settings, WorkDay } from '../domain/types';

export interface MetaRow {
  key: 'settings';
  value: Settings;
}

class FouleeDB extends Dexie {
  sessions!: Table<Session, string>;
  workDays!: Table<WorkDay, string>;
  meta!: Table<MetaRow, string>;

  constructor() {
    super('foulee');
    this.version(1).stores({
      sessions: 'id, date, kind, status',
      workDays: 'date',
      meta: 'key',
    });
  }
}

export const db = new FouleeDB();
