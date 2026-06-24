import { create } from 'zustand';
import type { CoreData } from '@/types/domain';

export interface Session {
  user: {
    id: string;
    email: string;
    role: string;
    aud: string;
  };
  access_token: string;
  refresh_token: string;
}

interface AppState {
  session: Session | null;
  data: CoreData | null;
  loading: boolean;
  error: string | null;
  lastSync: Date | null;
  setSession: (session: Session | null) => void;
  setData: (data: CoreData | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setLastSync: (date: Date | null) => void;
  clearSession: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  session: null,
  data: null,
  loading: false,
  error: null,
  lastSync: null,
  setSession: (session) => set({ session }),
  setData: (data) => set({ data }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  setLastSync: (lastSync) => set({ lastSync }),
  clearSession: () => set({ session: null, data: null, error: null, lastSync: null }),
}));
