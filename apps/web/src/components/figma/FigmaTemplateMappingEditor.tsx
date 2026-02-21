import { useEffect, useState } from 'react';
import {
  Loader2,
  Wand2,
  RefreshCw,
  X,
  Image as ImageIcon,
  Check,
  Sparkles,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Plus,
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

interface FramesResponse {
  frames: FigmaFrame[];
  planTier?: string;
  dailyApiReads?: number;
  planWarning?: string;
  isRateLimited?: boolean;
  retryAfterSeconds?: number;
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
    lastAutoMapResult,
    loadTemplate,
    mapFrame,
    unmapFrame,
    autoMap,
    autoMapAi,
    refreshThumbnails,
    unmapSingleFrame,
    clearAutoMapResult,
  } = useFigmaTemplateStore();

  const [frames, setFrames] = useState<FigmaFrame[]>([]);
  const [framesLoading, setFramesLoading] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [autoMapping, setAutoMapping] = useState(false);
  const [aiMapping, setAiMapping] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [planInfo, setPlanInfo] = useState<{
    planTier?: string;
    dailyApiReads?: number;
    planWarning?: string;
    isRateLimited?: boolean;
  } | null>(null);
  const [expandedTypes, setExpandedTypes] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadTemplate(templateId);
    return () => { clearAutoMapResult(); };
  }, [templateId, loadTemplate, clearAutoMapResult]);

  useEffect(() => {
    if (currentTemplate?.figmaFileKey) {
      loadFrames(currentTemplate.figmaFileKey);
    }
  }, [currentTemplate?.figmaFileKey]);

  async function loadFrames(fileKey: string) {
    setFramesLoading(true);
    try {
      const data = await api.get<FramesResponse>(
        `/figma/files/${fileKey}`,
      );
      setFrames(data.frames);
      setPlanInfo({
        planTier: data.planTier,
        dailyApiReads: data.dailyApiReads,
        planWarning: data.planWarning,
        isRateLimited: data.isRateLimited,
      });
    } catch {
      // Error handled gracefully
    } finally {
      setFramesLoading(false);
    }
  }

  async function handleMapFrame(slideType: string) {
    if (!selectedNodeId) return;
    const frame = frames.find((f) => f.nodeId === selectedNodeId);
    await mapFrame(templateId, {
      slideType,
      figmaNodeId: selectedNodeId,
      figmaNodeName: frame?.name,
      thumbnailUrl: frame?.thumbnailUrl,
    });
    setSelectedNodeId(null);
  }

  async function handleUnmap(slideType: string) {
    await unmapFrame(templateId, slideType);
  }

  async function handleAutoMap() {
    setAutoMapping(true);
    try {
      await autoMap(templateId);
    } catch {
      // Error handled by store
    } finally {
      setAutoMapping(false);
    }
  }

  async function handleAiAutoMap() {
    setAiMapping(true);
    try {
      await autoMapAi(templateId);
    } catch {
      // Error handled by store
    } finally {
      setAiMapping(false);
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

  function toggleExpanded(slideType: string) {
    setExpandedTypes((prev) => {
      const next = new Set(prev);
      if (next.has(slideType)) next.delete(slideType);
      else next.add(slideType);
      return next;
    });
  }

  // Group mappings by slide type (multi-frame support)
  const mappingsByType = new Map<string, FigmaTemplateMapping[]>();
  for (const m of currentTemplate?.mappings ?? []) {
    const existing = mappingsByType.get(m.slideType) ?? [];
    existing.push(m);
    mappingsByType.set(m.slideType, existing);
  }

  // Count unique mapped types
  const mappedTypeCount = mappingsByType.size;

  const filteredFrames = searchQuery
    ? frames.filter((f) =>
        f.name.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : frames;

  // Find AI mapping info from last auto-map result
  const aiMappingInfo = new Map<string, { confidence?: number; source: string; reasoning?: string }>();
  if (lastAutoMapResult?.mappings) {
    for (const m of lastAutoMapResult.mappings) {
      aiMappingInfo.set(m.slideType, { confidence: m.confidence, source: m.source, reasoning: m.reasoning });
    }
  }

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
            {mappedTypeCount} of {SLIDE_TYPES.length} types mapped
            {currentTemplate.mappings.length > mappedTypeCount && (
              <span className="ml-1 text-muted-foreground/70">
                ({currentTemplate.mappings.length} total frames)
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleAutoMap}
            disabled={autoMapping || aiMapping}
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
            onClick={handleAiAutoMap}
            disabled={aiMapping || autoMapping}
            className="flex items-center gap-1 rounded-md bg-violet-500/10 px-2.5 py-1.5 text-xs font-medium text-violet-600 hover:bg-violet-500/20 disabled:opacity-50 dark:text-violet-400"
            title="Uses AI vision to classify frames by visual layout"
          >
            {aiMapping ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
            AI Map
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

      {/* Plan warning banner */}
      {planInfo?.planWarning && (
        <div className="flex items-start gap-2 border-b border-amber-200 bg-amber-50 px-4 py-2.5 dark:border-amber-800 dark:bg-amber-900/20">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
          <div className="min-w-0 flex-1">
            <p className="text-xs text-amber-700 dark:text-amber-400">
              {planInfo.planWarning}
            </p>
            {planInfo.planTier && planInfo.dailyApiReads && (
              <p className="mt-0.5 text-[11px] text-amber-600/80 dark:text-amber-500/80">
                {planInfo.planTier} &middot; ~{planInfo.dailyApiReads} API reads/day
              </p>
            )}
          </div>
        </div>
      )}

      {/* Rate limit error banner */}
      {planInfo?.isRateLimited && (
        <div className="flex items-start gap-2 border-b border-red-200 bg-red-50 px-4 py-2.5 dark:border-red-800 dark:bg-red-900/20">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-600" />
          <p className="text-xs text-red-700 dark:text-red-400">
            Figma API rate limit exceeded. Frame loading and auto-mapping are temporarily unavailable.
            Try again later or upgrade your Figma plan.
          </p>
        </div>
      )}

      {/* AI auto-map result banner */}
      {lastAutoMapResult && (
        <div className="flex items-center justify-between border-b border-violet-200 bg-violet-50 px-4 py-2 dark:border-violet-800 dark:bg-violet-900/20">
          <p className="text-xs text-violet-700 dark:text-violet-400">
            <Sparkles className="mr-1 inline h-3 w-3" />
            Mapped {lastAutoMapResult.mapped} frames
            {lastAutoMapResult.mappings.some((m) => m.source === 'ai') && (
              <>
                {' '}({lastAutoMapResult.mappings.filter((m) => m.source === 'keyword').length} keyword,{' '}
                {lastAutoMapResult.mappings.filter((m) => m.source === 'ai').length} AI)
              </>
            )}
          </p>
          <button
            onClick={clearAutoMapResult}
            className="rounded p-0.5 text-violet-500 hover:bg-violet-100 dark:hover:bg-violet-900/40"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

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
                {filteredFrames.map((frame) => {
                  // Check if this frame is already mapped somewhere
                  const mappedTo = (currentTemplate?.mappings ?? [])
                    .filter((m) => m.figmaNodeId === frame.nodeId)
                    .map((m) => m.slideType);

                  return (
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
                          : mappedTo.length > 0
                            ? 'border-green-300 dark:border-green-800'
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
                      {mappedTo.length > 0 && (
                        <p className="truncate text-[10px] text-green-600 dark:text-green-400">
                          {mappedTo.join(', ')}
                        </p>
                      )}
                    </button>
                  );
                })}
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
                const mappings = mappingsByType.get(type) ?? [];
                const info = aiMappingInfo.get(type);
                return (
                  <SlotRow
                    key={type}
                    slideType={type}
                    mappings={mappings}
                    canAssign={!!selectedNodeId}
                    aiInfo={info}
                    expanded={expandedTypes.has(type)}
                    onToggleExpand={() => toggleExpanded(type)}
                    onAssign={() => handleMapFrame(type)}
                    onUnmap={() => handleUnmap(type)}
                    onUnmapSingle={(nodeId) => unmapSingleFrame(templateId, type, nodeId)}
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
  mappings,
  canAssign,
  aiInfo,
  expanded,
  onToggleExpand,
  onAssign,
  onUnmap,
  onUnmapSingle,
}: {
  slideType: string;
  mappings: FigmaTemplateMapping[];
  canAssign: boolean;
  aiInfo?: { confidence?: number; source: string; reasoning?: string };
  expanded: boolean;
  onToggleExpand: () => void;
  onAssign: () => void;
  onUnmap: () => void;
  onUnmapSingle: (nodeId: string) => void;
}) {
  const hasMappings = mappings.length > 0;
  const hasMultiple = mappings.length > 1;

  return (
    <div
      className={cn(
        'rounded-md border',
        hasMappings
          ? 'border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-900/10'
          : 'border-border',
      )}
    >
      {/* Main row */}
      <div className="flex items-center gap-2 px-2.5 py-2">
        {/* Expand toggle for multi-frame */}
        {hasMultiple ? (
          <button
            onClick={onToggleExpand}
            className="rounded p-0.5 text-muted-foreground hover:bg-accent"
          >
            {expanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
          </button>
        ) : (
          <div className="w-4" />
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="text-xs font-medium text-foreground">{slideType}</p>
            {aiInfo?.source === 'ai' && aiInfo.confidence != null && (
              <span
                className="inline-flex items-center gap-0.5 rounded-full bg-violet-100 px-1.5 py-0.5 text-[10px] font-medium text-violet-600 dark:bg-violet-900/30 dark:text-violet-400"
                title={aiInfo.reasoning ?? 'AI classified'}
              >
                <Sparkles className="h-2.5 w-2.5" />
                {Math.round(aiInfo.confidence * 100)}%
              </span>
            )}
            {aiInfo?.source === 'keyword' && (
              <span className="rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                keyword
              </span>
            )}
          </div>
          {hasMappings && !hasMultiple && (
            <p className="truncate text-[11px] text-muted-foreground">
              {mappings[0].figmaNodeName ?? mappings[0].figmaNodeId}
            </p>
          )}
          {hasMultiple && (
            <p className="text-[11px] text-muted-foreground">
              {mappings.length} frames assigned (round-robin)
            </p>
          )}
        </div>

        {hasMappings ? (
          <div className="flex items-center gap-1">
            {!hasMultiple && mappings[0].thumbnailUrl && (
              <div className="h-6 w-10 overflow-hidden rounded bg-muted">
                <img
                  src={mappings[0].thumbnailUrl}
                  alt=""
                  className="h-full w-full object-cover"
                />
              </div>
            )}
            {hasMultiple && (
              <div className="flex -space-x-2">
                {mappings.slice(0, 3).map((m) => (
                  <div
                    key={m.id}
                    className="h-6 w-8 overflow-hidden rounded border-2 border-card bg-muted"
                  >
                    {m.thumbnailUrl ? (
                      <img
                        src={m.thumbnailUrl}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <ImageIcon className="h-3 w-3 text-muted-foreground/40" />
                      </div>
                    )}
                  </div>
                ))}
                {mappings.length > 3 && (
                  <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-card bg-muted text-[10px] font-medium text-muted-foreground">
                    +{mappings.length - 3}
                  </div>
                )}
              </div>
            )}
            <Check className="h-3.5 w-3.5 text-green-600" />
            {canAssign ? (
              <button
                onClick={onAssign}
                className="rounded p-0.5 text-muted-foreground hover:text-primary"
                title="Add another frame"
              >
                <Plus className="h-3 w-3" />
              </button>
            ) : (
              <button
                onClick={onUnmap}
                className="rounded p-0.5 text-muted-foreground hover:text-red-500"
                title="Remove all mappings"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        ) : canAssign ? (
          <button
            onClick={onAssign}
            className="rounded-md bg-primary px-2 py-0.5 text-[11px] font-medium text-primary-foreground hover:bg-primary/90"
          >
            Assign
          </button>
        ) : (
          <span className="text-[11px] text-muted-foreground">&mdash;</span>
        )}
      </div>

      {/* Expanded multi-frame list */}
      {hasMultiple && expanded && (
        <div className="border-t border-green-200 px-2.5 pb-2 pt-1 dark:border-green-800">
          {mappings.map((m, idx) => (
            <div
              key={m.id}
              className="group/frame flex items-center gap-2 rounded py-1"
            >
              <span className="w-4 text-center text-[10px] text-muted-foreground">
                {idx + 1}
              </span>
              {m.thumbnailUrl && (
                <div className="h-5 w-8 overflow-hidden rounded bg-muted">
                  <img
                    src={m.thumbnailUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                </div>
              )}
              <span className="min-w-0 flex-1 truncate text-[11px] text-foreground">
                {m.figmaNodeName ?? m.figmaNodeId}
              </span>
              <button
                onClick={() => onUnmapSingle(m.figmaNodeId)}
                className="rounded p-0.5 text-muted-foreground opacity-0 transition-opacity hover:text-red-500 group-hover/frame:opacity-100"
                title="Remove this frame"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default FigmaTemplateMappingEditor;
