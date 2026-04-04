import { create } from 'zustand';
import type { TableInfo } from '../types/api';
import { api } from '../lib/api';

interface LobbyState {
  tables: TableInfo[];
  loading: boolean;
  error: string | null;
  fetchTables: () => Promise<void>;
}

export const useLobbyStore = create<LobbyState>((set) => ({
  tables: [],
  loading: false,
  error: null,

  fetchTables: async () => {
    set({ loading: true, error: null });
    try {
      const tables = await api.getTables();
      // Only update if data actually changed (prevents unnecessary re-renders)
      set((state) => {
        const same = state.tables.length === tables.length &&
          state.tables.every((t, i) => t.table_id === tables[i].table_id && t.player_count === tables[i].player_count);
        return same ? { loading: false } : { tables, loading: false };
      });
    } catch (e) {
      set({ error: String(e), loading: false });
    }
  },
}));
