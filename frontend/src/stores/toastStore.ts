/** Toast notification store */

import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: number;
  type: ToastType;
  message: string;
}

interface ToastState {
  toasts: Toast[];
  add: (type: ToastType, message: string) => void;
  remove: (id: number) => void;
}

let nextId = 0;

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],

  add: (type, message) => {
    const id = nextId++;
    const toast = { id, type, message };
    // Keep max 3 visible
    set((s) => ({ toasts: [...s.toasts.slice(-2), toast] }));
    // Auto-dismiss after 5s
    setTimeout(() => get().remove(id), 5000);
  },

  remove: (id) => {
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
  },
}));

/** Shorthand helpers callable from anywhere (outside React tree) */
export const toast = {
  success: (msg: string) => useToastStore.getState().add('success', msg),
  error: (msg: string) => useToastStore.getState().add('error', msg),
  info: (msg: string) => useToastStore.getState().add('info', msg),
};
