import type { GraphNode } from '@/stores/pitch-brief.store';
import { NODE_COLORS, NODE_TYPE_LABELS } from './graph-types';

interface NodeInfoPanelProps {
  node: GraphNode;
  onExpand: () => void;
  onCenter: () => void;
  isExpanding: boolean;
}

export function NodeInfoPanel({ node, onExpand, onCenter, isExpanding }: NodeInfoPanelProps) {
  const color = NODE_COLORS[node.type] ?? '#6b7280';
  const typeLabel = NODE_TYPE_LABELS[node.type] ?? node.type;

  return (
    <div className="p-3 bg-background border border-border rounded-lg">
      <div className="flex items-center gap-2 mb-1.5">
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
      </div>

      {node.description && (
        <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{node.description}</p>
      )}

      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {node.connectionCount ?? 0} connections
        </span>
        <div className="flex gap-1.5">
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
    </div>
  );
}
