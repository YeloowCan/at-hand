import * as SecureStore from "expo-secure-store";
import { getDb, initDbOnce } from "../db";
import {
  getInfoRowById,
  listInfoRows,
  markInfoUsed,
  softDeleteInfo,
  upsertInfoRow,
} from "../db/infoRepo";
import type { InfoDraft, InfoItem } from "../types/info";
import { decryptJsonV1, encryptJsonV1, randomHex } from "../utils/crypto";
import { useSecurityStore } from "../store/useSecurityStore";

const KEY_SALT = "at-hand:salt";

function requireKeyHex() {
  const keyHex = useSecurityStore.getState().keyHex;
  if (!keyHex) {
    throw new Error("Locked");
  }
  return keyHex;
}

async function requireSaltHex() {
  const salt = await SecureStore.getItemAsync(KEY_SALT);
  if (!salt) throw new Error("PIN not set");
  return salt;
}

type InfoPayloadV1 = {
  title: string;
  content: string;
  category: string;
  tags: string[];
  attachments: InfoDraft["attachments"];
};

function toItem(id: string, meta: { createdAt: number; updatedAt: number; lastUsedAt: number | null; deletedAt: number | null }, payload: InfoPayloadV1): InfoItem {
  return {
    id,
    title: payload.title,
    content: payload.content,
    category: payload.category,
    tags: payload.tags,
    attachments: payload.attachments,
    createdAt: meta.createdAt,
    updatedAt: meta.updatedAt,
    lastUsedAt: meta.lastUsedAt,
    deletedAt: meta.deletedAt,
  };
}

export async function listInfos() {
  await initDbOnce();
  const db = getDb();
  const keyHex = requireKeyHex();
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
  const db = getDb();
  const keyHex = requireKeyHex();
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
  const db = getDb();
  const keyHex = requireKeyHex();
  const saltHex = await requireSaltHex();
  const now = Date.now();
  const id = `${now}-${await randomHex(8)}`;

  const payload: InfoPayloadV1 = {
    title: draft.title.trim(),
    content: draft.content,
    category: draft.category.trim() || "未分类",
    tags: draft.tags,
    attachments: draft.attachments,
  };
  const ciphertext = await encryptJsonV1(payload, keyHex, saltHex);
  await upsertInfoRow(db, { id, ciphertext, created_at: now, updated_at: now });
  return id;
}

export async function updateInfo(id: string, draft: InfoDraft) {
  await initDbOnce();
  const db = getDb();
  const keyHex = requireKeyHex();
  const saltHex = await requireSaltHex();
  const now = Date.now();

  const payload: InfoPayloadV1 = {
    title: draft.title.trim(),
    content: draft.content,
    category: draft.category.trim() || "未分类",
    tags: draft.tags,
    attachments: draft.attachments,
  };
  const ciphertext = await encryptJsonV1(payload, keyHex, saltHex);
  await upsertInfoRow(db, { id, ciphertext, created_at: now, updated_at: now });
}

export async function touchInfo(id: string) {
  await initDbOnce();
  const db = getDb();
  const now = Date.now();
  await markInfoUsed(db, id, now);
}

export async function deleteInfo(id: string) {
  await initDbOnce();
  const db = getDb();
  const now = Date.now();
  await softDeleteInfo(db, id, now);
}

