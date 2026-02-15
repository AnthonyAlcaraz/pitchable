import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '@/lib/api';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  tier: string;
  creditBalance: number;
}

interface LoginResponse {
  tokens: { accessToken: string; refreshToken: string };
  user: User;
}

interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
}

interface MessageResponse {
  message: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshTokens: () => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (token: string, newPassword: string) => Promise<void>;
  clearError: () => void;
  fetchProfile: () => Promise<void>;
  refreshCreditBalance: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const data = await api.post<LoginResponse>('/auth/login', {
            email,
            password,
          });
          set({
            user: data.user,
            accessToken: data.tokens.accessToken,
            refreshToken: data.tokens.refreshToken,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (err) {
          set({
            isLoading: false,
            error: err instanceof Error ? err.message : 'Login failed',
          });
          throw err;
        }
      },

      register: async (email: string, password: string, name: string) => {
        set({ isLoading: true, error: null });
        try {
          const data = await api.post<LoginResponse>('/auth/register', {
            email,
            password,
            name,
          });
          set({
            user: data.user,
            accessToken: data.tokens.accessToken,
            refreshToken: data.tokens.refreshToken,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (err) {
          set({
            isLoading: false,
            error: err instanceof Error ? err.message : 'Registration failed',
          });
          throw err;
        }
      },

      logout: async () => {
        try {
          await api.post<MessageResponse>('/auth/logout');
        } catch {
          // Logout endpoint might fail if token already expired - that's fine
        }
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          error: null,
        });
      },

      refreshTokens: async () => {
        const { refreshToken } = get();
        if (!refreshToken) return;

        try {
          const data = await api.post<RefreshResponse>('/auth/refresh');
          set({
            accessToken: data.accessToken,
            refreshToken: data.refreshToken,
          });
        } catch {
          set({
            user: null,
            accessToken: null,
            refreshToken: null,
            isAuthenticated: false,
          });
        }
      },

      forgotPassword: async (email: string) => {
        set({ isLoading: true, error: null });
        try {
          await api.post<MessageResponse>('/auth/forgot-password', { email });
          set({ isLoading: false });
        } catch (err) {
          set({
            isLoading: false,
            error:
              err instanceof Error ? err.message : 'Failed to send reset email',
          });
          throw err;
        }
      },

      resetPassword: async (token: string, newPassword: string) => {
        set({ isLoading: true, error: null });
        try {
          await api.post<MessageResponse>('/auth/reset-password', {
            token,
            newPassword,
          });
          set({ isLoading: false });
        } catch (err) {
          set({
            isLoading: false,
            error:
              err instanceof Error ? err.message : 'Failed to reset password',
          });
          throw err;
        }
      },

      clearError: () => set({ error: null }),

      fetchProfile: async () => {
        try {
          const user = await api.get<User>('/auth/profile');
          set({ user, isAuthenticated: true });
        } catch {
          set({
            user: null,
            accessToken: null,
            refreshToken: null,
            isAuthenticated: false,
          });
        }
      },

      refreshCreditBalance: async () => {
        try {
          const { balance } = await api.get<{ balance: number }>('/credits/balance');
          set((s) => ({
            user: s.user ? { ...s.user, creditBalance: balance } : null,
          }));
        } catch {
          // Silently fail — balance will refresh on next page load
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);
