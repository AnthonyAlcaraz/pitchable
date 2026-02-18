// Pitchable → Figma Plugin
// Imports a Pitchable presentation as editable Figma frames.

// ── Types (mirrors FigmaExportPayload from backend) ───────

interface FigmaExportSlide {
  slideNumber: number;
  slideType: string;
  title: string;
  bodyLines: string[];
  imageUrl: string | null;
  speakerNotes: string | null;
  sectionLabel: string | null;
  backgroundColor: string;
  textColor: string;
  accentColor: string;
}

interface FigmaExportPayload {
  version: number;
  presentationId: string;
  title: string;
  slideCount: number;
  theme: {
    name: string;
    headingFont: string;
    bodyFont: string;
    colors: {
      primary: string;
      secondary: string;
      accent: string;
      background: string;
      text: string;
      surface: string;
    };
  };
  slides: FigmaExportSlide[];
  dimensions: { width: number; height: number };
}

// ── Helpers ────────────────────────────────────────────────

function hexToRgb(hex: string): RGB {
  const c = hex.replace('#', '');
  return {
    r: parseInt(c.slice(0, 2), 16) / 255,
    g: parseInt(c.slice(2, 4), 16) / 255,
    b: parseInt(c.slice(4, 6), 16) / 255,
  };
}

function setFill(node: GeometryMixin, hex: string): void {
  node.fills = [{ type: 'SOLID', color: hexToRgb(hex) }];
}

async function loadFont(family: string, style: string = 'Regular'): Promise<FontName> {
  const fontName: FontName = { family, style };
  try {
    await figma.loadFontAsync(fontName);
    return fontName;
  } catch {
    // Fall back to Inter if the requested font isn't available
    const fallback: FontName = { family: 'Inter', style };
    await figma.loadFontAsync(fallback);
    return fallback;
  }
}

// ── Layout config per slide type ──────────────────────────

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

const SLIDE_W = 1920;
const SLIDE_H = 1080;
const PADDING = 80;
const GAP = 320; // gap between frames in Figma canvas

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
      // CONTENT, PROBLEM, SOLUTION, TEAM, etc. — title top-left, body left, image right
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

// ── Slide builder ─────────────────────────────────────────

async function buildSlide(
  slide: FigmaExportSlide,
  payload: FigmaExportPayload,
  headingFont: FontName,
  headingBoldFont: FontName,
  bodyFont: FontName,
  xOffset: number,
): Promise<FrameNode> {
  const frame = figma.createFrame();
  frame.name = `Slide ${slide.slideNumber} — ${slide.slideType}`;
  frame.resize(SLIDE_W, SLIDE_H);
  frame.x = xOffset;
  frame.y = 0;

  setFill(frame, slide.backgroundColor);

  const layout = getLayout(slide.slideType);

  // Section label (small text above title)
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

  // Title
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

  // Body lines
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

  // Image placeholder (if image present and layout has space for it)
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
      rect.fills = [{
        type: 'IMAGE',
        imageHash,
        scaleMode: 'FILL',
      }];
      frame.appendChild(rect);
    } catch {
      // Image fetch failed — create a placeholder rectangle
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

  // Speaker notes as a hidden annotation
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

// ── Main plugin flow ──────────────────────────────────────

figma.showUI(__html__, { width: 360, height: 420 });

figma.ui.onmessage = async (msg: {
  type: string;
  apiUrl: string;
  apiKey: string;
  presentationId: string;
}) => {
  if (msg.type !== 'import') return;

  const { apiUrl, apiKey, presentationId } = msg;

  try {
    // Step 1: Create an export job
    figma.ui.postMessage({ type: 'progress', text: 'Creating Figma export...' });

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
    figma.ui.postMessage({ type: 'progress', text: 'Processing export...' });

    let payload: FigmaExportPayload | null = null;
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
        // Download the payload
        const downloadRes = await fetch(`${apiUrl}/exports/${jobId}/download`, {
          headers: { Authorization: `Bearer ${apiKey}` },
          redirect: 'follow',
        });

        if (!downloadRes.ok) {
          throw new Error(`Download failed (${downloadRes.status})`);
        }

        payload = await downloadRes.json() as FigmaExportPayload;
        break;
      }

      figma.ui.postMessage({
        type: 'progress',
        text: `Processing export... (${attempt + 1}s)`,
      });
    }

    if (!payload) {
      throw new Error('Export timed out after 30 seconds.');
    }

    // Step 3: Load fonts
    figma.ui.postMessage({ type: 'progress', text: 'Loading fonts...' });

    const headingFont = await loadFont(payload.theme.headingFont);
    const headingBoldFont = await loadFont(payload.theme.headingFont, 'Bold');
    const bodyFont = await loadFont(payload.theme.bodyFont);

    // Step 4: Create a new page for the presentation
    const page = figma.createPage();
    page.name = payload.title;
    figma.currentPage = page;

    // Step 5: Create slide frames
    for (let i = 0; i < payload.slides.length; i++) {
      const slide = payload.slides[i];
      figma.ui.postMessage({
        type: 'progress',
        text: `Building slide ${i + 1} of ${payload.slideCount}...`,
      });

      const xOffset = i * (SLIDE_W + GAP);
      await buildSlide(slide, payload, headingFont, headingBoldFont, bodyFont, xOffset);
    }

    // Step 6: Zoom to fit
    figma.viewport.scrollAndZoomIntoView(page.children);

    figma.ui.postMessage({
      type: 'success',
      text: `Imported ${payload.slideCount} slides from "${payload.title}".`,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    figma.ui.postMessage({ type: 'error', text: message });
  }
};
