import { useState, useEffect } from 'react';
import type { GraphNode, NodeDetails } from '@/stores/pitch-brief.store';
import { usePitchBriefStore } from '@/stores/pitch-brief.store';
import { NODE_COLORS, NODE_TYPE_LABELS } from './graph-types';
import { ChevronDown, ChevronUp, FileText, Link2 } from 'lucide-react';

interface NodeInfoPanelProps {
  node: GraphNode;
  briefId: string;
  onExpand: () => void;
  onCenter: () => void;
  isExpanding: boolean;
}

export function NodeInfoPanel({ node, briefId, onExpand, onCenter, isExpanding }: NodeInfoPanelProps) {
  const color = NODE_COLORS[node.type] ?? '#6b7280';
  const typeLabel = NODE_TYPE_LABELS[node.type] ?? node.type;
  const loadNodeDetails = usePitchBriefStore((s) => s.loadNodeDetails);

  const [details, setDetails] = useState<NodeDetails | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setDetails(null);
    setIsLoadingDetails(true);
    setShowFullDescription(false);
    loadNodeDetails(briefId, node.id).then((d) => {
      if (!cancelled) {
        setDetails(d);
        setIsLoadingDetails(false);
      }
    });
    return () => { cancelled = true; };
  }, [briefId, node.id, loadNodeDetails]);

  const description = details?.description || node.description;
  const isLongDescription = description && description.length > 120;
  const aliases = details?.aliases ?? [];

  return (
    <div className="p-4 bg-background border border-border rounded-lg space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <span
          className="w-3 h-3 rounded-full flex-shrink-0"
          style={{ backgroundColor: color }}
        />
        <span className="font-medium text-foreground text-sm truncate">{node.name}</span>
        <span
          className="px-1.5 py-0.5 rounded text-[10px] font-medium flex-shrink-0"
          style={{ backgroundColor: `${color}20`, color }}
        >
          {typeLabel}
        </span>
        <span className="text-xs text-muted-foreground ml-auto flex-shrink-0">
          {details?.connectionCount ?? node.connectionCount ?? 0} connections
        </span>
      </div>

      {/* Aliases */}
      {aliases.length > 0 && (
        <div className="flex items-center gap-1 flex-wrap">
          <span className="text-[10px] text-muted-foreground">aka</span>
          {aliases.map((alias) => (
            <span
              key={alias}
              className="px-1.5 py-0.5 bg-card border border-border rounded text-[10px] text-muted-foreground"
            >
              {alias}
            </span>
          ))}
        </div>
      )}

      {/* Description */}
      {description && (
        <div>
          <p className={`text-xs text-muted-foreground ${!showFullDescription && isLongDescription ? 'line-clamp-2' : ''}`}>
            {description}
          </p>
          {isLongDescription && (
            <button
              onClick={() => setShowFullDescription(!showFullDescription)}
              className="text-xs text-primary hover:underline mt-0.5 flex items-center gap-0.5"
            >
              {showFullDescription ? (
                <>Show less <ChevronUp className="w-3 h-3" /></>
              ) : (
                <>Show more <ChevronDown className="w-3 h-3" /></>
              )}
            </button>
          )}
        </div>
      )}

      {/* Source Documents */}
      {details && details.sourceDocuments.length > 0 && (
        <div>
          <div className="flex items-center gap-1 mb-1.5">
            <FileText className="w-3 h-3 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">Source Documents</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {details.sourceDocuments.map((doc) => (
              <span
                key={doc.documentId}
                className="px-2 py-0.5 bg-card border border-border rounded text-[10px] text-foreground"
                title={doc.documentTitle}
              >
                {doc.documentTitle.length > 30
                  ? doc.documentTitle.substring(0, 30) + '...'
                  : doc.documentTitle}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Related Entities */}
      {details && details.relationships.length > 0 && (
        <div>
          <div className="flex items-center gap-1 mb-1.5">
            <Link2 className="w-3 h-3 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">
              Related Entities ({details.relationships.length})
            </span>
          </div>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {details.relationships.map((rel, i) => {
              const relColor = NODE_COLORS[rel.targetType] ?? '#6b7280';
              const isCoOccurs = rel.edgeType === 'CO_OCCURS';
              return (
                <div key={`${rel.targetId}-${i}`} className="flex items-center gap-1.5 text-xs">
                  <span className="text-muted-foreground flex-shrink-0">
                    {rel.direction === 'outgoing' ? '\u2192' : '\u2190'}
                  </span>
                  <span
                    className="px-1 py-0.5 rounded text-[9px] font-medium flex-shrink-0"
                    style={{ backgroundColor: `${relColor}20`, color: relColor }}
                  >
                    {(NODE_TYPE_LABELS[rel.targetType] ?? rel.targetType).substring(0, 4)}
                  </span>
                  <span className="text-foreground truncate">{rel.targetName}</span>
                  {/* Weight indicator */}
                  {rel.weight > 1 && (
                    <span className="text-[9px] text-muted-foreground flex-shrink-0" title={`Strength: ${rel.weight.toFixed(1)}`}>
                      {'|'.repeat(Math.min(5, Math.round(rel.weight)))}
                    </span>
                  )}
                  {/* Edge type label for CO_OCCURS */}
                  {isCoOccurs && (
                    <span className="px-1 py-0.5 rounded bg-muted text-[8px] text-muted-foreground flex-shrink-0">
                      co-occurs
                    </span>
                  )}
                  {rel.edgeDescription && !isCoOccurs && (
                    <span className="text-muted-foreground truncate ml-auto text-[10px]">
                      {rel.edgeDescription}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Loading state */}
      {isLoadingDetails && (
        <p className="text-xs text-muted-foreground animate-pulse">Loading details...</p>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-1.5 pt-1 border-t border-border">
        <button
          onClick={onCenter}
          className="px-2 py-1 text-xs bg-card border border-border rounded hover:border-primary/50 transition-colors text-foreground"
        >
          Center view
        </button>
        <button
          onClick={onExpand}
          disabled={isExpanding}
          className="px-2 py-1 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {isExpanding ? 'Loading...' : 'Expand neighbors'}
        </button>
      </div>
    </div>
  );
}
