import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  EdgeQuakeTenant,
  EdgeQuakeWorkspace,
  EdgeQuakeDocument,
  EdgeQuakeQueryResult,
  EdgeQuakeHealthResponse,
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
    const blob = new Blob([new Uint8Array(fileBuffer) as BlobPart], { type: mimeType });
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
      throw new Error(`EdgeQuake ${method} ${path} failed (${res.status}): ${text}`);
    }

    const contentType = res.headers.get('content-type') ?? '';
    if (contentType.includes('application/json')) {
      return res.json() as Promise<T>;
    }
    return {} as T;
  }
}
