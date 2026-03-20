import type { SQLiteDatabase } from "expo-sqlite";
import { openDatabaseAsync } from "expo-sqlite";
import { migrate } from "./migrations";

let db: SQLiteDatabase | null = null;
let initPromise: Promise<void> | null = null;

export async function getDb() {
  try {
    if (!db) {
      // 报错通常发生在这里
      db = await openDatabaseAsync("at-hand.db");
    }
    return db;
  } catch (error) {
    console.error("数据库初始化失败:", error);
  }
}

export async function initDbOnce() {
  if (!initPromise) {
    initPromise = (async () => {
      const database = await getDb();
      await migrate(database as SQLiteDatabase);
    })();
  }
  return initPromise;
}
