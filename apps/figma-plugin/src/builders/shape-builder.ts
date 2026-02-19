import { setFill, hexToRgb } from '../utils';

/**
 * Create a horizontal accent/divider line.
 */
export function createDividerLine(
  parent: FrameNode,
  opts: {
    x: number;
    y: number;
    w: number;
    color: string;
    thickness?: number;
  },
): RectangleNode {
  const line = figma.createRectangle();
  line.name = 'Divider';
  line.x = opts.x;
  line.y = opts.y;
  line.resize(opts.w, opts.thickness ?? 3);
  setFill(line, opts.color);
  parent.appendChild(line);
  return line;
}

/**
 * Create a card/container shape with optional border.
 */
export function createContainerCard(
  parent: FrameNode,
  opts: {
    x: number;
    y: number;
    w: number;
    h: number;
    fill: string;
    cornerRadius?: number;
    opacity?: number;
    borderColor?: string;
    borderWidth?: number;
  },
): RectangleNode {
  const rect = figma.createRectangle();
  rect.name = 'Card';
  rect.x = opts.x;
  rect.y = opts.y;
  rect.resize(opts.w, opts.h);
  setFill(rect, opts.fill);
  rect.cornerRadius = opts.cornerRadius ?? 12;

  if (opts.opacity !== undefined) {
    rect.opacity = opts.opacity;
  }

  if (opts.borderColor) {
    rect.strokes = [{
      type: 'SOLID',
      color: hexToRgb(opts.borderColor),
    }];
    rect.strokeWeight = opts.borderWidth ?? 2;
  }

  parent.appendChild(rect);
  return rect;
}

/**
 * Create a decorative circle (e.g., for timeline nodes).
 */
export function createCircle(
  parent: FrameNode,
  opts: {
    x: number;
    y: number;
    size: number;
    fill: string;
    opacity?: number;
  },
): EllipseNode {
  const circle = figma.createEllipse();
  circle.name = 'Circle';
  circle.x = opts.x;
  circle.y = opts.y;
  circle.resize(opts.size, opts.size);
  setFill(circle, opts.fill);
  if (opts.opacity !== undefined) {
    circle.opacity = opts.opacity;
  }
  parent.appendChild(circle);
  return circle;
}

/**
 * Create a connector line between two points.
 */
export function createConnector(
  parent: FrameNode,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: string,
  thickness: number = 2,
): LineNode {
  const line = figma.createLine();
  line.x = x1;
  line.y = y1;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.sqrt(dx * dx + dy * dy);
  line.resize(length, 0);
  line.rotation = -Math.atan2(dy, dx) * (180 / Math.PI);
  line.strokes = [{ type: 'SOLID', color: hexToRgb(color) }];
  line.strokeWeight = thickness;
  parent.appendChild(line);
  return line;
}
