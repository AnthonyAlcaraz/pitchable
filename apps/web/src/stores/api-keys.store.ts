import { create } from 'zustand';
import { api } from '@/lib/api';

export interface ApiKeyListItem {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  rateLimit: number;
  lastUsedAt: string | null;
  expiresAt: string | null;
  isRevoked: boolean;
  createdAt: string;
}

interface ApiKeysState {
  keys: ApiKeyListItem[];
  isLoading: boolean;
  loadKeys: () => Promise<void>;
  createKey: (name: string, scopes: string[]) => Promise<string>;
  revokeKey: (id: string) => Promise<void>;
  rotateKey: (id: string) => Promise<string>;
}

export const useApiKeysStore = create<ApiKeysState>((set, get) => ({
  keys: [],
  isLoading: false,

  loadKeys: async () => {
    set({ isLoading: true });
    try {
      const keys = await api.get<ApiKeyListItem[]>('/api-keys');
      set({ keys, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  createKey: async (name: string, scopes: string[]) => {
    const result = await api.post<ApiKeyListItem & { plaintext: string }>('/api-keys', { name, scopes });
    await get().loadKeys();
    return result.plaintext;
  },

  revokeKey: async (id: string) => {
    await api.delete(`/api-keys/${id}`);
    await get().loadKeys();
  },

  rotateKey: async (id: string) => {
    const result = await api.post<ApiKeyListItem & { plaintext: string }>(`/api-keys/${id}/rotate`, {});
    await get().loadKeys();
    return result.plaintext;
  },
}));
