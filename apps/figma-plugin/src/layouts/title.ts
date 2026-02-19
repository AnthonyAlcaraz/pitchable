import type { FigmaExportSlideV2, ThemeConfig, LoadedFonts, FigmaStyles } from '../types';
import { createStyledText, createAccentLine, SLIDE_W, SLIDE_H, PADDING } from '../utils';
import { applyGradientBackground, addRadialGlow } from '../builders/background-builder';

/**
 * TITLE layout: Centered big title, subtitle, accent line, radial glow.
 */
export async function layout(
  frame: FrameNode,
  slide: FigmaExportSlideV2,
  theme: ThemeConfig,
  fonts: LoadedFonts,
  _styles: FigmaStyles,
): Promise<void> {
  // Background gradient
  applyGradientBackground(frame, theme.colors.background, theme.colors.surface, 160);
  addRadialGlow(frame, theme.colors.primary, { x: 0.5, y: 0.4, size: 800, opacity: 0.08 });

  // Accent line above title
  const lineW = 80;
  createAccentLine(frame, {
    x: (SLIDE_W - lineW) / 2,
    y: SLIDE_H * 0.35,
    w: lineW,
    h: 4,
    color: theme.colors.accent,
    cornerRadius: 2,
  });

  // Title
  createStyledText(frame, {
    text: slide.title,
    font: fonts.headingBold,
    fontSize: 64,
    color: theme.colors.text,
    x: PADDING,
    y: SLIDE_H * 0.35 + 24,
    w: SLIDE_W - PADDING * 2,
    align: 'CENTER',
    lineHeight: 76,
  });

  // Subtitle from first body line
  const subtitle = slide.bodyLines[0] ?? '';
  if (subtitle) {
    createStyledText(frame, {
      text: subtitle,
      font: fonts.body,
      fontSize: 28,
      color: theme.colors.text,
      x: PADDING + 100,
      y: SLIDE_H * 0.35 + 120,
      w: SLIDE_W - PADDING * 2 - 200,
      align: 'CENTER',
      lineHeight: 40,
      opacity: 0.7,
    });
  }

  // Bottom accent bar
  createAccentLine(frame, {
    x: (SLIDE_W - 200) / 2,
    y: SLIDE_H - 100,
    w: 200,
    h: 3,
    color: theme.colors.primary,
    cornerRadius: 2,
  });

  // Section label (if present)
  if (slide.sectionLabel) {
    createStyledText(frame, {
      text: slide.sectionLabel.toUpperCase(),
      font: fonts.body,
      fontSize: 14,
      color: theme.colors.primary,
      x: PADDING,
      y: SLIDE_H * 0.35 - 40,
      w: SLIDE_W - PADDING * 2,
      align: 'CENTER',
      letterSpacing: 3,
      opacity: 0.6,
    });
  }
}
