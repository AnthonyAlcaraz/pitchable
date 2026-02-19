import type { FigmaExportSlideV2, ThemeConfig, LoadedFonts, FigmaStyles } from '../types';
import { createStyledText, createAccentLine, SLIDE_W, SLIDE_H, PADDING } from '../utils';
import { applySolidBackground, addRadialGlow } from '../builders/background-builder';

/**
 * SECTION_DIVIDER layout: Large centered section title with minimal decoration.
 */
export async function layout(
  frame: FrameNode,
  slide: FigmaExportSlideV2,
  theme: ThemeConfig,
  fonts: LoadedFonts,
  _styles: FigmaStyles,
): Promise<void> {
  // Solid dark/surface background
  applySolidBackground(frame, theme.colors.surface);
  addRadialGlow(frame, theme.colors.primary, { x: 0.5, y: 0.5, size: 700, opacity: 0.06 });

  // Section number (if sectionLabel is like "01" or "Section 2")
  if (slide.sectionLabel) {
    createStyledText(frame, {
      text: slide.sectionLabel.toUpperCase(),
      font: fonts.body,
      fontSize: 16,
      color: theme.colors.primary,
      x: PADDING,
      y: SLIDE_H * 0.38,
      w: SLIDE_W - PADDING * 2,
      align: 'CENTER',
      letterSpacing: 4,
      opacity: 0.6,
    });
  }

  // Accent line
  const lineW = 60;
  createAccentLine(frame, {
    x: (SLIDE_W - lineW) / 2,
    y: SLIDE_H * 0.38 + (slide.sectionLabel ? 32 : 0),
    w: lineW,
    h: 3,
    color: theme.colors.accent,
    cornerRadius: 2,
  });

  // Section title (large centered)
  createStyledText(frame, {
    text: slide.title,
    font: fonts.headingBold,
    fontSize: 56,
    color: theme.colors.text,
    x: PADDING + 60,
    y: SLIDE_H * 0.38 + (slide.sectionLabel ? 52 : 20),
    w: SLIDE_W - PADDING * 2 - 120,
    align: 'CENTER',
    lineHeight: 68,
  });

  // Optional subtitle
  const subtitle = slide.bodyLines[0] ?? '';
  if (subtitle) {
    createStyledText(frame, {
      text: subtitle,
      font: fonts.body,
      fontSize: 22,
      color: theme.colors.text,
      x: PADDING + 160,
      y: SLIDE_H * 0.38 + (slide.sectionLabel ? 135 : 103),
      w: SLIDE_W - PADDING * 2 - 320,
      align: 'CENTER',
      lineHeight: 34,
      opacity: 0.6,
    });
  }
}
