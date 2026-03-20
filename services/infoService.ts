import * as SecureStore from "expo-secure-store";
import { getDb, initDbOnce } from "../db";
import {
  getInfoRowById,
  listInfoRows,
  markInfoUsed,
  softDeleteInfo,
  upsertInfoRow,
} from "../db/infoRepo";
import {
  SECURITY_SECURE_STORE_KEYS,
  useSecurityStore,
} from "../store/useSecurityStore";
import type { InfoDraft, InfoItem } from "../types/info";
import { decryptJsonV1, encryptJsonV1, randomHex } from "../utils/crypto";
import { DEFAULT_CATEGORIES } from "./categoryService";

const LEGACY_KEY_SALT = "at-hand-salt";
const DATA_KEY_STORE_KEY = "at-hand-data-key";

async function requireKeyHex() {
  const { keyHex, pinLoginEnabled } = useSecurityStore.getState();
  if (keyHex) {
    return keyHex;
  }
  if (pinLoginEnabled) {
    throw new Error("Locked");
  }
  const storedKey = await SecureStore.getItemAsync(DATA_KEY_STORE_KEY);
  if (storedKey) {
    return storedKey;
  }
  const nextKey = await randomHex(32);
  await SecureStore.setItemAsync(DATA_KEY_STORE_KEY, nextKey);
  return nextKey;
}

async function requireSaltHex() {
  const salt =
    (await SecureStore.getItemAsync(SECURITY_SECURE_STORE_KEYS.SALT)) ??
    (await SecureStore.getItemAsync(LEGACY_KEY_SALT));
  if (salt) return salt;
  const nextSalt = await randomHex(16);
  await SecureStore.setItemAsync(SECURITY_SECURE_STORE_KEYS.SALT, nextSalt);
  return nextSalt;
}

type InfoPayloadV1 = {
  title: string;
  content: string;
  category: string;
  attachments: InfoDraft["attachments"];
};

function toItem(
  id: string,
  meta: {
    createdAt: number;
    updatedAt: number;
    lastUsedAt: number | null;
    deletedAt: number | null;
  },
  payload: InfoPayloadV1,
): InfoItem {
  return {
    id,
    title: payload.title,
    content: payload.content,
    category: payload.category,
    attachments: payload.attachments,
    createdAt: meta.createdAt,
    updatedAt: meta.updatedAt,
    lastUsedAt: meta.lastUsedAt,
    deletedAt: meta.deletedAt,
  };
}

export async function listInfos() {
  await initDbOnce();
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const keyHex = await requireKeyHex();
  const rows = await listInfoRows(db);
  return rows.map((r) => {
    const payload = decryptJsonV1<InfoPayloadV1>(r.ciphertext, keyHex);
    return toItem(
      r.id,
      {
        createdAt: r.created_at,
        updatedAt: r.updated_at,
        lastUsedAt: r.last_used_at,
        deletedAt: r.deleted_at,
      },
      payload,
    );
  });
}

export async function getInfoById(id: string) {
  await initDbOnce();
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const keyHex = await requireKeyHex();
  const row = await getInfoRowById(db, id);
  if (!row || row.deleted_at) return null;
  const payload = decryptJsonV1<InfoPayloadV1>(row.ciphertext, keyHex);
  return toItem(
    row.id,
    {
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      lastUsedAt: row.last_used_at,
      deletedAt: row.deleted_at,
    },
    payload,
  );
}

export async function createInfo(draft: InfoDraft) {
  await initDbOnce();
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const keyHex = await requireKeyHex();
  const saltHex = await requireSaltHex();
  const now = Date.now();
  const id = `${now}-${await randomHex(8)}`;

  const payload: InfoPayloadV1 = {
    title: draft.title.trim(),
    content: draft.content,
    category: draft.category.trim() || DEFAULT_CATEGORIES[0],
    attachments: draft.attachments,
  };
  const ciphertext = await encryptJsonV1(payload, keyHex, saltHex);
  await upsertInfoRow(db, { id, ciphertext, created_at: now, updated_at: now });
  return id;
}

export async function updateInfo(id: string, draft: InfoDraft) {
  await initDbOnce();
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const keyHex = await requireKeyHex();
  const saltHex = await requireSaltHex();
  const now = Date.now();

  const payload: InfoPayloadV1 = {
    title: draft.title.trim(),
    content: draft.content,
    category: draft.category.trim() || DEFAULT_CATEGORIES[0],
    attachments: draft.attachments,
  };
  const ciphertext = await encryptJsonV1(payload, keyHex, saltHex);
  await upsertInfoRow(db, { id, ciphertext, created_at: now, updated_at: now });
}

export async function setInfoCategory(id: string, category: string) {
  await initDbOnce();
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const keyHex = await requireKeyHex();
  const saltHex = await requireSaltHex();
  const now = Date.now();

  const row = await getInfoRowById(db, id);
  if (!row || row.deleted_at) return;

  const payload = decryptJsonV1<InfoPayloadV1 & { tags?: unknown }>(
    row.ciphertext,
    keyHex,
  );

  const nextPayload: InfoPayloadV1 = {
    title: payload.title,
    content: payload.content,
    category: category.trim() || payload.category || DEFAULT_CATEGORIES[0],
    attachments: payload.attachments ?? [],
  };

  const ciphertext = await encryptJsonV1(nextPayload, keyHex, saltHex);
  await upsertInfoRow(db, { id, ciphertext, created_at: now, updated_at: now });
}

export async function touchInfo(id: string) {
  await initDbOnce();
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const now = Date.now();
  await markInfoUsed(db, id, now);
}

export async function deleteInfo(id: string) {
  await initDbOnce();
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const now = Date.now();
  await softDeleteInfo(db, id, now);
}
