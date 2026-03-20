import { create } from "zustand";
import { loadCategories, saveCategories } from "../services/categoryService";

type State = {
  categories: string[];
  bootstrapped: boolean;
  loading: boolean;
  error: string | null;
  bootstrap: () => Promise<void>;
  addCategory: (name: string) => Promise<void>;
  removeCategory: (name: string) => Promise<void>;
  syncCategoriesFromItems: (names: string[]) => Promise<void>;
};

function normalize(name: string) {
  return name.trim();
}

export const useCategoryStore = create<State>((set, get) => ({
  categories: [],
  bootstrapped: false,
  loading: false,
  error: null,

  bootstrap: async () => {
    if (get().bootstrapped) return;
    set({ loading: true, error: null });
    try {
      const categories = await loadCategories();
      const saved = await saveCategories(categories);
      set({ categories: saved, bootstrapped: true, loading: false });
    } catch {
      set({ loading: false, error: "加载分类失败" });
    }
  },

  addCategory: async (name) => {
    const n = normalize(name);
    if (!n) return;
    const { bootstrapped } = get();
    if (!bootstrapped) {
      await get().bootstrap();
    }
    const prev = get().categories;
    if (prev.includes(n)) return;
    const next = [...prev, n];
    const saved = await saveCategories(next);
    set({ categories: saved });
  },

  removeCategory: async (name) => {
    const n = normalize(name);
    if (!n) return;
    const { bootstrapped } = get();
    if (!bootstrapped) {
      await get().bootstrap();
    }
    const prev = get().categories;
    const next = prev.filter((x) => x !== n);
    if (!next.length) {
      throw new Error("categories-empty");
    }
    const saved = await saveCategories(next);
    set({ categories: saved });
  },

  syncCategoriesFromItems: async (names) => {
    const { bootstrapped } = get();
    if (!bootstrapped) {
      await get().bootstrap();
    }
    const prev = get().categories;
    const incoming = names.map(normalize).filter(Boolean);
    const missing = incoming.filter((n) => !prev.includes(n));
    if (!missing.length) return;
    const next = [...prev, ...missing];
    const saved = await saveCategories(next);
    set({ categories: saved });
  },
}));

