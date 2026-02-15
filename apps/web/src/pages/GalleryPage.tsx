import { useEffect, useState, useCallback } from 'react';
import { GalleryNav } from '@/components/gallery/GalleryNav';
import { GalleryCard } from '@/components/gallery/GalleryCard';
import type { GalleryPresentation } from '@/components/gallery/GalleryCard';
import { Pagination } from '@/components/gallery/Pagination';
import { Search, Layers } from 'lucide-react';

const TYPE_OPTIONS = [
  { value: '', label: 'All Types' },
  { value: 'STANDARD', label: 'Standard' },
  { value: 'VC_PITCH', label: 'VC Pitch' },
  { value: 'TECHNICAL', label: 'Technical' },
  { value: 'EXECUTIVE', label: 'Executive' },
];

export function GalleryPage() {
  const [presentations, setPresentations] = useState<GalleryPresentation[]>([]);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const fetchGallery = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '12' });
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
  }, [page, search, typeFilter]);

  useEffect(() => {
    fetchGallery();
  }, [fetchGallery]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [search, typeFilter]);

  return (
    <div className="min-h-screen bg-slate-50">
      <GalleryNav />

      <div className="mx-auto max-w-6xl px-6 py-10">
        {/* Header */}
        <div className="mb-8">
          <h1 className="mb-1 text-3xl font-bold text-slate-900">Public Gallery</h1>
          <p className="text-slate-500">
            Browse {total > 0 ? `${total} ` : ''}community presentations and use them as templates
          </p>
        </div>

        {/* Filters */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search presentations..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-100"
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
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          </div>
        ) : presentations.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {presentations.map((p) => (
              <GalleryCard key={p.id} presentation={p} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 py-20">
            <Layers className="mb-4 h-12 w-12 text-slate-300" />
            <p className="mb-1 text-lg font-medium text-slate-400">No presentations found</p>
            <p className="text-sm text-slate-400">
              {search || typeFilter
                ? 'Try adjusting your search or filters'
                : 'Be the first to share a presentation'}
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
