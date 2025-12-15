'use client';

import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
  createdAt: number;
}

interface ToastStore {
  toasts: Toast[];
  addToast: (message: string, type?: ToastType, duration?: number) => void;
  removeToast: (id: string) => void;
  clearAll: () => void;
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],

  addToast: (message: string, type: ToastType = 'info', duration: number = 4000) => {
    const id = crypto.randomUUID();
    const toast: Toast = {
      id,
      message,
      type,
      duration,
      createdAt: Date.now(),
    };

    set((state) => ({
      toasts: [...state.toasts, toast],
    }));

    // Auto-remove after duration
    if (duration > 0) {
      setTimeout(() => {
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== id),
        }));
      }, duration);
    }
  },

  removeToast: (id: string) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },

  clearAll: () => {
    set({ toasts: [] });
  },
}));

// Convenience functions for use anywhere
export const toast = {
  success: (message: string, duration?: number) => 
    useToastStore.getState().addToast(message, 'success', duration),
  error: (message: string, duration?: number) => 
    useToastStore.getState().addToast(message, 'error', duration),
  info: (message: string, duration?: number) => 
    useToastStore.getState().addToast(message, 'info', duration),
  warning: (message: string, duration?: number) => 
    useToastStore.getState().addToast(message, 'warning', duration),
};




