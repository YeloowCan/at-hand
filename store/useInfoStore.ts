import { create } from "zustand";
import type { InfoDraft, InfoItem } from "../types/info";
import {
  createInfo,
  deleteInfo,
  listInfos,
  touchInfo,
  updateInfo,
} from "../services/infoService";

type State = {
  items: InfoItem[];
  loading: boolean;
  error: string | null;
  load: () => Promise<void>;
  create: (draft: InfoDraft) => Promise<string>;
  update: (id: string, draft: InfoDraft) => Promise<void>;
  remove: (id: string) => Promise<void>;
  touchUsed: (id: string) => Promise<void>;
};

export const useInfoStore = create<State>((set, get) => ({
  items: [],
  loading: false,
  error: null,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const items = await listInfos();
      set({ items, loading: false });
    } catch {
      set({ loading: false, error: "加载失败" });
    }
  },

  create: async (draft) => {
    set({ error: null });
    const id = await createInfo(draft);
    await get().load();
    return id;
  },

  update: async (id, draft) => {
    set({ error: null });
    await updateInfo(id, draft);
    await get().load();
  },

  remove: async (id) => {
    set({ error: null });
    await deleteInfo(id);
    await get().load();
  },

  touchUsed: async (id) => {
    const now = Date.now();
    set({
      items: get()
        .items.map((it) => (it.id === id ? { ...it, lastUsedAt: now } : it))
        .sort((a, b) => {
          const ta = a.lastUsedAt ?? a.createdAt;
          const tb = b.lastUsedAt ?? b.createdAt;
          return tb - ta;
        }),
    });
    await touchInfo(id);
  },
}));

