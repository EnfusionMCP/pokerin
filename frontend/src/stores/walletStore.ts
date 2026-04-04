import { create } from 'zustand';
import type { TransactionItem } from '../types/api';
import { api } from '../lib/api';

interface WalletState {
  balance: number | null;
  transactions: TransactionItem[];
  loading: boolean;
  error: string | null;

  fetchBalance: () => Promise<void>;
  fetchTransactions: () => Promise<void>;
  withdraw: (amount: number) => Promise<{ success: boolean; message: string }>;
}

export const useWalletStore = create<WalletState>((set, get) => ({
  balance: null,
  transactions: [],
  loading: false,
  error: null,

  fetchBalance: async () => {
    try {
      const data = await api.getBalance();
      set({ balance: data.balance, error: null });
    } catch (e) {
      set({ error: String(e) });
    }
  },

  fetchTransactions: async () => {
    set({ loading: true });
    try {
      const txs = await api.getTransactions(100);
      set({ transactions: txs, loading: false, error: null });
    } catch (e) {
      set({ error: String(e), loading: false });
    }
  },

  withdraw: async (amount: number) => {
    try {
      const resp = await api.withdraw(amount);
      await get().fetchBalance();
      return { success: true, message: `Withdrawal #${resp.withdrawal_id} submitted` };
    } catch (e) {
      return { success: false, message: String(e) };
    }
  },
}));
