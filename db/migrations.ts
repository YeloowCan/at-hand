import type { SQLiteDatabase } from "expo-sqlite";

const SCHEMA_VERSION = 1;

export async function migrate(db: SQLiteDatabase) {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS meta (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );
  `);

  const rows = await db.getAllAsync<{ value: string }>(
    `SELECT value FROM meta WHERE key = ?`,
    ["schema_version"],
  );
  const currentVersion = rows.length ? Number(rows[0].value) : 0;
  if (Number.isNaN(currentVersion)) {
    await db.runAsync(`DELETE FROM meta WHERE key = ?`, ["schema_version"]);
  }

  if (currentVersion < 1) {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS info (
        id TEXT PRIMARY KEY NOT NULL,
        ciphertext TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        last_used_at INTEGER,
        deleted_at INTEGER
      );
      CREATE INDEX IF NOT EXISTS idx_info_last_used_at ON info(last_used_at);
      CREATE INDEX IF NOT EXISTS idx_info_deleted_at ON info(deleted_at);
    `);

    await db.runAsync(
      `INSERT OR REPLACE INTO meta(key, value) VALUES(?, ?)`,
      ["schema_version", String(SCHEMA_VERSION)],
    );
  }
}

