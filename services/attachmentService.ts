import * as FileSystem from "expo-file-system/legacy";
import * as ImagePicker from "expo-image-picker";
import type { InfoAttachment } from "../types/info";
import { randomHex } from "../utils/crypto";

const DIR = `${FileSystem.documentDirectory ?? ""}attachments`;

async function ensureDir() {
  if (!FileSystem.documentDirectory) {
    throw new Error("No document directory");
  }
  await FileSystem.makeDirectoryAsync(DIR, { intermediates: true }).catch(
    () => undefined,
  );
}

function guessExt(uri: string) {
  const clean = uri.split("?")[0] ?? uri;
  const last = clean.split("/").pop() ?? "";
  const dot = last.lastIndexOf(".");
  if (dot === -1) return "jpg";
  const ext = last.slice(dot + 1).toLowerCase();
  return ext || "jpg";
}

export async function pickAndSaveImage(): Promise<InfoAttachment | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 1,
  });
  if (result.canceled) return null;

  const asset = result.assets[0];
  if (!asset?.uri) return null;

  await ensureDir();
  const name = `${Date.now()}-${await randomHex(8)}.${guessExt(asset.uri)}`;
  const dest = `${DIR}/${name}`;
  await FileSystem.copyAsync({ from: asset.uri, to: dest });

  return { type: "image", uri: dest, width: asset.width, height: asset.height };
}

export async function deleteAttachment(att: InfoAttachment) {
  if (att.type === "image" || att.type === "file") {
    await FileSystem.deleteAsync(att.uri, { idempotent: true }).catch(
      () => undefined,
    );
  }
}
