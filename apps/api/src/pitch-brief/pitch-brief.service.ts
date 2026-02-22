import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { FalkorDbService } from '../knowledge-base/falkordb/falkordb.service.js';
import { EntityExtractorService } from '../knowledge-base/falkordb/entity-extractor.service.js';
import { CreditsService } from '../credits/credits.service.js';
import { ENTITY_EXTRACTION_COST } from '../credits/tier-config.js';
import { CreditReason } from '../../generated/prisma/enums.js';
import { KnowledgeBaseService } from '../knowledge-base/knowledge-base.service.js';
import { TierEnforcementService } from '../credits/tier-enforcement.service.js';
import type { CreatePitchBriefDto } from './dto/create-pitch-brief.dto.js';
import type { UpdatePitchBriefDto } from './dto/update-pitch-brief.dto.js';
import { BriefStatus } from '../../generated/prisma/enums.js';

@Injectable()
export class PitchBriefService {
  private readonly logger = new Logger(PitchBriefService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly falkordb: FalkorDbService,
    private readonly kbService: KnowledgeBaseService,
    private readonly tierEnforcement: TierEnforcementService,
    private readonly entityExtractor: EntityExtractorService,
    private readonly credits: CreditsService,
  ) {}

  /**
   * Lazily provision a FalkorDB graph for a brief that doesn't have one yet.
   * Returns the graphName (existing or newly created), or null if FalkorDB is disabled.
   */
  private async ensureGraphName(briefId: string, currentGraphName: string | null): Promise<string | null> {
    if (currentGraphName) return currentGraphName;
    if (!this.falkordb.isEnabled()) return null;

    try {
      const graphName = FalkorDbService.briefGraphName(briefId);
      await this.falkordb.ensureGraph(graphName);
      await this.prisma.pitchBrief.update({
        where: { id: briefId },
        data: { graphName },
      });
      this.logger.log(`Lazy-provisioned FalkorDB graph ${graphName} for brief ${briefId}`);
      return graphName;
    } catch (error) {
      this.logger.warn(
        `Failed to lazy-provision FalkorDB graph for brief ${briefId}: ${error instanceof Error ? error.message : String(error)}`,
      );
      return null;
    }
  }

  // ─── CRUD ───────────────────────────────────────────────────────────────────

  async create(userId: string, dto: CreatePitchBriefDto) {
    const check = await this.tierEnforcement.canCreateBrief(userId);
    if (!check.allowed) {
      throw new BadRequestException(check.reason);
    }

    const brief = await this.prisma.pitchBrief.create({
      data: {
        userId,
        name: dto.name,
        description: dto.description,
        status: BriefStatus.EMPTY,
      },
    });

    // Create dedicated FalkorDB graph for this brief
    if (this.falkordb.isEnabled()) {
      try {
        const graphName = FalkorDbService.briefGraphName(brief.id);
        await this.falkordb.ensureGraph(graphName);
        await this.prisma.pitchBrief.update({
          where: { id: brief.id },
          data: { graphName },
        });
        brief.graphName = graphName;
        this.logger.log(`Created FalkorDB graph ${graphName} for brief ${brief.id}`);
      } catch (error) {
        this.logger.warn(
          `Failed to create FalkorDB graph for brief ${brief.id}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    return brief;
  }

  async findAll(userId: string) {
    const briefs = await this.prisma.pitchBrief.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      include: {
        _count: {
          select: {
            documents: true,
            briefLenses: true,
          },
        },
      },
    });

    return briefs.map((brief) => ({
      ...brief,
      documentCount: brief._count.documents,
      lensCount: brief._count.briefLenses,
    }));
  }

  async findOne(userId: string, briefId: string) {
    const brief = await this.prisma.pitchBrief.findUnique({
      where: { id: briefId },
      include: {
        documents: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            title: true,
            sourceType: true,
            mimeType: true,
            fileSize: true,
            status: true,
            chunkCount: true,
            createdAt: true,
          },
        },
        briefLenses: {
          include: {
            lens: {
              select: {
                id: true,
                name: true,
                audienceType: true,
                pitchGoal: true,
                isDefault: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: {
            documents: true,
            briefLenses: true,
            presentations: true,
          },
        },
      },
    });

    if (!brief) throw new NotFoundException('Pitch Brief not found');
    if (brief.userId !== userId) throw new ForbiddenException();

    return {
      ...brief,
      documentCount: brief._count.documents,
      lensCount: brief._count.briefLenses,
      presentationCount: brief._count.presentations,
    };
  }

  async update(userId: string, briefId: string, dto: UpdatePitchBriefDto) {
    const existing = await this.prisma.pitchBrief.findUnique({
      where: { id: briefId },
    });
    if (!existing) throw new NotFoundException('Pitch Brief not found');
    if (existing.userId !== userId) throw new ForbiddenException();

    return this.prisma.pitchBrief.update({
      where: { id: briefId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
      },
    });
  }

  async delete(userId: string, briefId: string) {
    const existing = await this.prisma.pitchBrief.findUnique({
      where: { id: briefId },
    });
    if (!existing) throw new NotFoundException('Pitch Brief not found');
    if (existing.userId !== userId) throw new ForbiddenException();

    // Delete FalkorDB graph if it exists
    if (existing.graphName && this.falkordb.isEnabled()) {
      try {
        await this.falkordb.deleteGraph(existing.graphName);
        this.logger.log(`Deleted FalkorDB graph ${existing.graphName} for brief ${briefId}`);
      } catch (error) {
        this.logger.warn(
          `Failed to delete FalkorDB graph for brief ${briefId}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    // Unlink documents from brief before deleting (don't delete the documents themselves)
    await this.prisma.document.updateMany({
      where: { briefId },
      data: { briefId: null },
    });

    await this.prisma.pitchBrief.delete({ where: { id: briefId } });
    return { deleted: true };
  }

  // ─── Document Management ──────────────────────────────────────────────────

  async addDocument(
    userId: string,
    briefId: string,
    documentId: string,
  ) {
    const brief = await this.ensureOwnership(userId, briefId);

    // Link document to brief
    await this.prisma.document.update({
      where: { id: documentId },
      data: { briefId },
    });

    // Update brief status and document count
    const docCount = await this.prisma.document.count({ where: { briefId } });
    await this.prisma.pitchBrief.update({
      where: { id: briefId },
      data: {
        documentCount: docCount,
        status: BriefStatus.PROCESSING,
      },
    });

    // NOTE: Do NOT queue document-processing here.
    // kbService.uploadFile() already queued the job with correct sourceType/s3Key/mimeType.
    // A duplicate job with missing fields would race and corrupt the document status.

    this.logger.log(`Document ${documentId} added to brief ${briefId}`);
    return { documentId, briefId };
  }

  async removeDocument(userId: string, briefId: string, docId: string) {
    const brief = await this.ensureOwnership(userId, briefId);

    const doc = await this.prisma.document.findFirst({
      where: { id: docId, briefId },
    });
    if (!doc) throw new NotFoundException('Document not found in this brief');

    // Delete from FalkorDB graph if applicable
    if (brief.graphName && this.falkordb.isEnabled()) {
      try {
        await this.falkordb.deleteDocument(brief.graphName, docId);
      } catch (error) {
        this.logger.warn(
          `FalkorDB document delete failed (non-blocking): ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    // Unlink document from brief
    await this.prisma.document.update({
      where: { id: docId },
      data: { briefId: null },
    });

    // Update counts
    const docCount = await this.prisma.document.count({ where: { briefId } });
    await this.prisma.pitchBrief.update({
      where: { id: briefId },
      data: {
        documentCount: docCount,
        status: docCount === 0 ? BriefStatus.EMPTY : brief.status,
      },
    });

    return { deleted: true };
  }

  // ─── Graph / Search ───────────────────────────────────────────────────────

  async getGraph(
    userId: string,
    briefId: string,
    opts?: { depth?: number; limit?: number },
  ) {
    const brief = await this.ensureOwnership(userId, briefId);
    const graphName = await this.ensureGraphName(briefId, brief.graphName);
    if (!graphName) {
      return { nodes: [], edges: [], totalNodes: 0, totalEdges: 0 };
    }
    return this.falkordb.getFullGraph(graphName, opts);
  }

  async getNodeNeighbors(
    userId: string,
    briefId: string,
    nodeId: string,
    opts?: { limit?: number },
  ) {
    const brief = await this.ensureOwnership(userId, briefId);
    const graphName = await this.ensureGraphName(briefId, brief.graphName);
    if (!graphName) {
      return { centerNode: null, neighbors: [], edges: [] };
    }
    return this.falkordb.getNodeNeighbors(graphName, nodeId, opts);
  }

  async getNodeDetails(
    userId: string,
    briefId: string,
    nodeId: string,
  ) {
    const brief = await this.ensureOwnership(userId, briefId);
    const graphName = await this.ensureGraphName(briefId, brief.graphName);
    if (!graphName) {
      return null;
    }
    return this.falkordb.getNodeDetails(graphName, nodeId);
  }

  async getGraphStats(userId: string, briefId: string) {
    const brief = await this.ensureOwnership(userId, briefId);
    const graphName = await this.ensureGraphName(briefId, brief.graphName);
    if (!graphName) {
      return { totalNodes: 0, totalEdges: 0, nodeTypes: {}, edgeTypes: {} };
    }
    return this.falkordb.getGraphStats(graphName);
  }

  async getEntities(
    userId: string,
    briefId: string,
    opts?: { type?: string; limit?: number },
  ) {
    const brief = await this.ensureOwnership(userId, briefId);
    const graphName = await this.ensureGraphName(briefId, brief.graphName);
    if (!graphName) {
      return [];
    }
    return this.falkordb.getEntities(graphName, opts);
  }

  async search(
    userId: string,
    briefId: string,
    query: string,
    limit = 10,
  ) {
    const brief = await this.ensureOwnership(userId, briefId);
    const graphName = await this.ensureGraphName(briefId, brief.graphName);
    if (!graphName) {
      return { entities: [], relationships: [] };
    }
    return this.falkordb.query(graphName, query);
  }

  /**
   * Backfill graph for a brief: ensure graphName exists, then re-extract entities
   * from all READY documents that haven't been indexed yet (entityCount === 0).
   */
  async backfillGraph(userId: string, briefId: string) {
    const brief = await this.ensureOwnership(userId, briefId);
    if (!this.falkordb.isEnabled()) {
      return { status: 'skipped', reason: 'FalkorDB is not enabled' };
    }

    const graphName = await this.ensureGraphName(briefId, brief.graphName);
    if (!graphName) {
      return { status: 'error', reason: 'Failed to provision graph' };
    }

    // Find all READY documents linked to this brief
    const docs = await this.prisma.document.findMany({
      where: { briefId, status: 'READY' },
      include: { chunks: { select: { id: true, content: true, heading: true, chunkIndex: true } } },
    });

    let totalEntities = 0;
    const processed: string[] = [];

    for (const doc of docs) {
      if (doc.chunks.length === 0) continue;

      const hasCredits = await this.credits.hasEnoughCredits(userId, ENTITY_EXTRACTION_COST);
      if (!hasCredits) {
        this.logger.warn(`Backfill: insufficient credits for doc ${doc.id}`);
        break;
      }

      try {
        const extraction = await this.entityExtractor.extractFromChunks(doc.chunks);
        if (extraction.entities.length > 0) {
          // Index into user's KB graph
          const kbGraphName = FalkorDbService.kbGraphName(userId);
          await this.falkordb.indexDocument(kbGraphName, doc.id, doc.title, extraction.entities, extraction.relationships);
          // Index into brief graph
          await this.falkordb.indexDocument(graphName, doc.id, doc.title, extraction.entities, extraction.relationships);
          totalEntities += extraction.entities.length;
          processed.push(doc.id);

          await this.credits.deductCredits(userId, ENTITY_EXTRACTION_COST, CreditReason.ENTITY_EXTRACTION, doc.id);
        }
      } catch (err) {
        this.logger.warn(`Backfill: entity extraction failed for doc ${doc.id}: ${err}`);
      }
    }

    // Update entity count
    if (totalEntities > 0) {
      await this.prisma.pitchBrief.update({
        where: { id: briefId },
        data: { entityCount: { increment: totalEntities } },
      });
    }

    return { status: 'ok', graphName, documentsProcessed: processed.length, totalEntities };
  }

  // ─── Lens Linking ─────────────────────────────────────────────────────────

  async linkLens(userId: string, briefId: string, lensId: string) {
    await this.ensureOwnership(userId, briefId);

    // Verify lens exists and belongs to user
    const lens = await this.prisma.pitchLens.findUnique({ where: { id: lensId } });
    if (!lens) throw new NotFoundException('Pitch Lens not found');
    if (lens.userId !== userId) throw new ForbiddenException();

    // Check if already linked
    const existing = await this.prisma.briefLens.findUnique({
      where: { briefId_lensId: { briefId, lensId } },
    });
    if (existing) throw new ConflictException('Lens already linked to this brief');

    const briefLens = await this.prisma.briefLens.create({
      data: { briefId, lensId },
      include: {
        lens: {
          select: {
            id: true,
            name: true,
            audienceType: true,
            pitchGoal: true,
          },
        },
      },
    });

    return briefLens;
  }

  async unlinkLens(userId: string, briefId: string, lensId: string) {
    await this.ensureOwnership(userId, briefId);

    const existing = await this.prisma.briefLens.findUnique({
      where: { briefId_lensId: { briefId, lensId } },
    });
    if (!existing) throw new NotFoundException('Lens not linked to this brief');

    await this.prisma.briefLens.delete({
      where: { briefId_lensId: { briefId, lensId } },
    });

    return { deleted: true };
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private async ensureOwnership(userId: string, briefId: string) {
    const brief = await this.prisma.pitchBrief.findUnique({
      where: { id: briefId },
    });
    if (!brief) throw new NotFoundException('Pitch Brief not found');
    if (brief.userId !== userId) throw new ForbiddenException();
    return brief;
  }
}
