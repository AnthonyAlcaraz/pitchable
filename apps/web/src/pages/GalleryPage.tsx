import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { GalleryNav } from '@/components/gallery/GalleryNav';
import { GalleryCard } from '@/components/gallery/GalleryCard';
import type { GalleryPresentation } from '@/components/gallery/GalleryCard';
import { Pagination } from '@/components/gallery/Pagination';
import { Search, Layers } from 'lucide-react';

export function GalleryPage() {
  const { t } = useTranslation();
  const [presentations, setPresentations] = useState<GalleryPresentation[]>([]);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [sort, setSort] = useState<'recent' | 'trending'>('recent');
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const TYPE_OPTIONS = [
    { value: '', label: t('gallery.type_options.all') },
    { value: 'STANDARD', label: t('gallery.type_options.STANDARD') },
    { value: 'VC_PITCH', label: t('gallery.type_options.VC_PITCH') },
    { value: 'TECHNICAL', label: t('gallery.type_options.TECHNICAL') },
    { value: 'EXECUTIVE', label: t('gallery.type_options.EXECUTIVE') },
  ];

  const fetchGallery = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '12', sort });
      if (search) params.set('search', search);
      if (typeFilter) params.set('type', typeFilter);
      const res = await fetch(`/gallery/presentations?${params}`);
      const data = await res.json();
      setPresentations(data.items ?? []);
      setPageCount(data.pageCount ?? 1);
      setTotal(data.total ?? 0);
    } catch {
      setPresentations([]);
    } finally {
      setIsLoading(false);
    }
  }, [page, search, typeFilter, sort]);

  useEffect(() => {
    fetchGallery();
  }, [fetchGallery]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [search, typeFilter, sort]);

  return (
    <div className="min-h-screen bg-background">
      <GalleryNav />

      <div className="mx-auto max-w-6xl px-6 py-10">
        {/* Header */}
        <div className="mb-8">
          <h1 className="mb-1 text-3xl font-bold text-foreground">{t('gallery.page.title')}</h1>
          <p className="text-muted-foreground">
            {total > 0
              ? t('gallery.page.subtitle', { count: total })
              : t('gallery.page.subtitle_empty')}
          </p>
        </div>

        {/* Sort toggle */}
        <div className="mb-6 flex gap-1 rounded-lg bg-card p-1">
          {(['recent', 'trending'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSort(s)}
              className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                sort === s
                  ? 'bg-orange-500 text-white'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {s === 'recent' ? t('gallery.page.sort_recent') : t('gallery.page.sort_trending')}
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder={t('gallery.page.search_placeholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-border bg-card py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-orange-500/50 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
            />
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="rounded-lg border border-border bg-card px-4 py-2.5 text-sm text-foreground focus:border-orange-500/50 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
          >
            {TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="flex justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
          </div>
        ) : presentations.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {presentations.map((p) => (
              <GalleryCard key={p.id} presentation={p} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border py-20">
            <Layers className="mb-4 h-12 w-12 text-muted-foreground/30" />
            <p className="mb-1 text-lg font-medium text-muted-foreground">{t('gallery.page.no_presentations_title')}</p>
            <p className="text-sm text-muted-foreground">
              {search || typeFilter
                ? t('gallery.page.no_presentations_hint_filter')
                : t('gallery.page.no_presentations_hint_empty')}
            </p>
          </div>
        )}

        {/* Pagination */}
        <Pagination page={page} pageCount={pageCount} onChange={setPage} />
      </div>
    </div>
  );
}

export default GalleryPage;
