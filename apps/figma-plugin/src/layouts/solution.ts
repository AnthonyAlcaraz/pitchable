import type { FigmaExportSlideV2, ThemeConfig, LoadedFonts, FigmaStyles } from '../types';
import { createStyledText, createAccentLine, SLIDE_W, SLIDE_H, PADDING } from '../utils';
import { applySolidBackground, addRadialGlow } from '../builders/background-builder';
import { placeImageWithShadow } from '../builders/image-builder';
import { renderStructuredBody } from '../builders/text-builder';

/**
 * SOLUTION layout: Left image, right text (mirror of PROBLEM).
 */
export async function layout(
  frame: FrameNode,
  slide: FigmaExportSlideV2,
  theme: ThemeConfig,
  fonts: LoadedFonts,
  _styles: FigmaStyles,
): Promise<void> {
  applySolidBackground(frame, theme.colors.background);
  addRadialGlow(frame, theme.colors.success || theme.colors.primary, { x: 0.2, y: 0.4, size: 500, opacity: 0.05 });

  const imgW = SLIDE_W * 0.42 - PADDING;
  const textX = SLIDE_W * 0.45;
  const textW = SLIDE_W - textX - PADDING;

  // Left image
  if (slide.imageUrl) {
    await placeImageWithShadow(frame, slide.imageUrl, {
      x: PADDING,
      y: PADDING + 20,
      w: imgW,
      h: SLIDE_H - PADDING * 2 - 40,
      cornerRadius: 16,
    }, theme.colors.surface);
  }

  // Solution label
  createStyledText(frame, {
    text: 'THE SOLUTION',
    font: fonts.body,
    fontSize: 14,
    color: theme.colors.success || theme.colors.primary,
    x: textX,
    y: PADDING,
    w: textW,
    letterSpacing: 3,
    opacity: 0.7,
  });

  // Title
  createStyledText(frame, {
    text: slide.title,
    font: fonts.headingBold,
    fontSize: 40,
    color: theme.colors.text,
    x: textX,
    y: PADDING + 32,
    w: textW,
    lineHeight: 50,
  });

  // Accent line
  createAccentLine(frame, {
    x: textX,
    y: PADDING + 96,
    w: 50,
    h: 3,
    color: theme.colors.accent,
    cornerRadius: 2,
  });

  // Body content
  if (slide.structuredBody?.length) {
    renderStructuredBody(frame, slide.structuredBody, theme, fonts, PADDING + 116, textW, textX);
  } else {
    let y = PADDING + 116;
    for (const line of slide.bodyLines) {
      createStyledText(frame, {
        text: `\u2713 ${line}`,
        font: fonts.body,
        fontSize: 22,
        color: theme.colors.text,
        x: textX,
        y,
        w: textW,
        lineHeight: 34,
        opacity: 0.85,
      });
      y += 42;
    }
  }
}
