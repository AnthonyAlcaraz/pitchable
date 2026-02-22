import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FalkorDB } from 'falkordb';
import type { Graph } from 'falkordb';
import type {
  GraphData,
  GraphNode,
  GraphEdge,
  GraphStats,
  GraphEntity,
  GraphQueryResult,
  ExtractedEntity,
  ExtractedRelationship,
  NeighborResult,
  NodeDetails,
} from './falkordb.types.js';

@Injectable()
export class FalkorDbService implements OnModuleDestroy {
  private readonly logger = new Logger(FalkorDbService.name);
  private readonly enabled: boolean;
  private db: FalkorDB | null = null;
  private readonly host: string;
  private readonly port: number;

  private readonly username: string | undefined;
  private readonly password: string | undefined;

  constructor(private readonly config: ConfigService) {
    this.enabled = config.get('FALKORDB_ENABLED', 'false') === 'true';
    const url = config.get('FALKORDB_URL', 'redis://localhost:6380');
    const parsed = new URL(url);
    this.host = parsed.hostname;
    this.port = parseInt(parsed.port || '6380', 10);
    this.username = parsed.username || undefined;
    this.password = parsed.password || undefined;
    if (this.enabled) {
      this.logger.log(`FalkorDB enabled at ${this.host}:${this.port} (auth: ${this.password ? 'yes' : 'no'})`);
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  async onModuleDestroy(): Promise<void> {
    if (this.db) {
      try {
        this.db.close();
      } catch {
        // ignore close errors
      }
    }
  }

  private async getDb(): Promise<FalkorDB> {
    if (!this.db) {
      this.db = await FalkorDB.connect({
        socket: { host: this.host, port: this.port },
        ...(this.username ? { username: this.username } : {}),
        ...(this.password ? { password: this.password } : {}),
      });
    }
    return this.db;
  }

  private async getGraph(graphName: string): Promise<Graph> {
    const db = await this.getDb();
    return db.selectGraph(graphName);
  }

  async healthCheck(): Promise<boolean> {
    try {
      const db = await this.getDb();
      const graphs = await db.list();
      return Array.isArray(graphs);
    } catch {
      return false;
    }
  }

  async ensureGraph(graphName: string): Promise<void> {
    const graph = await this.getGraph(graphName);
    // Create a dummy node and delete it to ensure the graph exists
    // FalkorDB creates graphs on first write
    await graph.query(
      `MERGE (n:_Init {_init: true}) ON CREATE SET n._createdAt = timestamp() DELETE n`,
    );
    this.logger.log(`Graph "${graphName}" ensured`);
  }

  async deleteGraph(graphName: string): Promise<void> {
    try {
      const db = await this.getDb();
      const graph = db.selectGraph(graphName);
      await graph.delete();
      this.logger.log(`Graph "${graphName}" deleted`);
    } catch (error) {
      this.logger.warn(`Failed to delete graph "${graphName}": ${error}`);
    }
  }

  async indexDocument(
    graphName: string,
    documentId: string,
    title: string,
    entities: ExtractedEntity[],
    relationships: ExtractedRelationship[],
  ): Promise<void> {
    const graph = await this.getGraph(graphName);

    // Create Document node
    await graph.query(
      `CREATE (:Document {id: $id, title: $title, createdAt: timestamp()})`,
      { params: { id: documentId, title } },
    );

    // Build alias-to-canonical map for entity disambiguation
    const aliasMap = new Map<string, string>();
    for (const entity of entities) {
      if (entity.aliases) {
        for (const alias of entity.aliases) {
          aliasMap.set(alias.toLowerCase(), entity.name);
        }
      }
    }

    // Create Entity nodes and EXTRACTED_FROM relationships
    for (const entity of entities) {
      const aliases = entity.aliases ?? [];
      // Check if this entity name matches an existing entity's alias
      // First try exact name MERGE, then store aliases for future matching
      await graph.query(
        `MERGE (e:Entity {name: $name, type: $type})
         ON CREATE SET e.id = $id, e.description = $desc, e.documentId = $docId,
                       e.aliases = $aliases, e.createdAt = timestamp()
         ON MATCH SET e.description = CASE WHEN size(e.description) < size($desc) THEN $desc ELSE e.description END,
                      e.aliases = CASE WHEN e.aliases IS NULL THEN $aliases
                                       ELSE e.aliases + [x IN $aliases WHERE NOT x IN e.aliases] END
         WITH e
         MATCH (d:Document {id: $docId})
         MERGE (e)-[:EXTRACTED_FROM]->(d)`,
        {
          params: {
            id: `${documentId}-${entity.name}`,
            name: entity.name,
            type: entity.type,
            desc: entity.description,
            docId: documentId,
            aliases: aliases,
          },
        },
      );
    }

    // Resolve relationship endpoints: if source/target matches an alias, use canonical name
    const resolvedRelationships = relationships.map((rel) => ({
      ...rel,
      source: aliasMap.get(rel.source.toLowerCase()) ?? rel.source,
      target: aliasMap.get(rel.target.toLowerCase()) ?? rel.target,
    }));

    // Create RELATED_TO relationships between entities
    for (const rel of resolvedRelationships) {
      await graph.query(
        `MATCH (a:Entity {name: $source}), (b:Entity {name: $target})
         MERGE (a)-[r:RELATED_TO]->(b)
         ON CREATE SET r.description = $desc, r.weight = 1.0, r.documentId = $docId
         ON MATCH SET r.weight = r.weight + 0.5`,
        {
          params: {
            source: rel.source,
            target: rel.target,
            desc: rel.description,
            docId: documentId,
          },
        },
      );
    }

    this.logger.log(
      `Indexed document ${documentId} into graph "${graphName}": ${entities.length} entities, ${relationships.length} relationships`,
    );
  }

  async deleteDocument(graphName: string, documentId: string): Promise<void> {
    const graph = await this.getGraph(graphName);

    // Delete relationships involving entities from this document
    await graph.query(
      `MATCH (e:Entity {documentId: $docId})-[r]-() DELETE r`,
      { params: { docId: documentId } },
    );

    // Delete entities that only belong to this document
    await graph.query(
      `MATCH (e:Entity {documentId: $docId}) DELETE e`,
      { params: { docId: documentId } },
    );

    // Delete the document node and its relationships
    await graph.query(
      `MATCH (d:Document {id: $docId}) DETACH DELETE d`,
      { params: { docId: documentId } },
    );

    this.logger.log(`Deleted document ${documentId} from graph "${graphName}"`);
  }

  async query(graphName: string, queryText: string): Promise<GraphQueryResult> {
    const graph = await this.getGraph(graphName);

    // Find entities whose names appear in the query text (case-insensitive)
    const entityResult = await graph.query(
      `MATCH (e:Entity)
       WHERE toLower(e.name) CONTAINS toLower($query)
       RETURN e.id AS id, e.name AS name, e.type AS type, e.description AS description, e.documentId AS documentId
       LIMIT 20`,
      { params: { query: queryText } },
    );

    const entities: GraphEntity[] = (entityResult.data ?? []).map(
      (row: Record<string, unknown>) => ({
        id: String(row['id'] ?? ''),
        name: String(row['name'] ?? ''),
        type: String(row['type'] ?? ''),
        description: String(row['description'] ?? ''),
        documentId: row['documentId'] ? String(row['documentId']) : undefined,
      }),
    );

    // For each found entity, traverse 1-2 hops for connected entities
    const relatedEntities: GraphEntity[] = [];
    const relationships: Array<{
      source: string;
      target: string;
      description: string;
    }> = [];

    if (entities.length > 0) {
      const entityNames = entities.map((e) => e.name);
      const relResult = await graph.query(
        `MATCH (a:Entity)-[r:RELATED_TO]-(b:Entity)
         WHERE a.name IN $names
         RETURN DISTINCT
           a.name AS source, b.name AS target,
           r.description AS description, r.weight AS weight,
           b.id AS bId, b.name AS bName, b.type AS bType, b.description AS bDesc
         ORDER BY r.weight DESC
         LIMIT 50`,
        { params: { names: entityNames } },
      );

      const seen = new Set(entityNames);
      for (const row of relResult.data ?? []) {
        const r = row as Record<string, unknown>;
        relationships.push({
          source: String(r['source'] ?? ''),
          target: String(r['target'] ?? ''),
          description: String(r['description'] ?? ''),
        });
        const bName = String(r['bName'] ?? '');
        if (!seen.has(bName)) {
          seen.add(bName);
          relatedEntities.push({
            id: String(r['bId'] ?? ''),
            name: bName,
            type: String(r['bType'] ?? ''),
            description: String(r['bDesc'] ?? ''),
          });
        }
      }
    }

    return {
      entities: [...entities, ...relatedEntities],
      relationships,
    };
  }

  async getFullGraph(
    graphName: string,
    opts?: { depth?: number; limit?: number },
  ): Promise<GraphData> {
    const graph = await this.getGraph(graphName);
    const limit = opts?.limit ?? 100;

    const nodeResult = await graph.query(
      `MATCH (n) WHERE n:Entity OR n:Document
       RETURN n.id AS id, n.name AS name,
              COALESCE(n.type, labels(n)[0]) AS type,
              COALESCE(n.description, n.title, '') AS description,
              n.documentId AS documentId
       LIMIT $limit`,
      { params: { limit } },
    );

    const nodes: GraphNode[] = (nodeResult.data ?? []).map(
      (row: Record<string, unknown>) => ({
        id: String(row['id'] ?? ''),
        name: String(row['name'] ?? row['id'] ?? ''),
        type: String(row['type'] ?? 'UNKNOWN'),
        description: String(row['description'] ?? ''),
        documentId: row['documentId']
          ? String(row['documentId'])
          : undefined,
        properties: {},
      }),
    );

    // Populate connectionCount via degree query
    try {
      const degreeResult = await graph.query(
        `MATCH (n)-[r]-() WHERE n:Entity OR n:Document RETURN n.id AS id, count(r) AS degree`,
      );
      const degreeMap = new Map<string, number>();
      for (const row of degreeResult.data ?? []) {
        const r = row as Record<string, unknown>;
        degreeMap.set(String(r['id'] ?? ''), Number(r['degree'] ?? 0));
      }
      for (const node of nodes) {
        node.connectionCount = degreeMap.get(node.id) ?? 0;
      }
    } catch {
      // Non-critical - leave connectionCount undefined
    }

    const edgeResult = await graph.query(
      `MATCH (a)-[r]->(b)
       WHERE (a:Entity OR a:Document) AND (b:Entity OR b:Document)
       RETURN a.id AS source, b.id AS target, type(r) AS type,
              COALESCE(r.description, '') AS description,
              COALESCE(r.weight, 1.0) AS weight,
              r.documentId AS documentId
       LIMIT $limit`,
      { params: { limit: limit * 2 } },
    );

    const edges: GraphEdge[] = (edgeResult.data ?? []).map(
      (row: Record<string, unknown>) => ({
        source: String(row['source'] ?? ''),
        target: String(row['target'] ?? ''),
        type: String(row['type'] ?? ''),
        description: String(row['description'] ?? ''),
        weight: Number(row['weight'] ?? 1),
        documentId: row['documentId']
          ? String(row['documentId'])
          : undefined,
      }),
    );

    return {
      nodes,
      edges,
      totalNodes: nodes.length,
      totalEdges: edges.length,
    };
  }

  async getNodeNeighbors(
    graphName: string,
    nodeId: string,
    opts?: { limit?: number },
  ): Promise<NeighborResult> {
    const graph = await this.getGraph(graphName);
    const limit = opts?.limit ?? 20;

    // Fetch center node
    const centerResult = await graph.query(
      `MATCH (n) WHERE (n:Entity OR n:Document) AND n.id = $nodeId
       RETURN n.id AS id, n.name AS name,
              COALESCE(n.type, labels(n)[0]) AS type,
              COALESCE(n.description, n.title, '') AS description,
              n.documentId AS documentId
       LIMIT 1`,
      { params: { nodeId } },
    );

    const centerRow = (centerResult.data ?? [])[0] as Record<string, unknown> | undefined;
    const centerNode: GraphNode | null = centerRow
      ? {
          id: String(centerRow['id'] ?? ''),
          name: String(centerRow['name'] ?? ''),
          type: String(centerRow['type'] ?? 'UNKNOWN'),
          description: String(centerRow['description'] ?? ''),
          documentId: centerRow['documentId'] ? String(centerRow['documentId']) : undefined,
          properties: {},
        }
      : null;

    if (!centerNode) {
      return { centerNode: null, neighbors: [], edges: [] };
    }

    // Fetch neighbors (bidirectional)
    const neighborResult = await graph.query(
      `MATCH (center)-[r]-(neighbor)
       WHERE (center:Entity OR center:Document) AND center.id = $nodeId
         AND (neighbor:Entity OR neighbor:Document)
       RETURN DISTINCT neighbor.id AS id, neighbor.name AS name,
              COALESCE(neighbor.type, labels(neighbor)[0]) AS type,
              COALESCE(neighbor.description, neighbor.title, '') AS description,
              neighbor.documentId AS documentId,
              type(r) AS relType,
              COALESCE(r.description, '') AS relDesc,
              COALESCE(r.weight, 1.0) AS weight,
              startNode(r) = center AS isOutgoing
       LIMIT $limit`,
      { params: { nodeId, limit } },
    );

    const seen = new Set<string>();
    const neighbors: GraphNode[] = [];
    const edges: GraphEdge[] = [];

    for (const row of neighborResult.data ?? []) {
      const r = row as Record<string, unknown>;
      const nId = String(r['id'] ?? '');
      if (!nId || nId === nodeId) continue;

      if (!seen.has(nId)) {
        seen.add(nId);
        neighbors.push({
          id: nId,
          name: String(r['name'] ?? ''),
          type: String(r['type'] ?? 'UNKNOWN'),
          description: String(r['description'] ?? ''),
          documentId: r['documentId'] ? String(r['documentId']) : undefined,
          properties: {},
        });
      }

      const isOutgoing = r['isOutgoing'] === true;
      edges.push({
        source: isOutgoing ? nodeId : nId,
        target: isOutgoing ? nId : nodeId,
        type: String(r['relType'] ?? ''),
        description: String(r['relDesc'] ?? ''),
        weight: Number(r['weight'] ?? 1),
      });
    }

    // Populate connectionCount for neighbors
    if (neighbors.length > 0) {
      try {
        const nIds = neighbors.map((n) => n.id);
        const degreeResult = await graph.query(
          `MATCH (n)-[r]-() WHERE n.id IN $ids RETURN n.id AS id, count(r) AS degree`,
          { params: { ids: nIds } },
        );
        const degreeMap = new Map<string, number>();
        for (const row of degreeResult.data ?? []) {
          const dr = row as Record<string, unknown>;
          degreeMap.set(String(dr['id'] ?? ''), Number(dr['degree'] ?? 0));
        }
        for (const n of neighbors) {
          n.connectionCount = degreeMap.get(n.id) ?? 0;
        }
      } catch {
        // Non-critical
      }
    }

    return { centerNode, neighbors, edges };
  }

  async getNodeDetails(graphName: string, nodeId: string): Promise<NodeDetails | null> {
    const graph = await this.getGraph(graphName);

    // Fetch the node
    const nodeResult = await graph.query(
      `MATCH (n:Entity) WHERE n.id = $nodeId
       RETURN n.id AS id, n.name AS name, n.type AS type, n.description AS description`,
      { params: { nodeId } },
    );
    const nodeRow = (nodeResult.data ?? [])[0] as Record<string, unknown> | undefined;
    if (!nodeRow) return null;

    // Fetch relationships with other entities
    const relResult = await graph.query(
      `MATCH (n:Entity {id: $nodeId})-[r]-(other:Entity)
       RETURN other.id AS targetId, other.name AS targetName, other.type AS targetType,
              type(r) AS edgeType, COALESCE(r.description, '') AS edgeDescription,
              COALESCE(r.weight, 1.0) AS weight,
              startNode(r) = n AS isOutgoing
       ORDER BY r.weight DESC
       LIMIT 50`,
      { params: { nodeId } },
    );

    const relationships = (relResult.data ?? []).map((row: Record<string, unknown>) => ({
      targetId: String(row['targetId'] ?? ''),
      targetName: String(row['targetName'] ?? ''),
      targetType: String(row['targetType'] ?? ''),
      edgeType: String(row['edgeType'] ?? ''),
      edgeDescription: String(row['edgeDescription'] ?? ''),
      direction: (row['isOutgoing'] === true ? 'outgoing' : 'incoming') as 'outgoing' | 'incoming',
      weight: Number(row['weight'] ?? 1),
    }));

    // Fetch source documents via EXTRACTED_FROM edges
    const docResult = await graph.query(
      `MATCH (n:Entity {id: $nodeId})-[:EXTRACTED_FROM]->(d:Document)
       RETURN d.id AS documentId, d.title AS documentTitle`,
      { params: { nodeId } },
    );

    const sourceDocuments = (docResult.data ?? []).map((row: Record<string, unknown>) => ({
      documentId: String(row['documentId'] ?? ''),
      documentTitle: String(row['documentTitle'] ?? ''),
    }));

    // Get connection count
    const degreeResult = await graph.query(
      `MATCH (n:Entity {id: $nodeId})-[r]-() RETURN count(r) AS degree`,
      { params: { nodeId } },
    );
    const degreeRow = (degreeResult.data ?? [])[0] as Record<string, unknown> | undefined;
    const connectionCount = Number(degreeRow?.['degree'] ?? 0);

    return {
      id: String(nodeRow['id'] ?? ''),
      name: String(nodeRow['name'] ?? ''),
      type: String(nodeRow['type'] ?? ''),
      description: String(nodeRow['description'] ?? ''),
      connectionCount,
      relationships,
      sourceDocuments,
    };
  }

  async getGraphStats(graphName: string): Promise<GraphStats> {
    const graph = await this.getGraph(graphName);

    const nodeCountResult = await graph.query(
      `MATCH (n:Entity) RETURN n.type AS type, count(n) AS cnt`,
    );
    const nodeTypes: Record<string, number> = {};
    let totalNodes = 0;
    for (const row of nodeCountResult.data ?? []) {
      const r = row as Record<string, unknown>;
      const t = String(r['type'] ?? 'UNKNOWN');
      const c = Number(r['cnt'] ?? 0);
      nodeTypes[t] = c;
      totalNodes += c;
    }

    const edgeCountResult = await graph.query(
      `MATCH ()-[r]->() RETURN type(r) AS type, count(r) AS cnt`,
    );
    const edgeTypes: Record<string, number> = {};
    let totalEdges = 0;
    for (const row of edgeCountResult.data ?? []) {
      const r = row as Record<string, unknown>;
      const t = String(r['type'] ?? 'UNKNOWN');
      const c = Number(r['cnt'] ?? 0);
      edgeTypes[t] = c;
      totalEdges += c;
    }

    return { totalNodes, totalEdges, nodeTypes, edgeTypes };
  }

  async getEntities(
    graphName: string,
    opts?: { type?: string; limit?: number },
  ): Promise<GraphEntity[]> {
    const graph = await this.getGraph(graphName);
    const limit = opts?.limit ?? 50;

    let cypher: string;
    let params: Record<string, string | number | boolean | null>;

    if (opts?.type) {
      cypher = `MATCH (e:Entity {type: $type})
                RETURN e.id AS id, e.name AS name, e.type AS type, e.description AS description, e.documentId AS documentId
                LIMIT $limit`;
      params = { type: opts.type, limit };
    } else {
      cypher = `MATCH (e:Entity)
                RETURN e.id AS id, e.name AS name, e.type AS type, e.description AS description, e.documentId AS documentId
                LIMIT $limit`;
      params = { limit };
    }

    const result = await graph.query(cypher, { params });
    return (result.data ?? []).map((row: Record<string, unknown>) => ({
      id: String(row['id'] ?? ''),
      name: String(row['name'] ?? ''),
      type: String(row['type'] ?? ''),
      description: String(row['description'] ?? ''),
      documentId: row['documentId'] ? String(row['documentId']) : undefined,
    }));
  }

  /** Graph naming convention */
  static kbGraphName(userId: string): string {
    return `kb-${userId}`;
  }

  static briefGraphName(briefId: string): string {
    return `brief-${briefId}`;
  }
}
