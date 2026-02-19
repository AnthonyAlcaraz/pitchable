import type { FigmaExportSlideV2, ThemeConfig, LoadedFonts, FigmaStyles } from '../types';
import { createStyledText, createAccentLine, SLIDE_W, SLIDE_H, PADDING, hexToRgb } from '../utils';
import { applySolidBackground } from '../builders/background-builder';

/**
 * MARKET_SIZING layout: Concentric circles (TAM/SAM/SOM) with text.
 */
export async function layout(
  frame: FrameNode,
  slide: FigmaExportSlideV2,
  theme: ThemeConfig,
  fonts: LoadedFonts,
  _styles: FigmaStyles,
): Promise<void> {
  applySolidBackground(frame, theme.colors.background);

  // Title
  createStyledText(frame, {
    text: slide.title,
    font: fonts.headingBold,
    fontSize: 40,
    color: theme.colors.text,
    x: PADDING,
    y: PADDING,
    w: SLIDE_W * 0.45,
    lineHeight: 48,
  });

  createAccentLine(frame, {
    x: PADDING,
    y: PADDING + 56,
    w: 50,
    h: 3,
    color: theme.colors.accent,
    cornerRadius: 2,
  });

  // Body text (left side)
  let ty = PADDING + 80;
  for (const line of slide.bodyLines) {
    createStyledText(frame, {
      text: line,
      font: fonts.body,
      fontSize: 20,
      color: theme.colors.text,
      x: PADDING,
      y: ty,
      w: SLIDE_W * 0.4,
      lineHeight: 30,
      opacity: 0.85,
    });
    ty += 38;
  }

  // Concentric circles (right side)
  const centerX = SLIDE_W * 0.72;
  const centerY = SLIDE_H * 0.5;

  const circles = [
    { size: 420, label: 'TAM', opacity: 0.08 },
    { size: 280, label: 'SAM', opacity: 0.12 },
    { size: 160, label: 'SOM', opacity: 0.2 },
  ];

  for (const c of circles) {
    const ellipse = figma.createEllipse();
    ellipse.name = c.label;
    ellipse.resize(c.size, c.size);
    ellipse.x = centerX - c.size / 2;
    ellipse.y = centerY - c.size / 2;
    ellipse.fills = [{ type: 'SOLID', color: hexToRgb(theme.colors.primary) }];
    ellipse.opacity = c.opacity;
    frame.appendChild(ellipse);
  }

  // Labels on circles
  const labelOffsets = [
    { label: 'TAM', y: centerY - 190 },
    { label: 'SAM', y: centerY - 110 },
    { label: 'SOM', y: centerY - 12 },
  ];

  for (const l of labelOffsets) {
    createStyledText(frame, {
      text: l.label,
      font: fonts.headingBold,
      fontSize: 16,
      color: theme.colors.primary,
      x: centerX - 40,
      y: l.y,
      w: 80,
      align: 'CENTER',
      letterSpacing: 2,
    });
  }
}
