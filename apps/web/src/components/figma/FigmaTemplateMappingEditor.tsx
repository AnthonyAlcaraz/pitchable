import { useEffect, useState } from 'react';
import {
  Loader2,
  Wand2,
  RefreshCw,
  X,
  Image as ImageIcon,
  Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFigmaTemplateStore } from '@/stores/figma-template.store';
import type { FigmaTemplateMapping } from '@/stores/figma-template.store';
import { api } from '@/lib/api';

const SLIDE_TYPES = [
  'TITLE',
  'PROBLEM',
  'SOLUTION',
  'ARCHITECTURE',
  'PROCESS',
  'COMPARISON',
  'DATA_METRICS',
  'CTA',
  'CONTENT',
  'QUOTE',
  'VISUAL_HUMOR',
  'OUTLINE',
  'TEAM',
  'TIMELINE',
  'SECTION_DIVIDER',
  'METRICS_HIGHLIGHT',
  'FEATURE_GRID',
  'PRODUCT_SHOWCASE',
  'LOGO_WALL',
  'MARKET_SIZING',
  'SPLIT_STATEMENT',
] as const;

interface FigmaFrame {
  nodeId: string;
  name: string;
  width: number;
  height: number;
  pageName: string;
  thumbnailUrl?: string;
}

interface FigmaTemplateMappingEditorProps {
  templateId: string;
  onClose?: () => void;
}

export function FigmaTemplateMappingEditor({
  templateId,
  onClose,
}: FigmaTemplateMappingEditorProps) {
  const {
    currentTemplate,
    isLoading,
    loadTemplate,
    mapFrame,
    unmapFrame,
    autoMap,
    refreshThumbnails,
  } = useFigmaTemplateStore();

  const [frames, setFrames] = useState<FigmaFrame[]>([]);
  const [framesLoading, setFramesLoading] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [autoMapping, setAutoMapping] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadTemplate(templateId);
  }, [templateId, loadTemplate]);

  useEffect(() => {
    if (currentTemplate?.figmaFileKey) {
      loadFrames(currentTemplate.figmaFileKey);
    }
  }, [currentTemplate?.figmaFileKey]);

  async function loadFrames(fileKey: string) {
    setFramesLoading(true);
    try {
      const data = await api.get<{ frames: FigmaFrame[] }>(
        `/figma/files/${fileKey}`,
      );
      setFrames(data.frames);
    } catch {
      // Error handled gracefully — frames panel stays empty
    } finally {
      setFramesLoading(false);
    }
  }

  async function handleMapFrame(slideType: string) {
    if (!selectedNodeId) return;
    await mapFrame(templateId, {
      slideType,
      figmaNodeId: selectedNodeId,
    });
    setSelectedNodeId(null);
  }

  async function handleUnmap(slideType: string) {
    await unmapFrame(templateId, slideType);
  }

  async function handleAutoMap() {
    setAutoMapping(true);
    try {
      const result = await autoMap(templateId);
      // Result shows how many were mapped
    } catch {
      // Error handled by store
    } finally {
      setAutoMapping(false);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await refreshThumbnails(templateId);
    } finally {
      setRefreshing(false);
    }
  }

  const mappingMap = new Map(
    (currentTemplate?.mappings ?? []).map((m) => [m.slideType, m]),
  );

  const filteredFrames = searchQuery
    ? frames.filter((f) =>
        f.name.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : frames;

  if (isLoading && !currentTemplate) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!currentTemplate) return null;

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            {currentTemplate.name}
          </h3>
          <p className="text-xs text-muted-foreground">
            {currentTemplate.mappingCount} of {SLIDE_TYPES.length} types mapped
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleAutoMap}
            disabled={autoMapping}
            className="flex items-center gap-1 rounded-md bg-primary/10 px-2.5 py-1.5 text-xs font-medium text-primary hover:bg-primary/20 disabled:opacity-50"
          >
            {autoMapping ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Wand2 className="h-3.5 w-3.5" />
            )}
            Auto Map
          </button>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-1 rounded-md border border-border px-2.5 py-1.5 text-xs hover:bg-accent disabled:opacity-50"
          >
            <RefreshCw
              className={cn('h-3.5 w-3.5', refreshing && 'animate-spin')}
            />
            Refresh
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="rounded-md p-1 hover:bg-accent"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left: Figma frames */}
        <div className="flex w-1/2 flex-col border-r border-border">
          <div className="border-b border-border px-3 py-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter frames..."
              className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div className="flex-1 overflow-y-auto p-3">
            {framesLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : filteredFrames.length === 0 ? (
              <p className="py-8 text-center text-xs text-muted-foreground">
                {frames.length === 0
                  ? 'No frames found in this Figma file.'
                  : 'No frames match your search.'}
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {filteredFrames.map((frame) => (
                  <button
                    key={frame.nodeId}
                    onClick={() =>
                      setSelectedNodeId(
                        selectedNodeId === frame.nodeId
                          ? null
                          : frame.nodeId,
                      )
                    }
                    className={cn(
                      'rounded-md border-2 p-1.5 text-left transition-colors',
                      selectedNodeId === frame.nodeId
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/30',
                    )}
                  >
                    <div className="mb-1 aspect-video overflow-hidden rounded bg-muted">
                      {frame.thumbnailUrl ? (
                        <img
                          src={frame.thumbnailUrl}
                          alt={frame.name}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <ImageIcon className="h-4 w-4 text-muted-foreground/40" />
                        </div>
                      )}
                    </div>
                    <p className="truncate text-xs font-medium">
                      {frame.name}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: SlideType slots */}
        <div className="flex w-1/2 flex-col">
          <div className="border-b border-border px-3 py-2">
            <p className="text-xs font-medium text-muted-foreground">
              Slide Type Slots
              {selectedNodeId && (
                <span className="ml-1 text-primary">
                  — click a slot to assign
                </span>
              )}
            </p>
          </div>
          <div className="flex-1 overflow-y-auto p-3">
            <div className="space-y-1.5">
              {SLIDE_TYPES.map((type) => {
                const mapping = mappingMap.get(type);
                return (
                  <SlotRow
                    key={type}
                    slideType={type}
                    mapping={mapping}
                    canAssign={!!selectedNodeId}
                    onAssign={() => handleMapFrame(type)}
                    onUnmap={() => handleUnmap(type)}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SlotRow({
  slideType,
  mapping,
  canAssign,
  onAssign,
  onUnmap,
}: {
  slideType: string;
  mapping?: FigmaTemplateMapping;
  canAssign: boolean;
  onAssign: () => void;
  onUnmap: () => void;
}) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-md border px-2.5 py-2',
        mapping ? 'border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-900/10' : 'border-border',
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-foreground">{slideType}</p>
        {mapping && (
          <p className="truncate text-[11px] text-muted-foreground">
            {mapping.figmaNodeName ?? mapping.figmaNodeId}
          </p>
        )}
      </div>

      {mapping ? (
        <div className="flex items-center gap-1">
          {mapping.thumbnailUrl && (
            <div className="h-6 w-10 overflow-hidden rounded bg-muted">
              <img
                src={mapping.thumbnailUrl}
                alt=""
                className="h-full w-full object-cover"
              />
            </div>
          )}
          <Check className="h-3.5 w-3.5 text-green-600" />
          <button
            onClick={onUnmap}
            className="rounded p-0.5 text-muted-foreground hover:text-red-500"
            title="Remove mapping"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ) : canAssign ? (
        <button
          onClick={onAssign}
          className="rounded-md bg-primary px-2 py-0.5 text-[11px] font-medium text-primary-foreground hover:bg-primary/90"
        >
          Assign
        </button>
      ) : (
        <span className="text-[11px] text-muted-foreground">—</span>
      )}
    </div>
  );
}

export default FigmaTemplateMappingEditor;
