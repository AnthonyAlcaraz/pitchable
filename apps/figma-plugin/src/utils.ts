// ── Color Helpers ─────────────────────────────────────────

export function hexToRgb(hex: string): RGB {
  const c = hex.replace('#', '');
  return {
    r: parseInt(c.slice(0, 2), 16) / 255,
    g: parseInt(c.slice(2, 4), 16) / 255,
    b: parseInt(c.slice(4, 6), 16) / 255,
  };
}

export function setFill(node: GeometryMixin, hex: string): void {
  node.fills = [{ type: 'SOLID', color: hexToRgb(hex) }];
}

export function setFillWithOpacity(
  node: GeometryMixin & MinimalBlendMixin,
  hex: string,
  opacity: number,
): void {
  node.fills = [{ type: 'SOLID', color: hexToRgb(hex) }];
  node.opacity = opacity;
}

// ── Font Loading ──────────────────────────────────────────

export async function loadFont(
  family: string,
  style: string = 'Regular',
): Promise<FontName> {
  const fontName: FontName = { family, style };
  try {
    await figma.loadFontAsync(fontName);
    return fontName;
  } catch {
    const fallback: FontName = { family: 'Inter', style };
    await figma.loadFontAsync(fallback);
    return fallback;
  }
}

// ── Text Creation ─────────────────────────────────────────

export function createStyledText(
  parent: FrameNode,
  opts: {
    text: string;
    font: FontName;
    fontSize: number;
    color: string;
    x: number;
    y: number;
    w: number;
    align?: 'LEFT' | 'CENTER' | 'RIGHT';
    lineHeight?: number;
    opacity?: number;
    letterSpacing?: number;
    autoResize?: boolean;
  },
): TextNode {
  const node = figma.createText();
  node.fontName = opts.font;
  node.characters = opts.text;
  node.fontSize = opts.fontSize;
  setFill(node, opts.color);

  if (opts.lineHeight) {
    node.lineHeight = { value: opts.lineHeight, unit: 'PIXELS' };
  }
  if (opts.opacity !== undefined) {
    node.opacity = opts.opacity;
  }
  if (opts.letterSpacing) {
    node.letterSpacing = { value: opts.letterSpacing, unit: 'PIXELS' };
  }

  node.x = opts.x;
  node.y = opts.y;
  node.resize(opts.w, opts.fontSize * 2);
  node.textAlignHorizontal = opts.align ?? 'LEFT';

  if (opts.autoResize !== false) {
    node.textAutoResize = 'HEIGHT';
  }

  parent.appendChild(node);
  return node;
}

// ── Shape Creation ────────────────────────────────────────

export function createAccentLine(
  parent: FrameNode,
  opts: {
    x: number;
    y: number;
    w: number;
    h: number;
    color: string;
    cornerRadius?: number;
  },
): RectangleNode {
  const rect = figma.createRectangle();
  rect.x = opts.x;
  rect.y = opts.y;
  rect.resize(opts.w, opts.h);
  setFill(rect, opts.color);
  if (opts.cornerRadius) {
    rect.cornerRadius = opts.cornerRadius;
  }
  parent.appendChild(rect);
  return rect;
}

export function createCard(
  parent: FrameNode,
  opts: {
    x: number;
    y: number;
    w: number;
    h: number;
    fill: string;
    cornerRadius?: number;
    opacity?: number;
  },
): RectangleNode {
  const rect = figma.createRectangle();
  rect.x = opts.x;
  rect.y = opts.y;
  rect.resize(opts.w, opts.h);
  setFill(rect, opts.fill);
  rect.cornerRadius = opts.cornerRadius ?? 12;
  if (opts.opacity !== undefined) {
    rect.opacity = opts.opacity;
  }
  parent.appendChild(rect);
  return rect;
}

// ── Image Placement ───────────────────────────────────────

export async function placeImage(
  parent: FrameNode,
  imageUrl: string,
  opts: {
    x: number;
    y: number;
    w: number;
    h: number;
    cornerRadius?: number;
  },
  fallbackColor: string,
): Promise<void> {
  try {
    const response = await fetch(imageUrl);
    const arrayBuffer = await response.arrayBuffer();
    const uint8 = new Uint8Array(arrayBuffer);
    const imageHash = figma.createImage(uint8).hash;

    const rect = figma.createRectangle();
    rect.name = 'Slide Image';
    rect.x = opts.x;
    rect.y = opts.y;
    rect.resize(opts.w, opts.h);
    rect.cornerRadius = opts.cornerRadius ?? 12;
    rect.fills = [
      {
        type: 'IMAGE',
        imageHash,
        scaleMode: 'FILL',
      },
    ];
    parent.appendChild(rect);
  } catch {
    // Placeholder on failure
    createCard(parent, {
      x: opts.x,
      y: opts.y,
      w: opts.w,
      h: opts.h,
      fill: fallbackColor,
      cornerRadius: opts.cornerRadius ?? 12,
      opacity: 0.5,
    });
  }
}

// ── Constants ─────────────────────────────────────────────

export const SLIDE_W = 1920;
export const SLIDE_H = 1080;
export const PADDING = 80;
export const GAP = 320;
