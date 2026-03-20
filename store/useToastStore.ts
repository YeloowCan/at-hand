import { create } from "zustand";

type State = {
  message: string | null;
  visible: boolean;
  durationMs: number;
  show: (message: string, durationMs?: number) => void;
  hide: () => void;
};

export const useToastStore = create<State>((set) => ({
  message: null,
  visible: false,
  durationMs: 1600,
  show: (message, durationMs) =>
    set({ message, visible: true, durationMs: durationMs ?? 1600 }),
  hide: () => set({ visible: false }),
}));

