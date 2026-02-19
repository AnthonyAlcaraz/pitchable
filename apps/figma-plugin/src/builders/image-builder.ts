import { createCard } from '../utils';

/**
 * Place an image with rounded corners and optional shadow effect.
 * Falls back to a placeholder card on failure.
 */
export async function placeImageWithShadow(
  parent: FrameNode,
  imageUrl: string,
  opts: {
    x: number;
    y: number;
    w: number;
    h: number;
    cornerRadius?: number;
    shadowColor?: string;
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

    // Add drop shadow
    rect.effects = [
      {
        type: 'DROP_SHADOW',
        color: { r: 0, g: 0, b: 0, a: 0.15 },
        offset: { x: 0, y: 4 },
        radius: 16,
        spread: 0,
        visible: true,
        blendMode: 'NORMAL',
      },
    ];

    parent.appendChild(rect);
  } catch {
    createCard(parent, {
      x: opts.x,
      y: opts.y,
      w: opts.w,
      h: opts.h,
      fill: fallbackColor,
      cornerRadius: opts.cornerRadius ?? 12,
      opacity: 0.3,
    });
  }
}

/**
 * Place an image as a full-bleed background (no rounded corners).
 */
export async function placeBackgroundImage(
  parent: FrameNode,
  imageUrl: string,
  opacity: number = 0.8,
): Promise<void> {
  try {
    const response = await fetch(imageUrl);
    const arrayBuffer = await response.arrayBuffer();
    const uint8 = new Uint8Array(arrayBuffer);
    const imageHash = figma.createImage(uint8).hash;

    const rect = figma.createRectangle();
    rect.name = 'Background Image';
    rect.x = 0;
    rect.y = 0;
    rect.resize(parent.width, parent.height);
    rect.fills = [
      {
        type: 'IMAGE',
        imageHash,
        scaleMode: 'FILL',
      },
    ];
    rect.opacity = opacity;
    parent.appendChild(rect);
  } catch {
    // Silent fail — background remains solid
  }
}
