import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type {
  FigmaUser,
  FigmaFileResponse,
  FigmaImageExportResponse,
  FigmaFrameInfo,
} from './interfaces/figma-api.interfaces.js';

const FIGMA_API = 'https://api.figma.com/v1';

// Simple rate limiter: Figma allows ~30 requests/minute
let lastRequestTime = 0;
const MIN_REQUEST_GAP_MS = 3000; // ~20 req/min max (safe margin)
const MAX_RETRIES = 1;
const MAX_RETRY_WAIT_MS = 10_000;
const FETCH_TIMEOUT_MS = 15_000;

async function rateLimitedFetch(
  url: string,
  options: RequestInit,
): Promise<Response> {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const now = Date.now();
    const elapsed = now - lastRequestTime;
    if (elapsed < MIN_REQUEST_GAP_MS) {
      await new Promise((r) => setTimeout(r, MIN_REQUEST_GAP_MS - elapsed));
    }
    lastRequestTime = Date.now();

    const res = await fetch(url, {
      ...options,
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });

    if (res.status === 429 && attempt < MAX_RETRIES) {
      const retryAfter = parseInt(res.headers.get('retry-after') ?? '', 10);
      const waitMs = Math.min(
        retryAfter > 0 ? retryAfter * 1000 : 5000 * (attempt + 1),
        MAX_RETRY_WAIT_MS,
      );
      console.log(`Figma 429 — retry ${attempt + 1}/${MAX_RETRIES} after ${waitMs}ms`);
      await new Promise((r) => setTimeout(r, waitMs));
      continue;
    }

    return res;
  }

  // Unreachable, but satisfies TypeScript
  return fetch(url, options);
}

@Injectable()
export class FigmaService {
  private readonly logger = new Logger(FigmaService.name);

  // In-memory frame cache (10-minute TTL) — avoids redundant Figma API calls
  private readonly frameCache = new Map<
    string,
    { frames: FigmaFrameInfo[]; expiresAt: number }
  >();
  private static readonly FRAME_CACHE_TTL_MS = 10 * 60 * 1000;

  constructor(private readonly prisma: PrismaService) {}

  private frameCacheKey(token: string, fileKey: string): string {
    return token.slice(-8) + ':' + fileKey;
  }

  invalidateFrameCache(fileKey?: string): void {
    if (!fileKey) {
      this.frameCache.clear();
      return;
    }
    for (const key of this.frameCache.keys()) {
      if (key.endsWith(':' + fileKey)) {
        this.frameCache.delete(key);
      }
    }
  }

  // ── Token Management ────────────────────────────────────────

  async saveToken(userId: string, accessToken: string): Promise<void> {
    // Validate the token first
    const user = await this.fetchFigmaUser(accessToken);

    await this.prisma.figmaIntegration.upsert({
      where: { userId },
      create: {
        userId,
        accessToken,
        figmaUserId: user.id,
        figmaUserName: user.handle,
        isValid: true,
        lastValidatedAt: new Date(),
      },
      update: {
        accessToken,
        figmaUserId: user.id,
        figmaUserName: user.handle,
        isValid: true,
        lastValidatedAt: new Date(),
      },
    });

    this.logger.log(`Figma token saved for user ${userId} (${user.handle})`);
  }

  async getToken(userId: string): Promise<string | null> {
    const integration = await this.prisma.figmaIntegration.findUnique({
      where: { userId },
      select: { accessToken: true, isValid: true },
    });
    if (!integration || !integration.isValid) return null;
    return integration.accessToken;
  }

  async getStatus(userId: string) {
    const integration = await this.prisma.figmaIntegration.findUnique({
      where: { userId },
      select: {
        figmaUserId: true,
        figmaUserName: true,
        isValid: true,
        lastValidatedAt: true,
        createdAt: true,
      },
    });

    if (!integration) return { connected: false };

    return {
      connected: true,
      figmaUserId: integration.figmaUserId,
      figmaUserName: integration.figmaUserName,
      isValid: integration.isValid,
      lastValidatedAt: integration.lastValidatedAt,
      connectedAt: integration.createdAt,
    };
  }

  async validateToken(userId: string): Promise<boolean> {
    const token = await this.getToken(userId);
    if (!token) return false;

    try {
      await this.fetchFigmaUser(token);
      await this.prisma.figmaIntegration.update({
        where: { userId },
        data: { isValid: true, lastValidatedAt: new Date() },
      });
      return true;
    } catch {
      await this.prisma.figmaIntegration.update({
        where: { userId },
        data: { isValid: false },
      });
      return false;
    }
  }

  async disconnect(userId: string): Promise<void> {
    await this.prisma.figmaIntegration.deleteMany({ where: { userId } });
    this.logger.log(`Figma disconnected for user ${userId}`);
  }

  // ── File & Node Browsing ────────────────────────────────────

  /**
   * Resolve a Figma access token from multiple sources (priority order):
   * 1. PitchLens-level token (if lensId provided and has figmaAccessToken)
   * 2. User-level FigmaIntegration token
   */
  async resolveToken(
    userId: string,
    lensId?: string | null,
  ): Promise<string | null> {
    // Try PitchLens token first
    if (lensId) {
      const lens = await this.prisma.pitchLens.findUnique({
        where: { id: lensId },
        select: { figmaAccessToken: true, userId: true },
      });
      if (lens && lens.userId === userId && lens.figmaAccessToken) {
        return lens.figmaAccessToken;
      }
    }

    // Fall back to user-level token
    return this.getToken(userId);
  }

  async getFrames(token: string, fileKey: string): Promise<FigmaFrameInfo[]> {
    // Check cache first
    const cacheKey = this.frameCacheKey(token, fileKey);
    const cached = this.frameCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      this.logger.debug(`Frame cache hit for file ${fileKey}`);
      return cached.frames;
    }

    const file = await this.fetchFile(token, fileKey);
    const frames: FigmaFrameInfo[] = [];

    for (const page of file.document.children ?? []) {
      if (page.type !== 'CANVAS') continue;
      for (const node of page.children ?? []) {
        if (
          node.type === 'FRAME' ||
          node.type === 'COMPONENT' ||
          node.type === 'COMPONENT_SET'
        ) {
          frames.push({
            nodeId: node.id,
            name: node.name,
            width: node.absoluteBoundingBox?.width ?? 0,
            height: node.absoluteBoundingBox?.height ?? 0,
            pageName: page.name,
          });
        }
      }
    }

    // Batch-fetch thumbnails (one API call for all frames)
    if (frames.length > 0) {
      const nodeIds = frames.map((f) => f.nodeId).join(',');
      try {
        const thumbnails = await this.exportNodesAsImage(
          token,
          fileKey,
          nodeIds,
          'png',
          0.25,
        );
        for (const frame of frames) {
          frame.thumbnailUrl = thumbnails[frame.nodeId] ?? undefined;
        }
      } catch (err) {
        this.logger.warn(
          `Failed to fetch thumbnails: ${err instanceof Error ? err.message : 'unknown'}`,
        );
      }
    }

    this.logger.log(
      `Found ${frames.length} frames in Figma file ${fileKey}`,
    );

    // Store in cache
    this.frameCache.set(cacheKey, {
      frames,
      expiresAt: Date.now() + FigmaService.FRAME_CACHE_TTL_MS,
    });

    return frames;
  }

  // ── Image Export ────────────────────────────────────────────

  /**
   * Export one or more Figma nodes as images.
   * Returns a map of nodeId → temporary CDN URL (expires ~14 days).
   */
  async exportNodesAsImage(
    token: string,
    fileKey: string,
    nodeIds: string,
    format: 'png' | 'svg' = 'png',
    scale = 2,
  ): Promise<Record<string, string | null>> {
    const url =
      `${FIGMA_API}/images/${fileKey}` +
      `?ids=${encodeURIComponent(nodeIds)}` +
      `&format=${format}` +
      `&scale=${scale}`;

    const res = await rateLimitedFetch(url, {
      headers: { 'x-figma-token': token },
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(
        `Figma image export failed (${res.status}): ${body}`,
      );
    }

    const data = (await res.json()) as FigmaImageExportResponse;
    if (data.err) {
      throw new Error(`Figma image export error: ${data.err}`);
    }

    return data.images;
  }

  /**
   * Export a single node and download the PNG bytes.
   */
  async exportNodeAsBuffer(
    token: string,
    fileKey: string,
    nodeId: string,
    format: 'png' | 'svg' = 'png',
    scale = 2,
  ): Promise<{ buffer: Buffer; mimeType: string }> {
    const images = await this.exportNodesAsImage(
      token,
      fileKey,
      nodeId,
      format,
      scale,
    );

    const cdnUrl = images[nodeId];
    if (!cdnUrl) {
      throw new Error(
        `No image URL returned for node ${nodeId} in file ${fileKey}`,
      );
    }

    // Download from Figma CDN (temporary URL)
    const imgRes = await fetch(cdnUrl, {
      signal: AbortSignal.timeout(30_000),
    });
    if (!imgRes.ok) {
      throw new Error(
        `Failed to download Figma image (${imgRes.status})`,
      );
    }

    const arrayBuffer = await imgRes.arrayBuffer();
    const mimeType = format === 'svg' ? 'image/svg+xml' : 'image/png';

    return { buffer: Buffer.from(arrayBuffer), mimeType };
  }

  // ── Rate Limit Awareness ───────────────────────────────────

  /** Figma plan tier limits (approximate daily file-read budgets). */
  static readonly PLAN_LIMITS: Record<string, { label: string; dailyReads: number; warning: string }> = {
    starter: {
      label: 'Starter (Free)',
      dailyReads: 50,
      warning: 'Figma Starter plan has very limited API access (~50 file reads/day). Auto-map and template sync may exhaust your quota quickly. Upgrade to Professional for higher limits.',
    },
    professional: {
      label: 'Professional',
      dailyReads: 500,
      warning: 'Figma Professional plan supports ~500 file reads/day. Sufficient for normal usage.',
    },
    organization: {
      label: 'Organization',
      dailyReads: 2000,
      warning: '',
    },
    enterprise: {
      label: 'Enterprise',
      dailyReads: 5000,
      warning: '',
    },
  };

  /**
   * Check API rate limit status by making a lightweight /me call.
   * Returns plan tier info and whether the token is currently rate-limited.
   */
  async checkRateLimitStatus(token: string): Promise<{
    isRateLimited: boolean;
    retryAfterSeconds?: number;
    planTier?: string;
    warning?: string;
  }> {
    try {
      const res = await fetch(`${FIGMA_API}/me`, {
        headers: { 'x-figma-token': token },
        signal: AbortSignal.timeout(10_000),
      });

      const planTier = res.headers.get('x-figma-plan-tier') ?? undefined;
      const retryAfter = parseInt(res.headers.get('retry-after') ?? '', 10);

      if (res.status === 429) {
        const planInfo = planTier ? FigmaService.PLAN_LIMITS[planTier] : undefined;
        return {
          isRateLimited: true,
          retryAfterSeconds: retryAfter > 0 ? retryAfter : undefined,
          planTier,
          warning: planInfo?.warning ?? `Figma API rate limit exceeded. ${retryAfter > 3600 ? `Reset in ~${Math.ceil(retryAfter / 3600)} hours.` : 'Try again in a few minutes.'} Consider upgrading your Figma plan for higher API limits.`,
        };
      }

      const planInfo = planTier ? FigmaService.PLAN_LIMITS[planTier] : undefined;
      return {
        isRateLimited: false,
        planTier,
        warning: planInfo?.warning || undefined,
      };
    } catch {
      return { isRateLimited: false };
    }
  }

  // ── Private helpers ─────────────────────────────────────────

  private async fetchFigmaUser(token: string): Promise<FigmaUser> {
    const res = await rateLimitedFetch(`${FIGMA_API}/me`, {
      headers: { 'x-figma-token': token },
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(
        `Figma token validation failed (${res.status}): ${body}`,
      );
    }

    return (await res.json()) as FigmaUser;
  }

  private async fetchFile(
    token: string,
    fileKey: string,
  ): Promise<FigmaFileResponse> {
    // Depth 2: document → pages → top-level frames (skip deep nesting)
    const res = await rateLimitedFetch(
      `${FIGMA_API}/files/${fileKey}?depth=2`,
      { headers: { 'x-figma-token': token } },
    );

    if (!res.ok) {
      const body = await res.text();
      throw new Error(
        `Figma file fetch failed (${res.status}): ${body}`,
      );
    }

    return (await res.json()) as FigmaFileResponse;
  }
}
