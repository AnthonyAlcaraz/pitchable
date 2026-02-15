import { useEffect, useState } from 'react';
import { BarChart3, Eye, GitFork, Globe, FileText } from 'lucide-react';
import { api } from '@/lib/api';

interface TopPresentation {
  id: string;
  title: string;
  viewCount: number;
  forkCount: number;
  slideCount: number;
  isPublic: boolean;
  publishedAt: string | null;
}

interface ChartPoint {
  date: string;
  views: number;
}

interface CreatorStats {
  totalViews: number;
  totalForks: number;
  publicCount: number;
  totalPresentations: number;
  topPresentations: TopPresentation[];
  chartData: ChartPoint[];
}

export function AnalyticsPage() {
  const [stats, setStats] = useState<CreatorStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    api.get<CreatorStats>('/analytics/creator-stats')
      .then(setStats)
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return (
      <div className="flex justify-center p-16">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <p className="text-muted-foreground">Failed to load analytics.</p>
      </div>
    );
  }

  const maxViews = Math.max(...stats.chartData.map((d) => d.views), 1);

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="mb-1 flex items-center gap-3">
          <BarChart3 className="h-7 w-7 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Track how your presentations perform
        </p>
      </div>

      {/* Stats row */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-border bg-card p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10">
              <Eye className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Views</p>
              <p className="text-xl font-semibold text-foreground">
                {stats.totalViews.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10">
              <GitFork className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Forks</p>
              <p className="text-xl font-semibold text-foreground">
                {stats.totalForks.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10">
              <Globe className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Public</p>
              <p className="text-xl font-semibold text-foreground">
                {stats.publicCount}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Decks</p>
              <p className="text-xl font-semibold text-foreground">
                {stats.totalPresentations}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 30-day chart */}
      <div className="mb-8 rounded-lg border border-border bg-card p-6">
        <h2 className="mb-4 text-lg font-semibold text-foreground">Views — Last 30 Days</h2>
        <div className="flex h-40 items-end gap-[2px] sm:gap-1">
          {stats.chartData.map((d) => (
            <div
              key={d.date}
              className="group relative flex-1"
              title={`${d.date}: ${d.views} views`}
            >
              <div
                className="w-full rounded-t bg-orange-500/80 transition-colors group-hover:bg-orange-400"
                style={{
                  height: `${Math.max((d.views / maxViews) * 100, d.views > 0 ? 4 : 0)}%`,
                  minHeight: d.views > 0 ? '2px' : '0px',
                }}
              />
            </div>
          ))}
        </div>
        <div className="mt-2 flex justify-between text-[10px] text-muted-foreground sm:text-xs">
          <span>{stats.chartData[0]?.date ?? ''}</span>
          <span>{stats.chartData[stats.chartData.length - 1]?.date ?? ''}</span>
        </div>
      </div>

      {/* Top presentations */}
      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="mb-4 text-lg font-semibold text-foreground">Top Presentations</h2>
        {stats.topPresentations.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No presentations yet. Create one to start tracking analytics.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="pb-3 pr-4 font-medium text-muted-foreground">Title</th>
                  <th className="pb-3 px-4 font-medium text-muted-foreground text-right">Views</th>
                  <th className="pb-3 px-4 font-medium text-muted-foreground text-right">Forks</th>
                  <th className="hidden pb-3 px-4 font-medium text-muted-foreground text-right sm:table-cell">Slides</th>
                  <th className="hidden pb-3 pl-4 font-medium text-muted-foreground text-right md:table-cell">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {stats.topPresentations.map((p) => (
                  <tr key={p.id} className="hover:bg-secondary/50">
                    <td className="py-3 pr-4">
                      <span className="font-medium text-foreground">{p.title}</span>
                    </td>
                    <td className="py-3 px-4 text-right tabular-nums text-muted-foreground">
                      {p.viewCount.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right tabular-nums text-muted-foreground">
                      {p.forkCount}
                    </td>
                    <td className="hidden py-3 px-4 text-right tabular-nums text-muted-foreground sm:table-cell">
                      {p.slideCount}
                    </td>
                    <td className="hidden py-3 pl-4 text-right md:table-cell">
                      {p.isPublic ? (
                        <span className="rounded-full bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-400">
                          Public
                        </span>
                      ) : (
                        <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-muted-foreground">
                          Private
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default AnalyticsPage;
