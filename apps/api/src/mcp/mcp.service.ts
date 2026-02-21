import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';
import { PresentationsService } from '../presentations/presentations.service.js';
import { CreditsService } from '../credits/credits.service.js';
import { SyncGenerationService } from '../api-v1/sync-generation.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class McpService implements OnModuleDestroy {
  private readonly logger = new Logger(McpService.name);
  private transports = new Map<string, StreamableHTTPServerTransport>();

  constructor(
    private readonly presentationsService: PresentationsService,
    private readonly creditsService: CreditsService,
    private readonly syncGeneration: SyncGenerationService,
    private readonly prisma: PrismaService,
  ) {}

  async onModuleDestroy() {
    for (const [id, transport] of this.transports) {
      await transport.close().catch(() => {});
      this.transports.delete(id);
    }
  }

  /**
   * Create a new MCP server instance with all tools registered,
   * bound to a specific user context.
   */
  createServer(userId: string): McpServer {
    const server = new McpServer({
      name: 'pitchable',
      version: '1.0.0',
    });

    this.registerTools(server, userId);
    this.registerResources(server, userId);

    return server;
  }

  /**
   * Get or create a transport for a session.
   */
  async getOrCreateTransport(sessionId: string): Promise<StreamableHTTPServerTransport | undefined> {
    return this.transports.get(sessionId);
  }

  /**
   * Create a new stateful transport and connect it to a server.
   */
  async createTransport(userId: string): Promise<StreamableHTTPServerTransport> {
    const server = this.createServer(userId);

    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => {
        const id = crypto.randomUUID();
        this.transports.set(id, transport);
        return id;
      },
      onsessioninitialized: (sessionId: string) => {
        this.transports.set(sessionId, transport);
      },
    });

    transport.onclose = () => {
      if (transport.sessionId) {
        this.transports.delete(transport.sessionId);
      }
    };

    await server.connect(transport);
    return transport;
  }

  private registerTools(server: McpServer, userId: string) {
    // ── generate_presentation ──────────────────────────
    server.registerTool(
      'generate_presentation',
      {
        title: 'Generate Presentation',
        description: 'Generate a complete narrative slide deck from a topic. Uses RAG context from your Pitch Briefs and applies your Pitch Lens storytelling framework. Costs 2 credits.',
        inputSchema: z.object({
          topic: z.string().describe('The topic or prompt for the presentation'),
          presentationType: z.enum(['STANDARD', 'VC_PITCH', 'TECHNICAL', 'EXECUTIVE']).optional().describe('Type of presentation'),
          briefId: z.string().uuid().optional().describe('Pitch Brief ID for knowledge context'),
          pitchLensId: z.string().uuid().optional().describe('Pitch Lens ID for storytelling framework'),
          themeId: z.string().uuid().optional().describe('Theme ID for visual styling'),
        }),
      },
      async (args) => {
        try {
          const result = await this.syncGeneration.generate(userId, {
            topic: args.topic,
            presentationType: args.presentationType,
            briefId: args.briefId,
            pitchLensId: args.pitchLensId,
            themeId: args.themeId,
          });

          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Generation failed';
          return {
            content: [{ type: 'text' as const, text: `Error: ${msg}` }],
            isError: true,
          };
        }
      },
    );

    // ── list_presentations ─────────────────────────────
    server.registerTool(
      'list_presentations',
      {
        title: 'List Presentations',
        description: 'List your presentations with metadata. Returns title, status, type, slide count, and associated Brief/Lens names.',
        inputSchema: z.object({
          status: z.enum(['DRAFT', 'PROCESSING', 'COMPLETED', 'FAILED']).optional().describe('Filter by status'),
        }),
      },
      async (args) => {
        try {
          let presentations = await this.presentationsService.findAll(userId);
          if (args.status) {
            presentations = presentations.filter((p: any) => p.status === args.status);
          }
          return {
            content: [{ type: 'text' as const, text: JSON.stringify(presentations, null, 2) }],
          };
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Failed to list presentations';
          return { content: [{ type: 'text' as const, text: `Error: ${msg}` }], isError: true };
        }
      },
    );

    // ── get_presentation ───────────────────────────────
    server.registerTool(
      'get_presentation',
      {
        title: 'Get Presentation',
        description: 'Get a specific presentation with all its slides, speaker notes, and metadata.',
        inputSchema: z.object({
          presentationId: z.string().uuid().describe('The presentation ID'),
        }),
      },
      async (args) => {
        try {
          const result = await this.presentationsService.findOne(args.presentationId, userId);
          return {
            content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
          };
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Presentation not found';
          return { content: [{ type: 'text' as const, text: `Error: ${msg}` }], isError: true };
        }
      },
    );

    // ── fork_presentation ──────────────────────────────
    server.registerTool(
      'fork_presentation',
      {
        title: 'Fork Presentation',
        description: 'Fork an existing presentation with optional Brief/Lens swap. Creates a DRAFT copy you can then rewrite with new context.',
        inputSchema: z.object({
          presentationId: z.string().uuid().describe('Source presentation ID to fork'),
          briefId: z.string().uuid().optional().describe('Override the Brief for new context'),
          pitchLensId: z.string().uuid().optional().describe('Override the Lens for new storytelling'),
          title: z.string().optional().describe('Custom title for the fork'),
        }),
      },
      async (args) => {
        try {
          const result = await this.presentationsService.fork(args.presentationId, userId, {
            briefId: args.briefId,
            pitchLensId: args.pitchLensId,
            title: args.title,
          });
          return {
            content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
          };
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Fork failed';
          return { content: [{ type: 'text' as const, text: `Error: ${msg}` }], isError: true };
        }
      },
    );

    // ── export_presentation ────────────────────────────
    server.registerTool(
      'export_presentation',
      {
        title: 'Export Presentation',
        description: 'Queue a presentation for export to PPTX, PDF, or Reveal.js HTML. Returns a job ID to poll for the download URL.',
        inputSchema: z.object({
          presentationId: z.string().uuid().describe('The presentation to export'),
          format: z.enum(['PPTX', 'PDF', 'REVEAL_JS']).describe('Export format'),
        }),
      },
      async (args) => {
        try {
          // Verify ownership
          await this.presentationsService.findOne(args.presentationId, userId);
          const job = await this.prisma.exportJob.create({
            data: {
              presentationId: args.presentationId,
              format: args.format as any,
              status: 'QUEUED' as any,
            },
          });
          return {
            content: [{ type: 'text' as const, text: JSON.stringify({ jobId: job.id, status: 'QUEUED', format: args.format }, null, 2) }],
          };
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Export failed';
          return { content: [{ type: 'text' as const, text: `Error: ${msg}` }], isError: true };
        }
      },
    );

    // ── list_briefs ────────────────────────────────────
    server.registerTool(
      'list_briefs',
      {
        title: 'List Pitch Briefs',
        description: 'List your Pitch Briefs (curated knowledge collections). Each Brief has its own knowledge graph for RAG-powered generation.',
        inputSchema: z.object({}),
      },
      async () => {
        try {
          const briefs = await this.prisma.pitchBrief.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            select: { id: true, name: true, description: true, status: true, documentCount: true, entityCount: true, createdAt: true },
          });
          return {
            content: [{ type: 'text' as const, text: JSON.stringify(briefs, null, 2) }],
          };
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Failed to list briefs';
          return { content: [{ type: 'text' as const, text: `Error: ${msg}` }], isError: true };
        }
      },
    );

    // ── list_lenses ────────────────────────────────────
    server.registerTool(
      'list_lenses',
      {
        title: 'List Pitch Lenses',
        description: 'List your Pitch Lenses (strategy profiles). Each Lens defines audience, goal, tone, and storytelling framework.',
        inputSchema: z.object({}),
      },
      async () => {
        try {
          const lenses = await this.prisma.pitchLens.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            select: { id: true, name: true, audienceType: true, pitchGoal: true, industry: true, selectedFramework: true, toneStyle: true, isDefault: true, createdAt: true },
          });
          return {
            content: [{ type: 'text' as const, text: JSON.stringify(lenses, null, 2) }],
          };
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Failed to list lenses';
          return { content: [{ type: 'text' as const, text: `Error: ${msg}` }], isError: true };
        }
      },
    );

    // ── check_credits ──────────────────────────────────
    server.registerTool(
      'check_credits',
      {
        title: 'Check Credits',
        description: 'Check your current credit balance. Presentation generation costs 3 credits, image generation costs 1 credit each.',
        inputSchema: z.object({}),
      },
      async () => {
        try {
          const balance = await this.creditsService.getBalance(userId);
          return {
            content: [{ type: 'text' as const, text: JSON.stringify({ balance, costs: { deckGeneration: 2, imageGeneration: 1, entityExtraction: 1, export: 0 } }, null, 2) }],
          };
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Failed to check credits';
          return { content: [{ type: 'text' as const, text: `Error: ${msg}` }], isError: true };
        }
      },
    );
  }

  private registerResources(server: McpServer, userId: string) {
    // Static resource: list all presentations
    server.registerResource(
      'presentations-list',
      'pitchable://presentations',
      {
        title: 'All Presentations',
        description: 'List of all your presentations',
        mimeType: 'application/json',
      },
      async (uri) => {
        const presentations = await this.presentationsService.findAll(userId);
        return {
          contents: [{
            uri: uri.href,
            text: JSON.stringify(presentations, null, 2),
            mimeType: 'application/json',
          }],
        };
      },
    );
  }
}
