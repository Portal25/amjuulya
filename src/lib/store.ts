'use client';

import { create } from 'zustand';
import { User } from '@/lib/supabase/database.types';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  unreadCount: number;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  setUnreadCount: (count: number) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  unreadCount: 0,
  setUser: (user) => set({ user }),
  setLoading: (isLoading) => set({ isLoading }),
  setUnreadCount: (unreadCount) => set({ unreadCount }),
}));
