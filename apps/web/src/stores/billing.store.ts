import { create } from 'zustand';
import { api } from '@/lib/api';

interface SubscriptionDto {
  id: string;
  tier: string;
  status: string;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
}

interface CreditTransaction {
  id: string;
  amount: number;
  reason: string;
  balanceAfter: number;
  createdAt: string;
}

interface TierStatus {
  tier: string;
  creditBalance: number;
  decksUsed: number;
  decksLimit: number | null;
  creditsPerMonth: number;
  creditsReserved: number;
}

interface BillingState {
  subscription: SubscriptionDto | null;
  transactions: CreditTransaction[];
  tierStatus: TierStatus | null;
  isLoading: boolean;
  error: string | null;

  loadSubscription: () => Promise<void>;
  loadTransactions: (limit?: number) => Promise<void>;
  loadTierStatus: () => Promise<void>;
  createCheckout: (tier: 'STARTER' | 'PRO') => Promise<string>;
  openPortal: () => Promise<string>;
  clearError: () => void;
}

export const useBillingStore = create<BillingState>((set) => ({
  subscription: null,
  transactions: [],
  tierStatus: null,
  isLoading: false,
  error: null,

  loadSubscription: async () => {
    try {
      const sub = await api.get<SubscriptionDto | null>('/billing/subscription');
      set({ subscription: sub });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to load subscription' });
    }
  },

  loadTransactions: async (limit = 20) => {
    try {
      const txns = await api.get<CreditTransaction[]>(`/credits/history?limit=${limit}`);
      set({ transactions: txns });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to load transactions' });
    }
  },

  loadTierStatus: async () => {
    try {
      const status = await api.get<TierStatus>('/credits/tier-status');
      set({ tierStatus: status });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to load tier status' });
    }
  },

  createCheckout: async (tier: 'STARTER' | 'PRO') => {
    set({ isLoading: true, error: null });
    try {
      const { url } = await api.post<{ url: string }>('/billing/checkout', { tier });
      set({ isLoading: false });
      return url;
    } catch (err) {
      set({
        isLoading: false,
        error: err instanceof Error ? err.message : 'Failed to create checkout',
      });
      throw err;
    }
  },

  openPortal: async () => {
    set({ isLoading: true, error: null });
    try {
      const { url } = await api.post<{ url: string }>('/billing/portal');
      set({ isLoading: false });
      return url;
    } catch (err) {
      set({
        isLoading: false,
        error: err instanceof Error ? err.message : 'Failed to open billing portal',
      });
      throw err;
    }
  },

  clearError: () => set({ error: null }),
}));
