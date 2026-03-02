import { useEffect, useState } from 'react';
import { useAdminStore } from '@/stores/admin.store';
import type { AdminState } from '@/stores/admin.store';
import { cn } from '@/lib/utils';
import {
  BarChart3,
  Users,
  Layers,
  Cpu,
  Key,
  GitMerge,
  Activity,
  UserPlus,
  FileText,
  Download,
  UsersRound,
  CheckCircle,
  Clock,
  DollarSign,
  Zap,
} from 'lucide-react';

/* ---------- shared helpers ---------- */

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-orange-500/10">
          <Icon className="h-5 w-5 text-orange-400" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-xl font-semibold text-foreground">
            {typeof value === 'number' ? value.toLocaleString() : value}
          </p>
        </div>
      </div>
    </div>
  );
}

function BarChart({
  data,
  maxVal,
}: {
  data: Array<{ label: string; value: number }>;
  maxVal: number;
}) {
  return (
    <div className="space-y-1">
      {data.map((d) => (
        <div key={d.label} className="flex items-center gap-2 text-xs">
          <span className="w-24 shrink-0 truncate text-muted-foreground">{d.label}</span>
          <div className="flex-1 rounded-full bg-secondary h-4">
            <div
              className="h-4 rounded-full bg-orange-500/70"
              style={{ width: `${maxVal > 0 ? (d.value / maxVal) * 100 : 0}%` }}
            />
          </div>
          <span className="w-14 text-right tabular-nums text-foreground">{d.value.toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
}

function DailyChart({
  data,
  title,
}: {
  data: Array<{ date: string; count: number }>;
  title: string;
}) {
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <h3 className="mb-4 text-lg font-semibold text-foreground">{title}</h3>
      <div className="flex h-32 items-end gap-[2px] sm:gap-1">
        {data.map((d) => (
          <div
            key={d.date}
            className="group relative flex-1"
            title={`${d.date}: ${d.count}`}
          >
            <div
              className="w-full rounded-t bg-orange-500/80 transition-colors group-hover:bg-orange-400"
              style={{
                height: `${Math.max((d.count / max) * 100, d.count > 0 ? 4 : 0)}%`,
                minHeight: d.count > 0 ? '2px' : '0px',
              }}
            />
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-[10px] text-muted-foreground sm:text-xs">
        <span>{data[0]?.date ?? ''}</span>
        <span>{data[data.length - 1]?.date ?? ''}</span>
      </div>
    </div>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <h3 className="mb-4 text-lg font-semibold text-foreground">{title}</h3>
      {children}
    </div>
  );
}

/* ---------- Tab content components ---------- */

function OverviewTab({ data }: { data: NonNullable<AdminState['overview']> }) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard icon={Activity} label="Active Users" value={data.activeUsers} />
        <StatCard icon={FileText} label="Decks Created" value={data.decksCreated} />
        <StatCard icon={Download} label="Exports" value={data.exports} />
        <StatCard icon={UserPlus} label="Signups" value={data.signups} />
        <StatCard icon={UsersRound} label="Total Users" value={data.totalUsers} />
      </div>
      <DailyChart data={data.dailyDecks} title="Daily Decks Created" />
      <DailyChart data={data.dailySignups} title="Daily Signups" />
    </div>
  );
}

function UsersTab({ data }: { data: NonNullable<AdminState['users']> }) {
  return (
    <div className="space-y-6">
      <SectionCard title="Tier Distribution">
        {data.tierDistribution.length === 0 ? (
          <p className="text-sm text-muted-foreground">No data available.</p>
        ) : (
          <BarChart
            data={data.tierDistribution.map((t) => ({ label: t.tier, value: t.count }))}
            maxVal={Math.max(...data.tierDistribution.map((t) => t.count), 1)}
          />
        )}
      </SectionCard>

      <SectionCard title="Top Users by Activity">
        {data.topUsers.length === 0 ? (
          <p className="text-sm text-muted-foreground">No data available.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="pb-3 pr-4 font-medium text-muted-foreground">Name</th>
                  <th className="pb-3 px-4 font-medium text-muted-foreground">Email</th>
                  <th className="pb-3 pl-4 font-medium text-muted-foreground text-right">Events</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.topUsers.map((u) => (
                  <tr key={u.userId} className="hover:bg-secondary/50">
                    <td className="py-3 pr-4 font-medium text-foreground">{u.name}</td>
                    <td className="py-3 px-4 text-muted-foreground">{u.email}</td>
                    <td className="py-3 pl-4 text-right tabular-nums text-foreground">{u.eventCount.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
}

function FeaturesTab({ data }: { data: NonNullable<AdminState['features']> }) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <SectionCard title="Slide Types">
        <BarChart
          data={data.slideTypes.map((s) => ({ label: s.type, value: s.count }))}
          maxVal={Math.max(...data.slideTypes.map((s) => s.count), 1)}
        />
      </SectionCard>

      <SectionCard title="Themes">
        <BarChart
          data={data.themes.map((t) => ({ label: t.name, value: t.count }))}
          maxVal={Math.max(...data.themes.map((t) => t.count), 1)}
        />
      </SectionCard>

      <SectionCard title="Export Formats">
        <BarChart
          data={data.exportFormats.map((f) => ({ label: f.format, value: f.count }))}
          maxVal={Math.max(...data.exportFormats.map((f) => f.count), 1)}
        />
      </SectionCard>

      <SectionCard title="Presentation Types">
        <BarChart
          data={data.presentationTypes.map((p) => ({ label: p.type, value: p.count }))}
          maxVal={Math.max(...data.presentationTypes.map((p) => p.count), 1)}
        />
      </SectionCard>
    </div>
  );
}

function GenerationsTab({ data }: { data: NonNullable<AdminState['generations']> }) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Zap} label="Total Generations" value={data.total} />
        <StatCard icon={CheckCircle} label="Success Rate" value={`${data.successRate.toFixed(1)}%`} />
        <StatCard
          icon={DollarSign}
          label="Est. Total Cost"
          value={`$${data.costEstimate.total.toFixed(2)}`}
        />
        <StatCard
          icon={Cpu}
          label="Total Tokens"
          value={(data.tokenUsage.totalInput + data.tokenUsage.totalOutput).toLocaleString()}
        />
      </div>

      <DailyChart data={data.dailyGenerations} title="Daily Generations" />

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title="Avg Duration by Operation">
          {data.avgDuration.length === 0 ? (
            <p className="text-sm text-muted-foreground">No data available.</p>
          ) : (
            <div className="space-y-2">
              {data.avgDuration.map((d) => (
                <div key={d.operation} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{d.operation}</span>
                  <span className="tabular-nums text-foreground">
                    <Clock className="mr-1 inline h-3 w-3 text-muted-foreground" />
                    {d.avgMs < 1000 ? `${Math.round(d.avgMs)}ms` : `${(d.avgMs / 1000).toFixed(1)}s`}
                  </span>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard title="Cost by Model">
          {data.costEstimate.byModel.length === 0 ? (
            <p className="text-sm text-muted-foreground">No data available.</p>
          ) : (
            <BarChart
              data={data.costEstimate.byModel.map((m) => ({
                label: m.model.split('/').pop() ?? m.model,
                value: parseFloat(m.cost.toFixed(2)),
              }))}
              maxVal={Math.max(...data.costEstimate.byModel.map((m) => m.cost), 0.01)}
            />
          )}
        </SectionCard>
      </div>

      <SectionCard title="Model Breakdown">
        {data.modelBreakdown.length === 0 ? (
          <p className="text-sm text-muted-foreground">No data available.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="pb-3 pr-4 font-medium text-muted-foreground">Model</th>
                  <th className="pb-3 px-4 font-medium text-muted-foreground text-right">Count</th>
                  <th className="pb-3 px-4 font-medium text-muted-foreground text-right">Input Tokens</th>
                  <th className="pb-3 pl-4 font-medium text-muted-foreground text-right">Output Tokens</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.modelBreakdown.map((m) => (
                  <tr key={m.model} className="hover:bg-secondary/50">
                    <td className="py-3 pr-4 font-medium text-foreground">{m.model}</td>
                    <td className="py-3 px-4 text-right tabular-nums text-muted-foreground">{m.count.toLocaleString()}</td>
                    <td className="py-3 px-4 text-right tabular-nums text-muted-foreground">{m.totalInput.toLocaleString()}</td>
                    <td className="py-3 pl-4 text-right tabular-nums text-foreground">{m.totalOutput.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      <SectionCard title="Token Usage Summary">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-foreground">{data.tokenUsage.totalInput.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Input Tokens</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-foreground">{data.tokenUsage.totalOutput.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Output Tokens</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-foreground">{data.tokenUsage.totalCacheRead.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Cache Reads</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-foreground">{data.tokenUsage.totalCacheWrite.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Cache Writes</p>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}

function ApiKeysTab({ data }: { data: NonNullable<AdminState['apiKeys']> }) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard icon={Key} label="Total Keys" value={data.totalKeys} />
        <StatCard icon={CheckCircle} label="Active Keys" value={data.activeKeys} />
      </div>

      <SectionCard title="Key Usage">
        {data.keyUsage.length === 0 ? (
          <p className="text-sm text-muted-foreground">No API key usage recorded.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="pb-3 pr-4 font-medium text-muted-foreground">Key Prefix</th>
                  <th className="pb-3 px-4 font-medium text-muted-foreground">Name</th>
                  <th className="pb-3 pl-4 font-medium text-muted-foreground text-right">Requests</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.keyUsage.map((k) => (
                  <tr key={k.keyPrefix} className="hover:bg-secondary/50">
                    <td className="py-3 pr-4 font-mono text-xs text-foreground">{k.keyPrefix}...</td>
                    <td className="py-3 px-4 text-muted-foreground">{k.name}</td>
                    <td className="py-3 pl-4 text-right tabular-nums text-foreground">{k.count.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
}

function FunnelTab({ data }: { data: NonNullable<AdminState['funnel']> }) {
  const maxCount = Math.max(...data.steps.map((s) => s.count), 1);
  return (
    <SectionCard title="Conversion Funnel">
      {data.steps.length === 0 ? (
        <p className="text-sm text-muted-foreground">No funnel data available.</p>
      ) : (
        <div className="space-y-3">
          {data.steps.map((step, idx) => {
            const pct = maxCount > 0 ? (step.count / maxCount) * 100 : 0;
            const prevCount = idx > 0 ? data.steps[idx - 1].count : null;
            const convRate = prevCount && prevCount > 0 ? ((step.count / prevCount) * 100).toFixed(1) : null;
            return (
              <div key={step.label}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="font-medium text-foreground">{step.label}</span>
                  <span className="flex items-center gap-2">
                    {convRate !== null && (
                      <span className="text-xs text-muted-foreground">{convRate}% from prev</span>
                    )}
                    <span className="tabular-nums text-foreground">{step.count.toLocaleString()}</span>
                  </span>
                </div>
                <div className="h-6 rounded bg-secondary">
                  <div
                    className="h-6 rounded bg-orange-500/70 transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </SectionCard>
  );
}

/* ---------- Tabs config ---------- */

const TABS = [
  { id: 'overview', label: 'Overview', icon: BarChart3 },
  { id: 'users', label: 'Users', icon: Users },
  { id: 'features', label: 'Features', icon: Layers },
  { id: 'generations', label: 'Generations', icon: Cpu },
  { id: 'api-keys', label: 'API Keys', icon: Key },
  { id: 'funnel', label: 'Funnel', icon: GitMerge },
] as const;

type TabId = (typeof TABS)[number]['id'];

/* ---------- Main page ---------- */

export default function AdminDashboardPage() {
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [selectedDays, setSelectedDays] = useState(30);
  const store = useAdminStore();

  useEffect(() => {
    store.setDays(selectedDays);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDays]);

  useEffect(() => {
    const fetchMap: Record<TabId, () => Promise<void>> = {
      overview: store.fetchOverview,
      users: store.fetchUsers,
      features: store.fetchFeatures,
      generations: store.fetchGenerations,
      'api-keys': store.fetchApiKeys,
      funnel: store.fetchFunnel,
    };
    void fetchMap[activeTab]();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, selectedDays]);

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BarChart3 className="h-7 w-7 text-orange-400" />
          <h1 className="text-2xl font-bold text-foreground">Admin Dashboard</h1>
        </div>
        <select
          value={selectedDays}
          onChange={(e) => setSelectedDays(Number(e.target.value))}
          className="rounded-md border border-border bg-card px-3 py-1.5 text-sm text-foreground"
        >
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex flex-wrap gap-1 rounded-lg border border-border bg-card p-1">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
              activeTab === tab.id
                ? 'bg-orange-500/10 text-orange-400'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary',
            )}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Loading */}
      {store.loading && (
        <div className="flex justify-center p-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      )}

      {/* Tab content */}
      {!store.loading && activeTab === 'overview' && store.overview && (
        <OverviewTab data={store.overview} />
      )}
      {!store.loading && activeTab === 'users' && store.users && (
        <UsersTab data={store.users} />
      )}
      {!store.loading && activeTab === 'features' && store.features && (
        <FeaturesTab data={store.features} />
      )}
      {!store.loading && activeTab === 'generations' && store.generations && (
        <GenerationsTab data={store.generations} />
      )}
      {!store.loading && activeTab === 'api-keys' && store.apiKeys && (
        <ApiKeysTab data={store.apiKeys} />
      )}
      {!store.loading && activeTab === 'funnel' && store.funnel && (
        <FunnelTab data={store.funnel} />
      )}
    </div>
  );
}
