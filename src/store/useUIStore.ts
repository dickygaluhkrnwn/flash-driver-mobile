import { create } from 'zustand';

interface UIState {
  isHeaderVisible: boolean;
  setHeaderVisible: (visible: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  isHeaderVisible: true,
  setHeaderVisible: (visible) => set({ isHeaderVisible: visible }),
}));
