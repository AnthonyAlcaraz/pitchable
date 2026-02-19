import { setFill, hexToRgb, SLIDE_W, SLIDE_H } from '../utils';

/**
 * Apply a solid background fill to a frame.
 */
export function applySolidBackground(
  frame: FrameNode,
  color: string,
): void {
  setFill(frame, color);
}

/**
 * Apply a gradient background (primary → darker variant).
 */
export function applyGradientBackground(
  frame: FrameNode,
  startColor: string,
  endColor: string,
  angle: number = 135,
): void {
  const start = hexToRgb(startColor);
  const end = hexToRgb(endColor);

  // Convert angle to gradient transform
  const rad = (angle * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  frame.fills = [
    {
      type: 'GRADIENT_LINEAR',
      gradientStops: [
        { position: 0, color: { ...start, a: 1 } },
        { position: 1, color: { ...end, a: 1 } },
      ],
      gradientTransform: [
        [cos, sin, 0.5 - cos * 0.5 - sin * 0.5],
        [-sin, cos, 0.5 + sin * 0.5 - cos * 0.5],
      ],
    },
  ];
}

/**
 * Add a dark gradient overlay (for image backgrounds with text).
 */
export function addDarkOverlay(
  frame: FrameNode,
  opacity: number = 0.5,
): void {
  const overlay = figma.createRectangle();
  overlay.name = 'Dark Overlay';
  overlay.x = 0;
  overlay.y = 0;
  overlay.resize(SLIDE_W, SLIDE_H);

  const black = hexToRgb('#000000');
  overlay.fills = [
    {
      type: 'GRADIENT_LINEAR',
      gradientStops: [
        { position: 0, color: { ...black, a: opacity * 0.3 } },
        { position: 1, color: { ...black, a: opacity } },
      ],
      gradientTransform: [
        [0, 1, 0],
        [-1, 0, 1],
      ],
    },
  ];

  frame.appendChild(overlay);
}

/**
 * Add a subtle radial glow effect in the background.
 */
export function addRadialGlow(
  frame: FrameNode,
  color: string,
  opts?: {
    x?: number;
    y?: number;
    size?: number;
    opacity?: number;
  },
): void {
  const glow = figma.createEllipse();
  glow.name = 'Glow';
  const size = opts?.size ?? 600;
  glow.resize(size, size);
  glow.x = (opts?.x ?? 0.3) * SLIDE_W - size / 2;
  glow.y = (opts?.y ?? 0.5) * SLIDE_H - size / 2;

  const rgb = hexToRgb(color);
  glow.fills = [
    {
      type: 'GRADIENT_RADIAL',
      gradientStops: [
        { position: 0, color: { ...rgb, a: opts?.opacity ?? 0.15 } },
        { position: 1, color: { ...rgb, a: 0 } },
      ],
      gradientTransform: [
        [1, 0, 0],
        [0, 1, 0],
      ],
    },
  ];

  frame.appendChild(glow);
}
