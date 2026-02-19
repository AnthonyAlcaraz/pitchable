import type { FigmaExportSlideV2, ThemeConfig, LoadedFonts, FigmaStyles } from '../types';
import { createStyledText, createAccentLine, SLIDE_W, SLIDE_H, PADDING } from '../utils';
import { applySolidBackground, addRadialGlow } from '../builders/background-builder';

/**
 * QUOTE layout: Large centered quote with decorative quotation mark and attribution.
 */
export async function layout(
  frame: FrameNode,
  slide: FigmaExportSlideV2,
  theme: ThemeConfig,
  fonts: LoadedFonts,
  _styles: FigmaStyles,
): Promise<void> {
  applySolidBackground(frame, theme.colors.background);
  addRadialGlow(frame, theme.colors.primary, { x: 0.3, y: 0.3, size: 600, opacity: 0.05 });

  // Large decorative opening quote mark
  createStyledText(frame, {
    text: '\u201C',
    font: fonts.headingBold,
    fontSize: 200,
    color: theme.colors.primary,
    x: PADDING + 40,
    y: SLIDE_H * 0.2,
    w: 200,
    align: 'LEFT',
    opacity: 0.2,
  });

  // Quote text (the title IS the quote)
  createStyledText(frame, {
    text: slide.title,
    font: fonts.heading,
    fontSize: 40,
    color: theme.colors.text,
    x: PADDING + 120,
    y: SLIDE_H * 0.34,
    w: SLIDE_W - PADDING * 2 - 240,
    align: 'LEFT',
    lineHeight: 56,
  });

  // Accent line before attribution
  const attrY = SLIDE_H * 0.66;
  createAccentLine(frame, {
    x: PADDING + 120,
    y: attrY,
    w: 50,
    h: 3,
    color: theme.colors.accent,
    cornerRadius: 2,
  });

  // Attribution (first body line is the source)
  const attribution = slide.bodyLines[0] ?? '';
  if (attribution) {
    createStyledText(frame, {
      text: attribution,
      font: fonts.body,
      fontSize: 20,
      color: theme.colors.text,
      x: PADDING + 120,
      y: attrY + 16,
      w: SLIDE_W - PADDING * 2 - 240,
      align: 'LEFT',
      opacity: 0.6,
    });
  }

  // Secondary context (second body line)
  const context = slide.bodyLines[1] ?? '';
  if (context) {
    createStyledText(frame, {
      text: context,
      font: fonts.body,
      fontSize: 16,
      color: theme.colors.text,
      x: PADDING + 120,
      y: attrY + 48,
      w: SLIDE_W - PADDING * 2 - 240,
      align: 'LEFT',
      opacity: 0.45,
    });
  }
}
