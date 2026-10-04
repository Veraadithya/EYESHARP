import { create } from 'zustand';
import type { InvestigationCase } from '../types';

interface CaseStoreState {
  activeCase: InvestigationCase | null;
  setActiveCase: (investigationCase: InvestigationCase | null) => void;
}

export const useCaseStore = create<CaseStoreState>((set) => ({
  activeCase: null,
  setActiveCase: (investigationCase) => set({ activeCase: investigationCase }),
}));

interface SidebarStoreState {
  isCollapsed: boolean;
  toggleSidebar: () => void;
  setCollapsed: (collapsed: boolean) => void;
}

export const useSidebarStore = create<SidebarStoreState>((set) => ({
  isCollapsed: false,
  toggleSidebar: () => set((state) => ({ isCollapsed: !state.isCollapsed })),
  setCollapsed: (collapsed) => set({ isCollapsed: collapsed }),
}));

interface UIStoreState {
  globalSearchOpen: boolean;
  setGlobalSearchOpen: (open: boolean) => void;
  toggleGlobalSearch: () => void;
}

export const useUIStore = create<UIStoreState>((set) => ({
  globalSearchOpen: false,
  setGlobalSearchOpen: (open) => set({ globalSearchOpen: open }),
  toggleGlobalSearch: () => set((state) => ({ globalSearchOpen: !state.globalSearchOpen })),
}));
