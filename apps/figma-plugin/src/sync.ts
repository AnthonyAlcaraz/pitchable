import { setFill, SLIDE_W, SLIDE_H, PADDING } from './utils';

interface SyncChange {
  slideId: string;
  slideNumber: number;
  slideType: string;
  changedFields: string[];
  title: string;
  body: string;
  speakerNotes: string | null;
  imageUrl: string | null;
}

interface SyncResponse {
  presentationId: string;
  lastModified: string;
  changes: SyncChange[];
}

let syncInterval: ReturnType<typeof setInterval> | null = null;
let lastSyncTimestamp: string = new Date(0).toISOString();

/**
 * Start polling for changes from Pitchable.
 */
export function startSync(
  presentationId: string,
  apiUrl: string,
  apiKey: string,
  pollIntervalMs: number = 30000,
): void {
  stopSync();

  lastSyncTimestamp = new Date().toISOString();

  syncInterval = setInterval(async () => {
    try {
      const res = await fetch(
        `${apiUrl}/figma/sync/${presentationId}/changes?since=${encodeURIComponent(lastSyncTimestamp)}`,
        { headers: { Authorization: `Bearer ${apiKey}` } },
      );

      if (!res.ok) {
        figma.ui.postMessage({ type: 'sync-error', text: `Sync failed: ${res.status}` });
        return;
      }

      const data = await res.json() as SyncResponse;

      if (data.changes.length > 0) {
        await applySyncChanges(data.changes);
        lastSyncTimestamp = data.lastModified;
        figma.ui.postMessage({
          type: 'sync-update',
          text: `Synced ${data.changes.length} slide(s)`,
          count: data.changes.length,
        });
      } else {
        figma.ui.postMessage({ type: 'sync-status', text: 'Up to date' });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      figma.ui.postMessage({ type: 'sync-error', text: msg });
    }
  }, pollIntervalMs);

  figma.ui.postMessage({ type: 'sync-started', text: 'Sync started' });
}

/**
 * Stop the sync polling loop.
 */
export function stopSync(): void {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
    figma.ui.postMessage({ type: 'sync-stopped', text: 'Sync stopped' });
  }
}

/**
 * Apply changes from Pitchable to existing Figma frames.
 * Finds frames by naming convention: "Slide N — TYPE"
 */
async function applySyncChanges(changes: SyncChange[]): Promise<void> {
  const page = figma.currentPage;

  for (const change of changes) {
    // Find the matching frame by slide number
    const frameName = `Slide ${change.slideNumber}`;
    const frame = page.children.find(
      (node) => node.type === 'FRAME' && node.name.startsWith(frameName),
    ) as FrameNode | undefined;

    if (!frame) continue;

    // Update text layers
    for (const child of frame.children) {
      if (child.type !== 'TEXT') continue;

      // Detect title node (largest font, first text node, or positioned at top)
      if (child.fontSize >= 36 && child.y < SLIDE_H * 0.5) {
        if (change.changedFields.includes('title')) {
          await loadFontForNode(child);
          child.characters = change.title;
        }
        continue;
      }

      // Detect body node (positioned below title)
      if (child.fontSize <= 28 && child.fontSize >= 16 && child.y >= 100) {
        if (change.changedFields.includes('body') && change.body) {
          await loadFontForNode(child);
          const bodyLines = change.body
            .split('\n')
            .map((line) => line.replace(/^[-*]\s+/, '').trim())
            .filter(Boolean);
          child.characters = bodyLines.join('\n');
        }
        continue;
      }
    }

    // Update image if imageUrl changed
    if (change.changedFields.includes('imageUrl') && change.imageUrl) {
      const imageNode = frame.children.find(
        (node) =>
          node.type === 'RECTANGLE' &&
          Array.isArray(node.fills) &&
          node.fills.some((f: Paint) => f.type === 'IMAGE'),
      ) as RectangleNode | undefined;

      if (imageNode) {
        try {
          const response = await fetch(change.imageUrl);
          const arrayBuffer = await response.arrayBuffer();
          const uint8 = new Uint8Array(arrayBuffer);
          const imageHash = figma.createImage(uint8).hash;

          imageNode.fills = [
            { type: 'IMAGE', imageHash, scaleMode: 'FILL' },
          ];
        } catch {
          // Image fetch failed, skip
        }
      }
    }
  }
}

/**
 * Load the font currently used by a text node so we can modify it.
 */
async function loadFontForNode(node: TextNode): Promise<void> {
  const fontName = node.fontName as FontName;
  if (fontName && fontName.family) {
    try {
      await figma.loadFontAsync(fontName);
    } catch {
      await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });
    }
  }
}
