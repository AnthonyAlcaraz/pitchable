import { useState, useCallback, useRef, useMemo, useEffect, useReducer } from 'react';
import type { GraphData, GraphNode, GraphEdge } from '@/stores/pitch-brief.store';
import { usePitchBriefStore } from '@/stores/pitch-brief.store';
import { useForceSimulation } from './useForceSimulation';
import { TypeFilterChips } from './TypeFilterChips';
import { NodeInfoPanel } from './NodeInfoPanel';
import {
  NODE_COLORS,
  getNodeRadius,
  getEdgeOpacity,
  getInitialNodes,
  type PositionedNode,
  type SimEdge,
} from './graph-types';
import { Network, RefreshCw, Maximize2, X } from 'lucide-react';

interface InteractiveGraphProps {
  graphData: GraphData;
  briefId: string;
  onRefresh: () => void;
}

const GRAPH_WIDTH = 600;
const GRAPH_HEIGHT = 400;
const MIN_VIEWBOX_SIZE = 200;
const MAX_VIEWBOX_SIZE = 1200;

export function InteractiveGraph({ graphData, briefId, onRefresh }: InteractiveGraphProps) {
  const loadNeighbors = usePitchBriefStore((s) => s.loadNeighbors);

  // Force re-render counter (used by simulation tick)
  const [, forceRender] = useReducer((x: number) => x + 1, 0);

  // Track which nodes/edges are currently visible
  const [visibleNodeIds, setVisibleNodeIds] = useState<Set<string>>(new Set());
  const [visibleEdges, setVisibleEdges] = useState<GraphEdge[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [expandedNodeIds, setExpandedNodeIds] = useState<Set<string>>(new Set());
  const [isExpanding, setIsExpanding] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Type filter
  const [activeTypes, setActiveTypes] = useState<Set<string>>(new Set());

  // Zoom/pan state
  const [viewBox, setViewBox] = useState({ x: 0, y: 0, w: GRAPH_WIDTH, h: GRAPH_HEIGHT });
  const viewBoxRef = useRef({ x: 0, y: 0, w: GRAPH_WIDTH, h: GRAPH_HEIGHT });
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef<{ x: number; y: number; vx: number; vy: number } | null>(null);

  // Drag state
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const wasDraggedRef = useRef(false);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);

  // Click/double-click disambiguation
  const clickTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Mutable refs for simulation data (d3 mutates in place)
  const simNodesRef = useRef<PositionedNode[]>([]);
  const simEdgesRef = useRef<SimEdge[]>([]);

  // Rebuild key: increments whenever simulation arrays are rebuilt
  const [rebuildKey, setRebuildKey] = useState(0);

  // Separate ref for expanded neighbor nodes (not from graphData)
  const expandedNodesRef = useRef<Map<string, GraphNode>>(new Map());

  // Keep viewBoxRef in sync
  useEffect(() => {
    viewBoxRef.current = viewBox;
  }, [viewBox]);

  // Build the all-nodes map from graphData + expanded neighbors
  const allNodesMap = useMemo(() => {
    const map = new Map<string, GraphNode>();
    for (const n of graphData.nodes) map.set(n.id, n);
    // Merge expanded neighbor nodes
    for (const [id, n] of expandedNodesRef.current) {
      if (!map.has(id)) map.set(id, n);
    }
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graphData.nodes, rebuildKey]);

  // Initialize visible nodes from graphData
  useEffect(() => {
    const initial = getInitialNodes(graphData.nodes);
    const ids = new Set(initial.map((n) => n.id));
    setVisibleNodeIds(ids);

    // Collect all available types
    const types = new Set(graphData.nodes.map((n) => n.type));
    setActiveTypes(types);

    // Reset state
    setSelectedNodeId(null);
    setExpandedNodeIds(new Set());
    setVisibleEdges([]);
    expandedNodesRef.current = new Map();
  }, [graphData]);

  // Rebuild simulation arrays when inputs change
  useEffect(() => {
    const nodes: PositionedNode[] = [];
    for (const id of visibleNodeIds) {
      const node = allNodesMap.get(id);
      if (!node || !activeTypes.has(node.type)) continue;
      // Preserve existing position if node was already in simulation
      const existing = simNodesRef.current.find((rn) => rn.id === id);
      nodes.push({
        ...node,
        x: existing?.x ?? GRAPH_WIDTH / 2 + (Math.random() - 0.5) * 100,
        y: existing?.y ?? GRAPH_HEIGHT / 2 + (Math.random() - 0.5) * 100,
        fx: existing?.fx,
        fy: existing?.fy,
      });
    }

    const nodeIdSet = new Set(nodes.map((n) => n.id));
    const allEdges = [...graphData.edges, ...visibleEdges];
    const edgeSet = new Set<string>();
    const edges: SimEdge[] = [];
    for (const e of allEdges) {
      if (!nodeIdSet.has(e.source) || !nodeIdSet.has(e.target)) continue;
      const key = `${e.source}-${e.target}-${e.type}`;
      if (edgeSet.has(key)) continue;
      edgeSet.add(key);
      edges.push({
        source: e.source,
        target: e.target,
        type: e.type,
        description: e.description,
        weight: e.weight,
      });
    }

    simNodesRef.current = nodes;
    simEdgesRef.current = edges;
    setRebuildKey((k) => k + 1);
  }, [visibleNodeIds, activeTypes, allNodesMap, graphData.edges, visibleEdges]);

  const handleTick = useCallback(() => {
    forceRender();
  }, [forceRender]);

  const { reheat, pinNode, unpinNode } = useForceSimulation(simNodesRef, simEdgesRef, {
    width: GRAPH_WIDTH,
    height: GRAPH_HEIGHT,
    onTick: handleTick,
    rebuildKey,
  });

  // Read current nodes/edges from refs for rendering
  const renderedNodes = simNodesRef.current;
  const renderedEdges = simEdgesRef.current;

  // Available types from all graph data nodes + expanded nodes
  const availableTypes = useMemo(() => {
    const types = new Set<string>();
    for (const n of graphData.nodes) types.add(n.type);
    for (const [, n] of expandedNodesRef.current) types.add(n.type);
    return Array.from(types).sort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graphData.nodes, rebuildKey]);

  const handleToggleType = useCallback((type: string) => {
    setActiveTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  }, []);

  // Node click = select (with drag guard and dblclick disambiguation)
  const handleNodeClick = useCallback((nodeId: string) => {
    if (wasDraggedRef.current) {
      wasDraggedRef.current = false;
      return;
    }
    clearTimeout(clickTimeoutRef.current);
    clickTimeoutRef.current = setTimeout(() => {
      setSelectedNodeId((prev) => (prev === nodeId ? null : nodeId));
    }, 200);
  }, []);

  // Double-click = expand
  const handleNodeDoubleClick = useCallback(
    async (nodeId: string) => {
      // Cancel pending single-click
      clearTimeout(clickTimeoutRef.current);
      // Select the node on double-click
      setSelectedNodeId(nodeId);

      if (expandedNodeIds.has(nodeId) || isExpanding) return;
      setIsExpanding(true);
      try {
        const data = await loadNeighbors(briefId, nodeId, 20);

        // Merge new nodes into expandedNodesRef (not into useMemo)
        for (const n of data.neighbors) {
          if (!expandedNodesRef.current.has(n.id)) {
            expandedNodesRef.current.set(n.id, n);
          }
        }

        // Collect new node IDs and types
        const newNodeIds = data.neighbors.map((n) => n.id);
        const newTypes = new Set(data.neighbors.map((n) => n.type));

        // Merge new node IDs into visible set
        setVisibleNodeIds((prev) => {
          const next = new Set(prev);
          for (const id of newNodeIds) next.add(id);
          return next;
        });

        // Ensure new types are active (separate setState, not nested)
        setActiveTypes((prev) => {
          let updated = prev;
          for (const type of newTypes) {
            if (!updated.has(type)) {
              if (updated === prev) updated = new Set(prev);
              updated.add(type);
            }
          }
          return updated;
        });

        // Merge new edges (deduplicated)
        setVisibleEdges((prev) => {
          const existing = new Set(prev.map((e) => `${e.source}-${e.target}-${e.type}`));
          const newEdges = data.edges.filter(
            (e) => !existing.has(`${e.source}-${e.target}-${e.type}`),
          );
          return newEdges.length > 0 ? [...prev, ...newEdges] : prev;
        });

        setExpandedNodeIds((prev) => new Set(prev).add(nodeId));
        // Give React a tick to rebuild arrays, then reheat
        setTimeout(() => reheat(0.3), 50);
      } catch {
        // Non-critical
      } finally {
        setIsExpanding(false);
      }
    },
    [briefId, expandedNodeIds, isExpanding, loadNeighbors, reheat],
  );

  const handleExpand = useCallback(() => {
    if (selectedNodeId) {
      void handleNodeDoubleClick(selectedNodeId);
    }
  }, [selectedNodeId, handleNodeDoubleClick]);

  const handleCenter = useCallback(() => {
    if (!selectedNodeId) return;
    // Read directly from ref for live positions
    const node = simNodesRef.current.find((n) => n.id === selectedNodeId);
    if (!node || isNaN(node.x) || isNaN(node.y)) return;
    setViewBox((prev) => ({
      ...prev,
      x: node.x - prev.w / 2,
      y: node.y - prev.h / 2,
    }));
  }, [selectedNodeId]);

  // Zoom via native wheel event (non-passive to allow preventDefault)
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const handler = (e: WheelEvent) => {
      const vb = viewBoxRef.current;
      const factor = e.deltaY > 0 ? 1.1 : 0.9;
      const newW = Math.max(MIN_VIEWBOX_SIZE, Math.min(MAX_VIEWBOX_SIZE, vb.w * factor));
      const newH = Math.max(MIN_VIEWBOX_SIZE, Math.min(MAX_VIEWBOX_SIZE, vb.h * factor));
      // Only intercept scroll if zoom actually changes (not clamped at bounds)
      if (newW === vb.w && newH === vb.h) return;
      e.preventDefault();
      const dx = (newW - vb.w) / 2;
      const dy = (newH - vb.h) / 2;
      setViewBox({ x: vb.x - dx, y: vb.y - dy, w: newW, h: newH });
    };
    svg.addEventListener('wheel', handler, { passive: false });
    return () => svg.removeEventListener('wheel', handler);
  }, []);

  // Pan handlers (on SVG background) — use viewBoxRef to avoid closure staleness
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      const tag = (e.target as SVGElement).tagName;
      if (tag === 'svg' || tag === 'rect') {
        setIsPanning(true);
        const vb = viewBoxRef.current;
        panStartRef.current = { x: e.clientX, y: e.clientY, vx: vb.x, vy: vb.y };
      }
    },
    [],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isPanning && panStartRef.current) {
        const svg = svgRef.current;
        if (!svg) return;
        const vb = viewBoxRef.current;
        const scale = vb.w / svg.clientWidth;
        const dx = (e.clientX - panStartRef.current.x) * scale;
        const dy = (e.clientY - panStartRef.current.y) * scale;
        setViewBox({
          ...vb,
          x: panStartRef.current.vx - dx,
          y: panStartRef.current.vy - dy,
        });
      }

      if (draggingNodeId) {
        // Only mark as dragged after 3px movement threshold
        if (!wasDraggedRef.current && dragStartRef.current) {
          const dx = e.clientX - dragStartRef.current.x;
          const dy = e.clientY - dragStartRef.current.y;
          if (dx * dx + dy * dy < 9) return;
          wasDraggedRef.current = true;
        }
        const svg = svgRef.current;
        if (!svg) return;
        const rect = svg.getBoundingClientRect();
        const vb = viewBoxRef.current;
        const scale = vb.w / rect.width;
        const x = vb.x + (e.clientX - rect.left) * scale;
        const y = vb.y + (e.clientY - rect.top) * scale;
        pinNode(draggingNodeId, x, y);
      }
    },
    [isPanning, draggingNodeId, pinNode],
  );

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
    panStartRef.current = null;
    if (draggingNodeId) {
      unpinNode(draggingNodeId);
      setDraggingNodeId(null);
      dragStartRef.current = null;
      // Gentle reheat so nodes don't overlap after drop
      reheat(0.1);
    }
  }, [draggingNodeId, unpinNode, reheat]);

  // Node drag handlers
  const handleNodeMouseDown = useCallback(
    (e: React.MouseEvent, nodeId: string) => {
      e.stopPropagation();
      wasDraggedRef.current = false;
      dragStartRef.current = { x: e.clientX, y: e.clientY };
      setDraggingNodeId(nodeId);
      const svg = svgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      const vb = viewBoxRef.current;
      const scale = vb.w / rect.width;
      const x = vb.x + (e.clientX - rect.left) * scale;
      const y = vb.y + (e.clientY - rect.top) * scale;
      pinNode(nodeId, x, y);
    },
    [pinNode],
  );

  // Edge tooltip
  const [hoveredEdge, setHoveredEdge] = useState<{ x: number; y: number; label: string } | null>(null);

  const selectedNode = selectedNodeId ? allNodesMap.get(selectedNodeId) ?? null : null;

  // Close fullscreen on Escape
  useEffect(() => {
    if (!isFullscreen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsFullscreen(false);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isFullscreen]);

  if (graphData.nodes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[400px] bg-background rounded-lg border border-border">
        <Network className="w-12 h-12 text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground">No graph data yet. Upload documents to build the knowledge graph.</p>
      </div>
    );
  }

  const graphHeight = isFullscreen ? 'h-[calc(100vh-200px)]' : 'h-[400px]';

  const graphContent = (
    <div className="relative">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xl font-semibold text-foreground">Knowledge Graph</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="px-2 py-1 text-sm bg-background border border-border rounded-lg hover:border-primary/50 transition-colors flex items-center gap-1.5"
            title={isFullscreen ? 'Exit fullscreen' : 'Expand to fullscreen'}
          >
            {isFullscreen ? <X className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={onRefresh}
            className="px-3 py-1 text-sm bg-background border border-border rounded-lg hover:border-primary/50 transition-colors flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
        </div>
      </div>

      {/* Type filter chips */}
      <div className="mb-3">
        <TypeFilterChips
          availableTypes={availableTypes}
          activeTypes={activeTypes}
          onToggle={handleToggleType}
        />
      </div>

      {/* SVG Canvas */}
      <svg
        ref={svgRef}
        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
        className={`w-full ${graphHeight} bg-background rounded-lg border border-border select-none`}
        style={{ cursor: isPanning ? 'grabbing' : draggingNodeId ? 'grabbing' : 'grab' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Background rect for pan detection */}
        <rect
          x={viewBox.x}
          y={viewBox.y}
          width={viewBox.w}
          height={viewBox.h}
          fill="transparent"
        />

        {/* Render edges */}
        {renderedEdges.map((edge, i) => {
          const source = typeof edge.source === 'object' ? edge.source : renderedNodes.find((n) => n.id === edge.source);
          const target = typeof edge.target === 'object' ? edge.target : renderedNodes.find((n) => n.id === edge.target);
          if (!source || !target) return null;

          const sx = (source as PositionedNode).x;
          const sy = (source as PositionedNode).y;
          const tx = (target as PositionedNode).x;
          const ty = (target as PositionedNode).y;

          if (isNaN(sx) || isNaN(sy) || isNaN(tx) || isNaN(ty)) return null;

          return (
            <line
              key={`edge-${i}`}
              x1={sx}
              y1={sy}
              x2={tx}
              y2={ty}
              stroke="#444"
              strokeWidth="1"
              opacity={getEdgeOpacity(edge.weight)}
              onMouseEnter={(ev) => {
                setHoveredEdge({
                  x: ev.clientX,
                  y: ev.clientY - 30,
                  label: edge.type + (edge.description ? `: ${edge.description}` : ''),
                });
              }}
              onMouseLeave={() => setHoveredEdge(null)}
              style={{ cursor: 'default' }}
            />
          );
        })}

        {/* Render nodes */}
        {renderedNodes.map((node) => {
          const color = NODE_COLORS[node.type] ?? '#6b7280';
          const radius = getNodeRadius(node.connectionCount);
          const isSelected = node.id === selectedNodeId;
          const isExpanded = expandedNodeIds.has(node.id);
          const displayLabel =
            (node.name || '').length > 14 ? node.name.substring(0, 14) + '...' : node.name || '';

          if (isNaN(node.x) || isNaN(node.y)) return null;

          return (
            <g
              key={node.id}
              style={{ cursor: draggingNodeId === node.id ? 'grabbing' : 'pointer' }}
              onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
              onClick={(e) => {
                e.stopPropagation();
                handleNodeClick(node.id);
              }}
              onDoubleClick={(e) => {
                e.stopPropagation();
                void handleNodeDoubleClick(node.id);
              }}
            >
              {/* Invisible hit area for small nodes */}
              <circle
                cx={node.x}
                cy={node.y}
                r={Math.max(14, radius)}
                fill="transparent"
                stroke="none"
              />
              {/* Selection ring */}
              {isSelected && (
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={radius + 4}
                  fill="none"
                  stroke={color}
                  strokeWidth="2"
                  opacity={0.6}
                />
              )}
              {/* Expanded indicator */}
              {isExpanded && (
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={radius + 2}
                  fill="none"
                  stroke={color}
                  strokeWidth="1"
                  strokeDasharray="3 2"
                  opacity={0.4}
                />
              )}
              <circle
                cx={node.x}
                cy={node.y}
                r={radius}
                fill={color}
                stroke={isSelected ? '#fff' : color}
                strokeWidth={isSelected ? 2.5 : 1.5}
                opacity={0.9}
              />
              <text
                x={node.x}
                y={node.y + radius + 12}
                textAnchor="middle"
                fontSize="9"
                fill="#9ca3af"
                className="select-none pointer-events-none"
              >
                {displayLabel}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Edge tooltip (fixed positioning to work in both normal and fullscreen) */}
      {hoveredEdge && (
        <div
          className="fixed px-2 py-1 bg-card border border-border rounded text-xs text-foreground shadow-lg pointer-events-none z-[60]"
          style={{ left: hoveredEdge.x, top: hoveredEdge.y, transform: 'translateX(-50%)' }}
        >
          {hoveredEdge.label}
        </div>
      )}

      {/* Selected node info panel */}
      {selectedNode && (
        <div className="mt-3">
          <NodeInfoPanel
            node={selectedNode}
            onExpand={handleExpand}
            onCenter={handleCenter}
            isExpanding={isExpanding}
          />
        </div>
      )}
    </div>
  );

  // Fullscreen mode: render as fixed overlay
  if (isFullscreen) {
    return (
      <>
        {/* Inline placeholder so layout doesn't jump */}
        <div className="h-[400px] bg-background rounded-lg border border-border flex items-center justify-center">
          <p className="text-sm text-muted-foreground">Graph expanded to fullscreen</p>
        </div>
        {/* Fullscreen overlay */}
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-6">
          <div className="w-full h-full max-w-[1400px] bg-card border border-border rounded-lg p-6 shadow-xl overflow-hidden">
            {graphContent}
          </div>
        </div>
      </>
    );
  }

  return graphContent;
}
