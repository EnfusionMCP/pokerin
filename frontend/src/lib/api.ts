/** REST API client with JWT auth */

import type {
  TableInfo, BalanceResponse, WithdrawResponse, TransactionItem, HandSummary, HandDetail, VerifyResponse,
  AdminUser, AdminWithdrawal, AdminHandSummary, AdminHandDetail, AdminDeposit, AdminRakeStats,
} from '../types/api';
import { useAuthStore } from '../stores/authStore';
import { toast } from '../stores/toastStore';

class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token = useAuthStore.getState().token;
  const res = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });

  if (res.status === 401) {
    useAuthStore.getState().logout();
    toast.error('Session expired — please log in again');
    throw new ApiError(401, 'Session expired');
  }

  if (!res.ok) {
    const text = await res.text();
    // Strip HTML and truncate for toast display
    const clean = text.replace(/<[^>]*>/g, '').slice(0, 150) || `Request failed (${res.status})`;
    toast.error(clean);
    throw new ApiError(res.status, text);
  }

  return res.json();
}

export const api = {
  getTables: () => apiFetch<TableInfo[]>('/api/tables'),
  getBalance: () => apiFetch<BalanceResponse>('/api/balance'),
  withdraw: (amount: number) =>
    apiFetch<WithdrawResponse>('/api/withdraw', {
      method: 'POST',
      body: JSON.stringify({ amount }),
    }),
  getTransactions: (limit = 50) =>
    apiFetch<TransactionItem[]>(`/api/transactions?limit=${limit}`),
  getHands: (limit = 50) =>
    apiFetch<HandSummary[]>(`/api/hands?limit=${limit}`),
  getHandDetail: (id: number) =>
    apiFetch<HandDetail>(`/api/hands/${id}`),
  verifyHand: (serverSeed: string, tableId: string, handNumber: number) =>
    apiFetch<VerifyResponse>('/api/verify', {
      method: 'POST',
      body: JSON.stringify({ server_seed: serverSeed, table_id: tableId, hand_number: handNumber }),
    }),

  // Admin endpoints
  admin: {
    getRake: () => apiFetch<AdminRakeStats>('/api/admin/rake'),
    getUsers: () => apiFetch<AdminUser[]>('/api/admin/users'),
    banUser: (id: number, reason = '') =>
      apiFetch<{ status: string }>(`/api/admin/users/${id}/ban?reason=${encodeURIComponent(reason)}`, { method: 'POST' }),
    unbanUser: (id: number) =>
      apiFetch<{ status: string }>(`/api/admin/users/${id}/unban`, { method: 'POST' }),
    creditUser: (id: number, amount: number) =>
      apiFetch<{ status: string; new_balance: number }>(`/api/admin/users/${id}/credit?amount=${amount}`, { method: 'POST' }),
    deleteUser: (id: number) =>
      apiFetch<{ status: string }>(`/api/admin/users/${id}`, { method: 'DELETE' }),
    getWithdrawals: () => apiFetch<AdminWithdrawal[]>('/api/admin/withdrawals'),
    completeWithdrawal: (id: number) =>
      apiFetch<{ status: string }>(`/api/admin/withdrawals/${id}/complete`, { method: 'POST' }),
    rejectWithdrawal: (id: number, reason = '') =>
      apiFetch<{ status: string }>(`/api/admin/withdrawals/${id}/reject?reason=${encodeURIComponent(reason)}`, { method: 'POST' }),
    getHands: (filters?: { table_id?: string; user_id?: number; limit?: number }) => {
      const params = new URLSearchParams();
      if (filters?.table_id) params.set('table_id', filters.table_id);
      if (filters?.user_id) params.set('user_id', String(filters.user_id));
      if (filters?.limit) params.set('limit', String(filters.limit));
      return apiFetch<AdminHandSummary[]>(`/api/admin/hands?${params}`);
    },
    getHandDetail: (id: number) => apiFetch<AdminHandDetail>(`/api/admin/hands/${id}`),
    getDeposits: (limit = 50) => apiFetch<AdminDeposit[]>(`/api/admin/deposits?limit=${limit}`),
  },
};
