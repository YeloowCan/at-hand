import { create } from "zustand";

type State = {
  query: string;
  category: string | null;
  setQuery: (query: string) => void;
  setCategory: (category: string | null) => void;
  clearFilters: () => void;
};

export const useAppStore = create<State>((set) => ({
  query: "",
  category: null,
  setQuery: (query) => set({ query }),
  setCategory: (category) => set({ category }),
  clearFilters: () => set({ query: "", category: null }),
}));

