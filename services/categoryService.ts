import * as SecureStore from "expo-secure-store";

const KEY_CATEGORIES = "at-hand-categories";

export const DEFAULT_CATEGORIES = ["证件", "卡片", "合同"] as const;

function normalize(name: string) {
  return name.trim();
}

function uniq(list: string[]) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of list) {
    const n = normalize(raw);
    if (!n) continue;
    if (seen.has(n)) continue;
    seen.add(n);
    out.push(n);
  }
  return out;
}

export async function loadCategories(): Promise<string[]> {
  const raw = await SecureStore.getItemAsync(KEY_CATEGORIES);
  if (!raw) return [...DEFAULT_CATEGORIES];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [...DEFAULT_CATEGORIES];
    const list = uniq(parsed.filter((x) => typeof x === "string"));
    return list.length ? list : [...DEFAULT_CATEGORIES];
  } catch {
    return [...DEFAULT_CATEGORIES];
  }
}

export async function saveCategories(categories: string[]) {
  const list = uniq(categories);
  await SecureStore.setItemAsync(KEY_CATEGORIES, JSON.stringify(list));
  return list;
}
