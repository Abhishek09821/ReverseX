/**
 * Structural database migrations.
 *
 * Version 2 adds a fresh 'reversex' database with the new prompt-based schema.
 * The old 'weblens' database from the previous website-audit model is left untouched
 * (users can clear it manually or it expires naturally).
 */
import type { IDBPDatabase, IDBPTransaction } from 'idb';

import type { ReverseXDb } from './types';

type Migration = (
  db: IDBPDatabase<ReverseXDb>,
  tx: IDBPTransaction<ReverseXDb, ArrayLike<never>, 'versionchange'>,
) => void;

const migrations: Record<number, Migration> = {
  1: (db) => {
    // v1 schema (weblens era) — kept as no-op for version continuity
    const scans = db.createObjectStore('scans', { keyPath: 'id' });
    scans.createIndex('by_created_at', 'created_at');
    scans.createIndex('by_source_type', 'source_type');
    scans.createIndex('by_status', 'status');
    scans.createIndex('by_saved_at', 'saved_at');
    db.createObjectStore('results', { keyPath: 'scan_id' });
    db.createObjectStore('meta', { keyPath: 'key' });
  },
  2: (_db, _tx) => {
    // v2: schema is structurally identical — this migration exists so DB_VERSION bump is handled
    // and fresh installs only run migration 1 then this no-op.
  },
};

export function applyMigrations(
  db: IDBPDatabase<ReverseXDb>,
  oldVersion: number,
  newVersion: number | null,
  tx: IDBPTransaction<ReverseXDb, ArrayLike<never>, 'versionchange'>,
): void {
  // Fresh database — run all migrations
  if (oldVersion === 0) {
    migrations[1]!(db, tx);
    return;
  }
  const target = newVersion ?? oldVersion;
  for (let version = oldVersion + 1; version <= target; version += 1) {
    const migration = migrations[version];
    if (migration) migration(db, tx);
  }
}

export const REGISTERED_MIGRATIONS = Object.keys(migrations).map(Number);
