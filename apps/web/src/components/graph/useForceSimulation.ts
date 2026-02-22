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
  onTick: () => void;
}

/**
 * Manages a d3-force simulation. Mutates `nodes` in place (d3 convention).
 * Calls `onTick` on every frame so the caller can trigger a re-render.
 */
export function useForceSimulation(
  nodesRef: React.MutableRefObject<PositionedNode[]>,
  edgesRef: React.MutableRefObject<SimEdge[]>,
  opts: UseForceSimulationOpts,
) {
  const simRef = useRef<Simulation<PositionedNode, SimEdge> | null>(null);
  const optsRef = useRef(opts);
  optsRef.current = opts;

  // Rebuild simulation when node/edge count changes
  const nodeCount = nodesRef.current.length;
  const edgeCount = edgesRef.current.length;

  useEffect(() => {
    if (simRef.current) {
      simRef.current.stop();
      simRef.current = null;
    }

    const nodes = nodesRef.current;
    const edges = edgesRef.current;
    if (nodes.length === 0) return;

    const { width, height } = optsRef.current;

    const sim = forceSimulation<PositionedNode, SimEdge>(nodes)
      .force(
        'link',
        forceLink<PositionedNode, SimEdge>(edges)
          .id((d) => d.id)
          .distance(80),
      )
      .force('charge', forceManyBody().strength(-200))
      .force('center', forceCenter(width / 2, height / 2))
      .force(
        'collide',
        forceCollide<PositionedNode>().radius(
          (d) => (d.connectionCount ?? 1) * 1.5 + 10,
        ),
      )
      .on('tick', () => {
        optsRef.current.onTick();
      });

    simRef.current = sim;

    return () => {
      sim.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodeCount, edgeCount]);

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
      // Re-bind nodes and edges in case arrays were rebuilt
      simRef.current.nodes(nodesRef.current);
      simRef.current.force(
        'link',
        forceLink<PositionedNode, SimEdge>(edgesRef.current)
          .id((d) => d.id)
          .distance(80),
      );
      simRef.current.alpha(alpha).restart();
    }
  }, [nodesRef, edgesRef]);

  const pinNode = useCallback((nodeId: string, x: number, y: number) => {
    const node = nodesRef.current.find((n) => n.id === nodeId);
    if (node) {
      node.fx = x;
      node.fy = y;
    }
  }, [nodesRef]);

  const unpinNode = useCallback((nodeId: string) => {
    const node = nodesRef.current.find((n) => n.id === nodeId);
    if (node) {
      node.fx = null;
      node.fy = null;
    }
  }, [nodesRef]);

  return { reheat, pinNode, unpinNode };
}
