// Pitchable → Figma Plugin
// Imports a Pitchable presentation as editable Figma frames.

import type {
  FigmaExportPayload,
  FigmaExportSlide,
  FigmaExportPayloadV2,
  FigmaExportSlideV2,
  ThemeConfig,
  LoadedFonts,
  FigmaStyles,
} from './types';
import { hexToRgb, setFill, loadFont, createStyledText, SLIDE_W, SLIDE_H, PADDING, GAP } from './utils';
import { getLayoutForType } from './layouts/index';
import { applyTheme } from './builders/theme-builder';

// ── V1 Layout config (backward compat) ──────────────────

interface LayoutConfig {
  titleX: number;
  titleY: number;
  titleW: number;
  titleAlign: 'LEFT' | 'CENTER';
  titleSize: number;
  bodyX: number;
  bodyY: number;
  bodyW: number;
  bodyAlign: 'LEFT' | 'CENTER';
  imageX: number;
  imageY: number;
  imageW: number;
  imageH: number;
}

function getLayout(slideType: string): LayoutConfig {
  switch (slideType) {
    case 'TITLE':
    case 'CTA':
      return {
        titleX: PADDING, titleY: 340, titleW: SLIDE_W - PADDING * 2,
        titleAlign: 'CENTER', titleSize: 64,
        bodyX: PADDING + 200, bodyY: 480, bodyW: SLIDE_W - (PADDING + 200) * 2,
        bodyAlign: 'CENTER',
        imageX: 0, imageY: 0, imageW: 0, imageH: 0,
      };
    case 'QUOTE':
      return {
        titleX: PADDING + 100, titleY: 200, titleW: SLIDE_W - (PADDING + 100) * 2,
        titleAlign: 'CENTER', titleSize: 36,
        bodyX: PADDING + 160, bodyY: 340, bodyW: SLIDE_W - (PADDING + 160) * 2,
        bodyAlign: 'CENTER',
        imageX: 0, imageY: 0, imageW: 0, imageH: 0,
      };
    case 'DATA_METRICS':
    case 'ARCHITECTURE':
    case 'PROCESS':
      return {
        titleX: PADDING, titleY: PADDING, titleW: SLIDE_W - PADDING * 2,
        titleAlign: 'LEFT', titleSize: 44,
        bodyX: PADDING, bodyY: 180, bodyW: SLIDE_W - PADDING * 2,
        bodyAlign: 'LEFT',
        imageX: 0, imageY: 0, imageW: 0, imageH: 0,
      };
    default:
      return {
        titleX: PADDING, titleY: PADDING, titleW: SLIDE_W * 0.55,
        titleAlign: 'LEFT', titleSize: 44,
        bodyX: PADDING, bodyY: 180, bodyW: SLIDE_W * 0.55,
        bodyAlign: 'LEFT',
        imageX: SLIDE_W * 0.6, imageY: PADDING,
        imageW: SLIDE_W * 0.4 - PADDING, imageH: SLIDE_H - PADDING * 2,
      };
  }
}

// ── V1 Slide builder (backward compat) ───────────────────

async function buildSlideV1(
  slide: FigmaExportSlide,
  payload: FigmaExportPayload,
  headingFont: FontName,
  headingBoldFont: FontName,
  bodyFont: FontName,
  xOffset: number,
): Promise<FrameNode> {
  const frame = figma.createFrame();
  frame.name = `Slide ${slide.slideNumber} \u2014 ${slide.slideType}`;
  frame.resize(SLIDE_W, SLIDE_H);
  frame.x = xOffset;
  frame.y = 0;

  setFill(frame, slide.backgroundColor);
  const layout = getLayout(slide.slideType);

  if (slide.sectionLabel) {
    const labelNode = figma.createText();
    labelNode.fontName = bodyFont;
    labelNode.characters = slide.sectionLabel.toUpperCase();
    labelNode.fontSize = 14;
    labelNode.letterSpacing = { value: 2, unit: 'PIXELS' };
    setFill(labelNode, slide.accentColor);
    labelNode.x = layout.titleX;
    labelNode.y = layout.titleY - 36;
    labelNode.resize(layout.titleW, 20);
    labelNode.textAlignHorizontal = layout.titleAlign;
    frame.appendChild(labelNode);
  }

  const titleNode = figma.createText();
  titleNode.fontName = headingBoldFont;
  titleNode.characters = slide.title;
  titleNode.fontSize = layout.titleSize;
  titleNode.lineHeight = { value: layout.titleSize * 1.2, unit: 'PIXELS' };
  setFill(titleNode, slide.textColor);
  titleNode.x = layout.titleX;
  titleNode.y = layout.titleY;
  titleNode.resize(layout.titleW, layout.titleSize * 2);
  titleNode.textAlignHorizontal = layout.titleAlign;
  titleNode.textAutoResize = 'HEIGHT';
  frame.appendChild(titleNode);

  if (slide.bodyLines.length > 0) {
    const bodyText = slide.bodyLines.join('\n');
    const bodyNode = figma.createText();
    bodyNode.fontName = bodyFont;
    bodyNode.characters = bodyText;
    bodyNode.fontSize = 24;
    bodyNode.lineHeight = { value: 38, unit: 'PIXELS' };
    setFill(bodyNode, slide.textColor);
    bodyNode.opacity = 0.85;
    bodyNode.x = layout.bodyX;
    bodyNode.y = layout.bodyY;
    bodyNode.resize(layout.bodyW, SLIDE_H - layout.bodyY - PADDING);
    bodyNode.textAlignHorizontal = layout.bodyAlign;
    bodyNode.textAutoResize = 'HEIGHT';
    frame.appendChild(bodyNode);
  }

  if (slide.imageUrl && layout.imageW > 0) {
    try {
      const response = await fetch(slide.imageUrl);
      const arrayBuffer = await response.arrayBuffer();
      const uint8 = new Uint8Array(arrayBuffer);
      const imageHash = figma.createImage(uint8).hash;

      const rect = figma.createRectangle();
      rect.name = 'Slide Image';
      rect.x = layout.imageX;
      rect.y = layout.imageY;
      rect.resize(layout.imageW, layout.imageH);
      rect.cornerRadius = 12;
      rect.fills = [{ type: 'IMAGE', imageHash, scaleMode: 'FILL' }];
      frame.appendChild(rect);
    } catch {
      const rect = figma.createRectangle();
      rect.name = 'Image Placeholder';
      rect.x = layout.imageX;
      rect.y = layout.imageY;
      rect.resize(layout.imageW, layout.imageH);
      rect.cornerRadius = 12;
      setFill(rect, payload.theme.colors.surface);
      rect.opacity = 0.5;
      frame.appendChild(rect);
    }
  }

  if (slide.speakerNotes) {
    const notesNode = figma.createText();
    notesNode.fontName = bodyFont;
    notesNode.characters = `[Speaker Notes]\n${slide.speakerNotes}`;
    notesNode.fontSize = 14;
    setFill(notesNode, '#6b7280');
    notesNode.x = 0;
    notesNode.y = SLIDE_H + 20;
    notesNode.resize(SLIDE_W, 200);
    notesNode.textAutoResize = 'HEIGHT';
    notesNode.visible = false;
    frame.appendChild(notesNode);
  }

  return frame;
}

// ── V2 Slide builder (rich editable layouts) ─────────────

async function buildSlideV2(
  slide: FigmaExportSlideV2,
  theme: ThemeConfig,
  fonts: LoadedFonts,
  styles: FigmaStyles,
  xOffset: number,
): Promise<FrameNode> {
  const frame = figma.createFrame();
  frame.name = `Slide ${slide.slideNumber} \u2014 ${slide.slideType}`;
  frame.resize(SLIDE_W, SLIDE_H);
  frame.x = xOffset;
  frame.y = 0;

  // Use the layout registry to render this slide type
  const layoutFn = getLayoutForType(slide.slideType);
  await layoutFn(frame, slide, theme, fonts, styles);

  // Speaker notes as a hidden annotation
  if (slide.speakerNotes) {
    const notesNode = figma.createText();
    notesNode.fontName = fonts.body;
    notesNode.characters = `[Speaker Notes]\n${slide.speakerNotes}`;
    notesNode.fontSize = 14;
    setFill(notesNode, '#6b7280');
    notesNode.x = 0;
    notesNode.y = SLIDE_H + 20;
    notesNode.resize(SLIDE_W, 200);
    notesNode.textAutoResize = 'HEIGHT';
    notesNode.visible = false;
    frame.appendChild(notesNode);
  }

  return frame;
}

// ── Main plugin flow ──────────────────────────────────────

figma.showUI(__html__, { width: 400, height: 500 });

figma.ui.onmessage = async (msg: {
  type: string;
  apiUrl: string;
  apiKey: string;
  presentationId: string;
  createStyles?: boolean;
  layoutQuality?: 'simple' | 'full';
}) => {
  if (msg.type !== 'import') return;

  const { apiUrl, apiKey, presentationId } = msg;
  const createStyles = msg.createStyles !== false;
  const useFullLayout = msg.layoutQuality !== 'simple';

  try {
    // Step 1: Create an export job
    figma.ui.postMessage({ type: 'progress', text: 'Creating Figma export...', current: 0, total: 0 });

    const createRes = await fetch(`${apiUrl}/presentations/${presentationId}/export`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ format: 'FIGMA' }),
    });

    if (!createRes.ok) {
      const err = await createRes.text();
      throw new Error(`Export creation failed (${createRes.status}): ${err}`);
    }

    const { jobId } = await createRes.json() as { jobId: string };

    // Step 2: Poll for completion
    figma.ui.postMessage({ type: 'progress', text: 'Processing export...', current: 0, total: 0 });

    let rawPayload: FigmaExportPayload | FigmaExportPayloadV2 | null = null;
    for (let attempt = 0; attempt < 30; attempt++) {
      await new Promise((r) => setTimeout(r, 1000));

      const statusRes = await fetch(`${apiUrl}/exports/${jobId}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });

      if (!statusRes.ok) continue;

      const status = await statusRes.json() as { status: string; fileUrl?: string };

      if (status.status === 'FAILED') {
        throw new Error('Export job failed on the server.');
      }

      if (status.status === 'COMPLETED' && status.fileUrl) {
        const downloadRes = await fetch(`${apiUrl}/exports/${jobId}/download`, {
          headers: { Authorization: `Bearer ${apiKey}` },
          redirect: 'follow',
        });

        if (!downloadRes.ok) {
          throw new Error(`Download failed (${downloadRes.status})`);
        }

        rawPayload = await downloadRes.json() as FigmaExportPayload | FigmaExportPayloadV2;
        break;
      }

      figma.ui.postMessage({
        type: 'progress',
        text: `Processing export... (${attempt + 1}s)`,
        current: 0,
        total: 0,
      });
    }

    if (!rawPayload) {
      throw new Error('Export timed out after 30 seconds.');
    }

    // Step 3: Load fonts
    figma.ui.postMessage({ type: 'progress', text: 'Loading fonts...', current: 0, total: rawPayload.slideCount });

    const headingFont = await loadFont(rawPayload.theme.headingFont);
    const headingBoldFont = await loadFont(rawPayload.theme.headingFont, 'Bold');
    const bodyFont = await loadFont(rawPayload.theme.bodyFont);

    // Step 4: Create a new page
    const page = figma.createPage();
    page.name = rawPayload.title;
    figma.currentPage = page;

    // Step 5: Route to V1 or V2 engine
    const isV2 = rawPayload.version === 2 && useFullLayout;

    if (isV2) {
      const payload = rawPayload as FigmaExportPayloadV2;
      const theme: ThemeConfig = {
        name: payload.theme.name,
        headingFont: payload.theme.headingFont,
        bodyFont: payload.theme.bodyFont,
        colors: payload.theme.colors,
      };
      const fonts: LoadedFonts = {
        heading: headingFont,
        headingBold: headingBoldFont,
        body: bodyFont,
      };

      // Create Figma local styles
      let styles: FigmaStyles = { paintStyles: new Map(), textStyles: new Map() };
      if (createStyles) {
        figma.ui.postMessage({ type: 'progress', text: 'Creating theme styles...', current: 0, total: payload.slideCount });
        styles = await applyTheme(theme, headingBoldFont, bodyFont);
      }

      // Build each slide with V2 layout engine
      for (let i = 0; i < payload.slides.length; i++) {
        figma.ui.postMessage({
          type: 'progress',
          text: `Building slide ${i + 1} of ${payload.slideCount}...`,
          current: i + 1,
          total: payload.slideCount,
        });

        const xOffset = i * (SLIDE_W + GAP);
        await buildSlideV2(payload.slides[i], theme, fonts, styles, xOffset);
      }
    } else {
      // V1 fallback
      const payload = rawPayload as FigmaExportPayload;
      for (let i = 0; i < payload.slides.length; i++) {
        figma.ui.postMessage({
          type: 'progress',
          text: `Building slide ${i + 1} of ${payload.slideCount}...`,
          current: i + 1,
          total: payload.slideCount,
        });

        const xOffset = i * (SLIDE_W + GAP);
        await buildSlideV1(payload.slides[i], payload, headingFont, headingBoldFont, bodyFont, xOffset);
      }
    }

    // Step 6: Zoom to fit
    figma.viewport.scrollAndZoomIntoView(page.children);

    figma.ui.postMessage({
      type: 'success',
      text: `Imported ${rawPayload.slideCount} slides from "${rawPayload.title}"${isV2 ? ' (Full Layout)' : ''}.`,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    figma.ui.postMessage({ type: 'error', text: message });
  }
};
