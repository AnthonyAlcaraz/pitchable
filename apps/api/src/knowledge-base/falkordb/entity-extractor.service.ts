import { Injectable, Logger } from '@nestjs/common';
import { LlmService, LlmModel } from '../../chat/llm.service.js';
import type { ExtractionResult } from './falkordb.types.js';
import { ENTITY_TYPES } from './falkordb.types.js';

const EXTRACTION_SYSTEM_PROMPT = `You are an entity extraction engine. Given text, extract named entities and relationships between them.

Entity types: ${ENTITY_TYPES.join(', ')}

Rules:
- Extract only clearly stated entities, not implied ones
- Entity names should be the most common/canonical form used in the text
- Include aliases: common abbreviations, acronyms, or alternate names (e.g., name "Artificial Intelligence" with aliases ["AI"], or name "Google" with aliases ["Alphabet", "GOOG"])
- Relationships should describe how two entities relate
- Keep descriptions concise (1 sentence max)
- Return valid JSON only, no markdown fences

Return this exact JSON structure:
{
  "entities": [{"name": "...", "type": "CONCEPT", "description": "...", "aliases": ["..."]}],
  "relationships": [{"source": "EntityName1", "target": "EntityName2", "description": "how they relate"}]
}`;

@Injectable()
export class EntityExtractorService {
  private readonly logger = new Logger(EntityExtractorService.name);

  constructor(private readonly llm: LlmService) {}

  /**
   * Extract entities and relationships from text chunks.
   * Batches chunks (3-5 per call) to minimize API calls.
   */
  async extractFromChunks(
    chunks: Array<{ content: string }>,
  ): Promise<ExtractionResult> {
    const allEntities: ExtractionResult['entities'] = [];
    const allRelationships: ExtractionResult['relationships'] = [];
    const seenEntities = new Set<string>();

    // Batch chunks: 3-5 per API call
    const batchSize = 4;
    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      const combinedText = batch
        .map((c, idx) => `--- Chunk ${i + idx + 1} ---\n${c.content}`)
        .join('\n\n');

      try {
        const result = await this.extractFromText(combinedText);

        for (const entity of result.entities) {
          const key = `${entity.name}::${entity.type}`;
          if (!seenEntities.has(key)) {
            seenEntities.add(key);
            allEntities.push(entity);
          }
        }
        allRelationships.push(...result.relationships);
      } catch (error) {
        this.logger.warn(
          `Entity extraction failed for chunk batch ${i}-${i + batch.length}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    this.logger.log(
      `Extracted ${allEntities.length} entities, ${allRelationships.length} relationships from ${chunks.length} chunks`,
    );

    return { entities: allEntities, relationships: allRelationships };
  }

  private async extractFromText(text: string): Promise<ExtractionResult> {
    // Truncate very long text to stay within token limits
    const maxChars = 12000;
    const truncated = text.length > maxChars ? text.slice(0, maxChars) + '\n...[truncated]' : text;

    const raw = await this.llm.complete(
      [
        { role: 'system', content: EXTRACTION_SYSTEM_PROMPT },
        { role: 'user', content: truncated },
      ],
      LlmModel.SONNET,
    );

    return this.parseExtractionResult(raw);
  }

  private parseExtractionResult(raw: string): ExtractionResult {
    // Strip markdown code fences if present
    let cleaned = raw.trim();
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }

    const parsed = JSON.parse(cleaned);

    const entities = (parsed.entities ?? [])
      .filter(
        (e: Record<string, unknown>) =>
          typeof e.name === 'string' && typeof e.type === 'string',
      )
      .map((e: Record<string, unknown>) => ({
        name: String(e.name).trim(),
        type: ENTITY_TYPES.includes(e.type as (typeof ENTITY_TYPES)[number])
          ? String(e.type)
          : 'CONCEPT',
        description: String(e.description ?? '').trim(),
        aliases: Array.isArray(e.aliases)
          ? (e.aliases as unknown[]).filter((a): a is string => typeof a === 'string').map((a) => a.trim())
          : undefined,
      }));

    const relationships = (parsed.relationships ?? [])
      .filter(
        (r: Record<string, unknown>) =>
          typeof r.source === 'string' && typeof r.target === 'string',
      )
      .map((r: Record<string, unknown>) => ({
        source: String(r.source).trim(),
        target: String(r.target).trim(),
        description: String(r.description ?? '').trim(),
      }));

    return { entities, relationships };
  }
}
