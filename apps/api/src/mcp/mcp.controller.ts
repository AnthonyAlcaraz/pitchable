import {
  Controller,
  Post,
  Get,
  Delete,
  Req,
  Res,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { ApiKeysService } from '../api-keys/api-keys.service.js';
import { McpService } from './mcp.service.js';

@Controller('mcp')
export class McpController {
  constructor(
    private readonly mcpService: McpService,
    private readonly apiKeysService: ApiKeysService,
  ) {}

  /**
   * Handle POST /mcp -- main MCP endpoint for tool calls and initialization.
   */
  @Post()
  @HttpCode(HttpStatus.OK)
  async handlePost(@Req() req: IncomingMessage & { headers: Record<string, string | undefined>; body?: unknown }, @Res() res: ServerResponse) {
    const userId = await this.authenticate(req);

    // Check for existing session
    const sessionId = req.headers['mcp-session-id'] as string | undefined;
    if (sessionId) {
      const existing = await this.mcpService.getOrCreateTransport(sessionId);
      if (existing) {
        await existing.handleRequest(req, res, req.body);
        return;
      }
    }

    // New session -- create transport
    const transport = await this.mcpService.createTransport(userId);
    await transport.handleRequest(req, res, req.body);
  }

  /**
   * Handle GET /mcp -- SSE stream for server-to-client notifications.
   */
  @Get()
  async handleGet(@Req() req: IncomingMessage & { headers: Record<string, string | undefined>; body?: unknown }, @Res() res: ServerResponse) {
    const sessionId = req.headers['mcp-session-id'] as string | undefined;
    if (!sessionId) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Missing mcp-session-id header' }));
      return;
    }

    const transport = await this.mcpService.getOrCreateTransport(sessionId);
    if (!transport) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Session not found' }));
      return;
    }

    await transport.handleRequest(req, res);
  }

  /**
   * Handle DELETE /mcp -- close a session.
   */
  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  async handleDelete(@Req() req: IncomingMessage & { headers: Record<string, string | undefined>; body?: unknown }, @Res() res: ServerResponse) {
    const sessionId = req.headers['mcp-session-id'] as string | undefined;
    if (sessionId) {
      const transport = await this.mcpService.getOrCreateTransport(sessionId);
      if (transport) {
        await transport.close();
      }
    }
    res.writeHead(204);
    res.end();
  }

  private async authenticate(req: { headers: Record<string, string | undefined> }): Promise<string> {
    const rawKey = req.headers['x-api-key'] ?? (req.headers['authorization']?.startsWith('Bearer pk_') ? req.headers['authorization']?.substring(7) : undefined);

    if (!rawKey) {
      throw new UnauthorizedException('Missing API key');
    }

    const result = await this.apiKeysService.verify(rawKey);
    if (!result) {
      throw new UnauthorizedException('Invalid API key');
    }

    return result.userId;
  }
}
