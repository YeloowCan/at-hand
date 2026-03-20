import type { SQLiteDatabase } from "expo-sqlite";

export type InfoRow = {
  id: string;
  ciphertext: string;
  created_at: number;
  updated_at: number;
  last_used_at: number | null;
  deleted_at: number | null;
};

export async function listInfoRows(db: SQLiteDatabase) {
  return db.getAllAsync<InfoRow>(
    `SELECT id, ciphertext, created_at, updated_at, last_used_at, deleted_at
     FROM info
     WHERE deleted_at IS NULL
     ORDER BY COALESCE(last_used_at, created_at) DESC`,
  );
}

export async function listAllInfoRows(db: SQLiteDatabase) {
  return db.getAllAsync<InfoRow>(
    `SELECT id, ciphertext, created_at, updated_at, last_used_at, deleted_at
     FROM info`,
  );
}

export async function getInfoRowById(db: SQLiteDatabase, id: string) {
  const rows = await db.getAllAsync<InfoRow>(
    `SELECT id, ciphertext, created_at, updated_at, last_used_at, deleted_at
     FROM info
     WHERE id = ?
     LIMIT 1`,
    [id],
  );
  return rows[0] ?? null;
}

export async function upsertInfoRow(
  db: SQLiteDatabase,
  row: Pick<InfoRow, "id" | "ciphertext" | "created_at" | "updated_at">,
) {
  await db.runAsync(
    `INSERT INTO info(id, ciphertext, created_at, updated_at, last_used_at, deleted_at)
     VALUES(?, ?, ?, ?, NULL, NULL)
     ON CONFLICT(id) DO UPDATE SET
       ciphertext = excluded.ciphertext,
       updated_at = excluded.updated_at`,
    [row.id, row.ciphertext, row.created_at, row.updated_at],
  );
}

export async function updateInfoCiphertext(
  db: SQLiteDatabase,
  row: Pick<InfoRow, "id" | "ciphertext" | "updated_at">,
) {
  await db.runAsync(
    `UPDATE info SET ciphertext = ?, updated_at = ? WHERE id = ?`,
    [row.ciphertext, row.updated_at, row.id],
  );
}

export async function markInfoUsed(db: SQLiteDatabase, id: string, at: number) {
  await db.runAsync(
    `UPDATE info SET last_used_at = ?, updated_at = ? WHERE id = ?`,
    [at, at, id],
  );
}

export async function softDeleteInfo(db: SQLiteDatabase, id: string, at: number) {
  await db.runAsync(`UPDATE info SET deleted_at = ?, updated_at = ? WHERE id = ?`, [
    at,
    at,
    id,
  ]);
}
