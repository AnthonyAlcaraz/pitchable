import type { FigmaExportSlideV2, ThemeConfig, LoadedFonts, FigmaStyles } from '../types';
import { createStyledText, createAccentLine, SLIDE_W, SLIDE_H, PADDING } from '../utils';
import { applySolidBackground, addRadialGlow } from '../builders/background-builder';

/**
 * OUTLINE layout: Table of contents style with numbered sections.
 */
export async function layout(
  frame: FrameNode,
  slide: FigmaExportSlideV2,
  theme: ThemeConfig,
  fonts: LoadedFonts,
  _styles: FigmaStyles,
): Promise<void> {
  applySolidBackground(frame, theme.colors.background);
  addRadialGlow(frame, theme.colors.primary, { x: 0.8, y: 0.3, size: 500, opacity: 0.04 });

  // Title
  createStyledText(frame, {
    text: slide.title,
    font: fonts.headingBold,
    fontSize: 44,
    color: theme.colors.text,
    x: PADDING,
    y: PADDING,
    w: SLIDE_W - PADDING * 2,
    lineHeight: 52,
  });

  createAccentLine(frame, {
    x: PADDING,
    y: PADDING + 60,
    w: 50,
    h: 3,
    color: theme.colors.accent,
    cornerRadius: 2,
  });

  // Section items
  let y = PADDING + 90;
  const lineH = 56;

  for (let i = 0; i < slide.bodyLines.length; i++) {
    const text = slide.bodyLines[i].replace(/^\d+\.\s*/, '');

    // Number
    createStyledText(frame, {
      text: `${String(i + 1).padStart(2, '0')}`,
      font: fonts.headingBold,
      fontSize: 20,
      color: theme.colors.primary,
      x: PADDING,
      y,
      w: 60,
      opacity: 0.5,
    });

    // Section name
    createStyledText(frame, {
      text: text,
      font: fonts.heading,
      fontSize: 24,
      color: theme.colors.text,
      x: PADDING + 60,
      y,
      w: SLIDE_W - PADDING * 2 - 60,
      lineHeight: 32,
    });

    // Subtle divider
    if (i < slide.bodyLines.length - 1) {
      createAccentLine(frame, {
        x: PADDING + 60,
        y: y + 40,
        w: SLIDE_W - PADDING * 2 - 60,
        h: 1,
        color: theme.colors.border,
      });
    }

    y += lineH;
  }
}
