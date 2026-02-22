import { Injectable, Logger } from '@nestjs/common';
import { FalkorDbService } from './falkordb.service.js';

@Injectable()
export class CrossDocLinkerService {
  private readonly logger = new Logger(CrossDocLinkerService.name);

  constructor(private readonly falkordb: FalkorDbService) {}

  /**
   * Find entity pairs that co-occur in the same document(s) but lack
   * a direct RELATED_TO edge, and create CO_OCCURS edges between them.
   * Weight is proportional to the number of shared documents.
   * Zero LLM cost — pure Cypher.
   */
  async linkAcrossDocuments(graphName: string): Promise<{ edgesCreated: number }> {
    if (!this.falkordb.isEnabled()) {
      return { edgesCreated: 0 };
    }

    try {
      const result = await this.falkordb.runCypher(
        graphName,
        `MATCH (a:Entity)-[:EXTRACTED_FROM]->(d:Document)<-[:EXTRACTED_FROM]-(b:Entity)
         WHERE a.id < b.id
           AND NOT (a)-[:RELATED_TO]-(b)
           AND NOT (a)-[:CO_OCCURS]-(b)
         WITH a, b, count(DISTINCT d) AS sharedDocs
         WHERE sharedDocs >= 1
         CREATE (a)-[r:CO_OCCURS]->(b)
         SET r.weight = toFloat(sharedDocs) * 0.5,
             r.description = 'Co-occurs in ' + toString(sharedDocs) + ' document(s)',
             r.createdAt = timestamp()
         RETURN count(r) AS created`,
      );

      const row = (result.data ?? [])[0] as Record<string, unknown> | undefined;
      const edgesCreated = Number(row?.['created'] ?? 0);

      if (edgesCreated > 0) {
        this.logger.log(
          `Cross-doc linking for "${graphName}": created ${edgesCreated} CO_OCCURS edges`,
        );
      }

      return { edgesCreated };
    } catch (error) {
      this.logger.warn(
        `Cross-doc linking failed for "${graphName}": ${error instanceof Error ? error.message : String(error)}`,
      );
      return { edgesCreated: 0 };
    }
  }
}
