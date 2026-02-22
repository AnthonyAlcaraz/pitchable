import { useEffect, useRef, useCallback } from 'react';
import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
  forceCollide,
  type Simulation,
} from 'd3-force';
import type { PositionedNode, SimEdge } from './graph-types';

interface UseForceSimulationOpts {
  width: number;
  height: number;
  onTick: (nodes: PositionedNode[], edges: SimEdge[]) => void;
}

export function useForceSimulation(
  nodes: PositionedNode[],
  edges: SimEdge[],
  opts: UseForceSimulationOpts,
) {
  const simRef = useRef<Simulation<PositionedNode, SimEdge> | null>(null);
  const nodesRef = useRef<PositionedNode[]>(nodes);
  const edgesRef = useRef<SimEdge[]>(edges);

  // Update refs when inputs change
  nodesRef.current = nodes;
  edgesRef.current = edges;

  const { width, height, onTick } = opts;

  // Initialize or update simulation
  useEffect(() => {
    if (nodes.length === 0) {
      if (simRef.current) {
        simRef.current.stop();
        simRef.current = null;
      }
      return;
    }

    if (simRef.current) {
      // Update existing simulation with new nodes/edges
      simRef.current.nodes(nodes);
      simRef.current
        .force(
          'link',
          forceLink<PositionedNode, SimEdge>(edges)
            .id((d) => d.id)
            .distance(80),
        );
      simRef.current.alpha(0.3).restart();
    } else {
      // Create new simulation
      const sim = forceSimulation<PositionedNode, SimEdge>(nodes)
        .force(
          'link',
          forceLink<PositionedNode, SimEdge>(edges)
            .id((d) => d.id)
            .distance(80),
        )
        .force('charge', forceManyBody().strength(-200))
        .force('center', forceCenter(width / 2, height / 2))
        .force('collide', forceCollide<PositionedNode>().radius((d) => (d.connectionCount ?? 1) * 1.5 + 10))
        .on('tick', () => {
          onTick([...nodesRef.current], [...edgesRef.current]);
        });

      simRef.current = sim;
    }

    return () => {
      // Don't stop on re-render, only on unmount
    };
  }, [nodes, edges, width, height, onTick]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (simRef.current) {
        simRef.current.stop();
        simRef.current = null;
      }
    };
  }, []);

  const reheat = useCallback((alpha = 0.3) => {
    if (simRef.current) {
      simRef.current.alpha(alpha).restart();
    }
  }, []);

  const pinNode = useCallback((nodeId: string, x: number, y: number) => {
    const node = nodesRef.current.find((n) => n.id === nodeId);
    if (node) {
      node.fx = x;
      node.fy = y;
    }
  }, []);

  const unpinNode = useCallback((nodeId: string) => {
    const node = nodesRef.current.find((n) => n.id === nodeId);
    if (node) {
      node.fx = null;
      node.fy = null;
    }
  }, []);

  return { reheat, pinNode, unpinNode };
}
