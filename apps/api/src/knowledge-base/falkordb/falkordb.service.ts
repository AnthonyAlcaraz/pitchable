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

    // Create Entity nodes and EXTRACTED_FROM relationships
    for (const entity of entities) {
      // MERGE on name+type to deduplicate entities across documents
      await graph.query(
        `MERGE (e:Entity {name: $name, type: $type})
         ON CREATE SET e.id = $id, e.description = $desc, e.documentId = $docId, e.createdAt = timestamp()
         ON MATCH SET e.description = CASE WHEN size(e.description) < size($desc) THEN $desc ELSE e.description END
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
          },
        },
      );
    }

    // Create RELATED_TO relationships between entities
    for (const rel of relationships) {
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
           r.description AS description,
           b.id AS bId, b.name AS bName, b.type AS bType, b.description AS bDesc
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
