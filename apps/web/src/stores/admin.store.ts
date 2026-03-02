import { create } from 'zustand';
import { api } from '@/lib/api';

interface DailyPoint { date: string; count: number }
interface NameCount { name: string; count: number }
interface TypeCount { type: string; count: number }
interface FormatCount { format: string; count: number }

interface OverviewData {
  activeUsers: number;
  decksCreated: number;
  exports: number;
  signups: number;
  totalUsers: number;
  dailyDecks: DailyPoint[];
  dailySignups: DailyPoint[];
}

interface UsersData {
  tierDistribution: Array<{ tier: string; count: number }>;
  topUsers: Array<{ userId: string; email: string; name: string; eventCount: number }>;
}

interface FeaturesData {
  slideTypes: TypeCount[];
  themes: NameCount[];
  exportFormats: FormatCount[];
  presentationTypes: TypeCount[];
}

interface GenerationsData {
  total: number;
  successRate: number;
  avgDuration: Array<{ operation: string; avgMs: number }>;
  tokenUsage: { totalInput: number; totalOutput: number; totalCacheRead: number; totalCacheWrite: number };
  modelBreakdown: Array<{ model: string; count: number; totalInput: number; totalOutput: number }>;
  costEstimate: { byModel: Array<{ model: string; cost: number }>; total: number };
  dailyGenerations: DailyPoint[];
}

interface ApiKeysData {
  totalKeys: number;
  activeKeys: number;
  keyUsage: Array<{ keyPrefix: string; name: string; count: number }>;
}

interface FunnelData {
  steps: Array<{ label: string; count: number }>;
}

export interface AdminState {
  days: number;
  loading: boolean;
  overview: OverviewData | null;
  users: UsersData | null;
  features: FeaturesData | null;
  generations: GenerationsData | null;
  apiKeys: ApiKeysData | null;
  funnel: FunnelData | null;
  setDays: (days: number) => void;
  fetchOverview: () => Promise<void>;
  fetchUsers: () => Promise<void>;
  fetchFeatures: () => Promise<void>;
  fetchGenerations: () => Promise<void>;
  fetchApiKeys: () => Promise<void>;
  fetchFunnel: () => Promise<void>;
}

export const useAdminStore = create<AdminState>((set, get) => ({
  days: 30,
  loading: false,
  overview: null,
  users: null,
  features: null,
  generations: null,
  apiKeys: null,
  funnel: null,
  setDays: (days) => set({ days }),
  fetchOverview: async () => {
    set({ loading: true });
    try {
      const data = await api.get<OverviewData>(`/admin/analytics/overview?days=${get().days}`);
      set({ overview: data });
    } finally { set({ loading: false }); }
  },
  fetchUsers: async () => {
    set({ loading: true });
    try {
      const data = await api.get<UsersData>(`/admin/analytics/users?days=${get().days}`);
      set({ users: data });
    } finally { set({ loading: false }); }
  },
  fetchFeatures: async () => {
    set({ loading: true });
    try {
      const data = await api.get<FeaturesData>(`/admin/analytics/features?days=${get().days}`);
      set({ features: data });
    } finally { set({ loading: false }); }
  },
  fetchGenerations: async () => {
    set({ loading: true });
    try {
      const data = await api.get<GenerationsData>(`/admin/analytics/generations?days=${get().days}`);
      set({ generations: data });
    } finally { set({ loading: false }); }
  },
  fetchApiKeys: async () => {
    set({ loading: true });
    try {
      const data = await api.get<ApiKeysData>(`/admin/analytics/api-keys?days=${get().days}`);
      set({ apiKeys: data });
    } finally { set({ loading: false }); }
  },
  fetchFunnel: async () => {
    set({ loading: true });
    try {
      const data = await api.get<FunnelData>(`/admin/analytics/funnel?days=${get().days}`);
      set({ funnel: data });
    } finally { set({ loading: false }); }
  },
}));
