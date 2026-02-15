import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  EdgeQuakeTenant,
  EdgeQuakeWorkspace,
  EdgeQuakeDocument,
  EdgeQuakeQueryResult,
  EdgeQuakeHealthResponse,
  EdgeQuakeGraphData,
  EdgeQuakeGraphStats,
  EdgeQuakeEntity,
  EdgeQuakeSource,
} from './edgequake.types.js';

@Injectable()
export class EdgeQuakeService {
  private readonly logger = new Logger(EdgeQuakeService.name);
  private readonly baseUrl: string;
  private readonly apiKey: string | undefined;
  private readonly enabled: boolean;

  constructor(private readonly config: ConfigService) {
    this.enabled = config.get('EDGEQUAKE_ENABLED', 'false') === 'true';
    this.baseUrl = config.get('EDGEQUAKE_URL', 'http://edgequake:8080');
    this.apiKey = config.get('EDGEQUAKE_API_KEY');
    if (this.enabled) {
      this.logger.log(`EdgeQuake enabled at ${this.baseUrl}`);
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  async healthCheck(): Promise<boolean> {
    try {
      const res = await this.request<EdgeQuakeHealthResponse>('GET', '/health');
      return res.status === 'ok' || res.status === 'healthy';
    } catch {
      return false;
    }
  }

  async ensureTenant(userId: string): Promise<EdgeQuakeTenant> {
    return this.request<EdgeQuakeTenant>('POST', '/api/v1/tenants', {
      name: `pitchable-user-${userId}`,
    });
  }

  async ensureWorkspace(
    tenantId: string,
    name: string,
  ): Promise<EdgeQuakeWorkspace> {
    return this.request<EdgeQuakeWorkspace>(
      'POST',
      '/api/v1/workspaces',
      { name },
      { 'X-Tenant-ID': tenantId },
    );
  }

  async uploadDocument(
    tenantId: string,
    workspaceId: string,
    content: string,
    title: string,
  ): Promise<EdgeQuakeDocument> {
    return this.request<EdgeQuakeDocument>(
      'POST',
      '/api/v1/documents',
      { content, title },
      {
        'X-Tenant-ID': tenantId,
        'X-Workspace-ID': workspaceId,
      },
    );
  }

  async uploadFile(
    tenantId: string,
    workspaceId: string,
    fileBuffer: Buffer,
    filename: string,
    mimeType: string,
  ): Promise<EdgeQuakeDocument> {
    const formData = new FormData();
    const blob = new Blob([new Uint8Array(fileBuffer) as BlobPart], {
      type: mimeType,
    });
    formData.append('file', blob, filename);

    const headers: Record<string, string> = {
      'X-Tenant-ID': tenantId,
      'X-Workspace-ID': workspaceId,
    };
    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    const res = await fetch(`${this.baseUrl}/api/v1/documents/upload`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`EdgeQuake uploadFile failed (${res.status}): ${text}`);
    }

    return res.json() as Promise<EdgeQuakeDocument>;
  }

  async deleteDocument(
    tenantId: string,
    workspaceId: string,
    documentId: string,
  ): Promise<void> {
    await this.request<unknown>(
      'DELETE',
      `/api/v1/documents/${documentId}`,
      undefined,
      {
        'X-Tenant-ID': tenantId,
        'X-Workspace-ID': workspaceId,
      },
    );
  }

  async query(
    tenantId: string,
    workspaceId: string,
    queryText: string,
    mode = 'hybrid',
  ): Promise<EdgeQuakeQueryResult> {
    return this.request<EdgeQuakeQueryResult>(
      'POST',
      '/api/v1/query',
      { query: queryText, mode },
      {
        'X-Tenant-ID': tenantId,
        'X-Workspace-ID': workspaceId,
      },
    );
  }

  async createWorkspace(
    tenantId: string,
    name: string,
  ): Promise<EdgeQuakeWorkspace> {
    return this.request<EdgeQuakeWorkspace>(
      'POST',
      '/api/v1/workspaces',
      { name },
      { 'X-Tenant-ID': tenantId },
    );
  }

  async deleteWorkspace(tenantId: string, workspaceId: string): Promise<void> {
    await this.request<unknown>(
      'DELETE',
      `/api/v1/workspaces/${workspaceId}`,
      undefined,
      { 'X-Tenant-ID': tenantId },
    );
  }

  async listWorkspaces(tenantId: string): Promise<EdgeQuakeWorkspace[]> {
    const result = await this.request<{ workspaces?: EdgeQuakeWorkspace[] }>(
      'GET',
      '/api/v1/workspaces',
      undefined,
      { 'X-Tenant-ID': tenantId },
    );
    return result.workspaces ?? [];
  }

  async getGraph(
    tenantId: string,
    workspaceId: string,
    opts?: { startNode?: string; depth?: number; maxNodes?: number },
  ): Promise<EdgeQuakeGraphData> {
    const params = new URLSearchParams();
    if (opts?.startNode) params.set('start_node', opts.startNode);
    if (opts?.depth) params.set('depth', String(opts.depth));
    if (opts?.maxNodes) params.set('max_nodes', String(opts.maxNodes));
    const qs = params.toString();
    return this.request<EdgeQuakeGraphData>(
      'GET',
      `/api/v1/graph${qs ? `?${qs}` : ''}`,
      undefined,
      { 'X-Tenant-ID': tenantId, 'X-Workspace-ID': workspaceId },
    );
  }

  async getGraphStats(
    tenantId: string,
    workspaceId: string,
  ): Promise<EdgeQuakeGraphStats> {
    return this.request<EdgeQuakeGraphStats>(
      'GET',
      '/api/v1/graph/stats',
      undefined,
      { 'X-Tenant-ID': tenantId, 'X-Workspace-ID': workspaceId },
    );
  }

  async getEntities(
    tenantId: string,
    workspaceId: string,
    opts?: { type?: string; limit?: number },
  ): Promise<EdgeQuakeEntity[]> {
    const params = new URLSearchParams();
    if (opts?.type) params.set('type', opts.type);
    if (opts?.limit) params.set('limit', String(opts.limit));
    const qs = params.toString();
    const result = await this.request<{ entities?: EdgeQuakeEntity[] }>(
      'GET',
      `/api/v1/graph/entities${qs ? `?${qs}` : ''}`,
      undefined,
      { 'X-Tenant-ID': tenantId, 'X-Workspace-ID': workspaceId },
    );
    return result.entities ?? [];
  }

  async queryMultipleWorkspaces(
    tenantId: string,
    workspaceIds: string[],
    queryText: string,
    mode = 'hybrid',
  ): Promise<EdgeQuakeQueryResult> {
    // Query each workspace and merge results, sorted by score
    const allSources: EdgeQuakeSource[] = [];
    let bestAnswer = '';
    for (const wsId of workspaceIds) {
      try {
        const result = await this.query(tenantId, wsId, queryText, mode);
        allSources.push(...result.sources);
        if (!bestAnswer && result.answer) bestAnswer = result.answer;
      } catch {
        // Skip failed workspaces
      }
    }
    allSources.sort((a, b) => b.score - a.score);
    return { answer: bestAnswer, sources: allSources };
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    extraHeaders?: Record<string, string>,
  ): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...extraHeaders,
    };
    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(
        `EdgeQuake ${method} ${path} failed (${res.status}): ${text}`,
      );
    }

    const contentType = res.headers.get('content-type') ?? '';
    if (contentType.includes('application/json')) {
      return res.json() as Promise<T>;
    }
    return {} as T;
  }
}
