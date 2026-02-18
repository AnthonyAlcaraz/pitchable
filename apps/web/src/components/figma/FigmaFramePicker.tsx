import { useState, useCallback } from 'react';
import { X, Loader2, Search, Image as ImageIcon, ExternalLink } from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

interface FigmaFrame {
  nodeId: string;
  name: string;
  width: number;
  height: number;
  pageName: string;
  thumbnailUrl?: string;
}

interface FigmaFramePickerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (frame: { fileKey: string; nodeId: string; nodeName: string }) => void;
  /** Pre-fill from PitchLens */
  defaultFileKey?: string;
  lensId?: string;
}

export function FigmaFramePicker({
  open,
  onClose,
  onSelect,
  defaultFileKey,
  lensId,
}: FigmaFramePickerProps) {
  const [fileUrl, setFileUrl] = useState('');
  const [fileKey, setFileKey] = useState(defaultFileKey ?? '');
  const [frames, setFrames] = useState<FigmaFrame[]>([]);
  const [filteredFrames, setFilteredFrames] = useState<FigmaFrame[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const extractFileKey = useCallback((input: string): string | null => {
    // Handle full Figma URLs: https://www.figma.com/file/ABC123/...
    // or https://www.figma.com/design/ABC123/...
    const urlMatch = input.match(/figma\.com\/(?:file|design)\/([a-zA-Z0-9]+)/);
    if (urlMatch) return urlMatch[1];
    // If it looks like a raw key (alphanumeric, 22+ chars)
    if (/^[a-zA-Z0-9]{10,}$/.test(input.trim())) return input.trim();
    return null;
  }, []);

  async function handleLoadFrames() {
    const key = extractFileKey(fileUrl || fileKey);
    if (!key) {
      setError('Please enter a valid Figma file URL or key');
      return;
    }
    setFileKey(key);
    setIsLoading(true);
    setError(null);
    setFrames([]);
    setFilteredFrames([]);
    setSelectedNodeId(null);

    try {
      const lensParam = lensId ? `?lensId=${lensId}` : '';
      const data = await api.get<FigmaFrame[]>(`/figma/files/${key}${lensParam}`);
      setFrames(data);
      setFilteredFrames(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load frames');
    } finally {
      setIsLoading(false);
    }
  }

  function handleSearch(query: string) {
    setSearchQuery(query);
    if (!query.trim()) {
      setFilteredFrames(frames);
      return;
    }
    const q = query.toLowerCase();
    setFilteredFrames(
      frames.filter(
        (f) =>
          f.name.toLowerCase().includes(q) ||
          f.pageName.toLowerCase().includes(q),
      ),
    );
  }

  function handleConfirm() {
    const frame = frames.find((f) => f.nodeId === selectedNodeId);
    if (!frame || !fileKey) return;
    onSelect({ fileKey, nodeId: frame.nodeId, nodeName: frame.name });
    onClose();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="relative mx-4 flex max-h-[85vh] w-full max-w-2xl flex-col rounded-xl border border-border bg-card shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-lg font-semibold text-foreground">
            Select Figma Frame
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 hover:bg-accent"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        {/* File URL input */}
        <div className="border-b border-border px-5 py-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={fileUrl || fileKey}
              onChange={(e) => {
                setFileUrl(e.target.value);
                setError(null);
              }}
              placeholder="Paste Figma file URL or key..."
              className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              onKeyDown={(e) => e.key === 'Enter' && handleLoadFrames()}
            />
            <button
              onClick={handleLoadFrames}
              disabled={isLoading || !(fileUrl || fileKey)}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ExternalLink className="h-4 w-4" />
              )}
              Load
            </button>
          </div>
          {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
        </div>

        {/* Search (only when frames loaded) */}
        {frames.length > 0 && (
          <div className="border-b border-border px-5 py-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Filter frames..."
                className="w-full rounded-lg border border-border bg-background py-1.5 pl-8 pr-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>
        )}

        {/* Frame grid */}
        <div className="flex-1 overflow-y-auto px-5 py-3">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="ml-2 text-sm text-muted-foreground">
                Loading frames...
              </span>
            </div>
          ) : filteredFrames.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filteredFrames.map((frame) => (
                <button
                  key={frame.nodeId}
                  onClick={() => setSelectedNodeId(frame.nodeId)}
                  className={cn(
                    'rounded-lg border-2 p-2 text-left transition-colors',
                    selectedNodeId === frame.nodeId
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/30',
                  )}
                >
                  {/* Thumbnail */}
                  <div className="mb-2 aspect-video overflow-hidden rounded bg-muted">
                    {frame.thumbnailUrl ? (
                      <img
                        src={frame.thumbnailUrl}
                        alt={frame.name}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <ImageIcon className="h-6 w-6 text-muted-foreground/50" />
                      </div>
                    )}
                  </div>
                  {/* Info */}
                  <p className="truncate text-sm font-medium text-foreground">
                    {frame.name}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {frame.pageName} &middot; {frame.width}&times;{frame.height}
                  </p>
                </button>
              ))}
            </div>
          ) : frames.length === 0 && !isLoading ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              Enter a Figma file URL above to browse frames.
            </div>
          ) : (
            <div className="py-12 text-center text-sm text-muted-foreground">
              No frames match your search.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border px-5 py-3">
          <span className="text-xs text-muted-foreground">
            {filteredFrames.length} frame{filteredFrames.length !== 1 ? 's' : ''}
          </span>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="rounded-lg border border-border px-4 py-1.5 text-sm hover:bg-accent"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={!selectedNodeId}
              className="rounded-lg bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              Use This Frame
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
