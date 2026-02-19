import type { FigmaExportSlideV2, ThemeConfig, LoadedFonts, FigmaStyles } from '../types';
import { createStyledText, createAccentLine, SLIDE_W, SLIDE_H, PADDING, hexToRgb } from '../utils';
import { applySolidBackground } from '../builders/background-builder';
import { placeImageWithShadow } from '../builders/image-builder';
import { renderStructuredBody } from '../builders/text-builder';
import { createContainerCard } from '../builders/shape-builder';

/**
 * PROBLEM layout: Left text with accent border, right image.
 */
export async function layout(
  frame: FrameNode,
  slide: FigmaExportSlideV2,
  theme: ThemeConfig,
  fonts: LoadedFonts,
  _styles: FigmaStyles,
): Promise<void> {
  applySolidBackground(frame, theme.colors.background);

  const textW = SLIDE_W * 0.52 - PADDING;
  const imgX = SLIDE_W * 0.55;
  const imgW = SLIDE_W - imgX - PADDING;

  // Left accent border
  createAccentLine(frame, {
    x: PADDING - 8,
    y: PADDING,
    w: 4,
    h: SLIDE_H - PADDING * 2,
    color: theme.colors.error || theme.colors.accent,
    cornerRadius: 2,
  });

  // Problem label
  createStyledText(frame, {
    text: 'THE PROBLEM',
    font: fonts.body,
    fontSize: 14,
    color: theme.colors.error || theme.colors.accent,
    x: PADDING + 8,
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
    x: PADDING + 8,
    y: PADDING + 32,
    w: textW - 16,
    lineHeight: 50,
  });

  // Accent underline
  createAccentLine(frame, {
    x: PADDING + 8,
    y: PADDING + 96,
    w: 50,
    h: 3,
    color: theme.colors.accent,
    cornerRadius: 2,
  });

  // Body content
  if (slide.structuredBody?.length) {
    renderStructuredBody(frame, slide.structuredBody, theme, fonts, PADDING + 116, textW - 16, PADDING + 8);
  } else {
    let y = PADDING + 116;
    for (const line of slide.bodyLines) {
      createStyledText(frame, {
        text: `\u2022 ${line}`,
        font: fonts.body,
        fontSize: 22,
        color: theme.colors.text,
        x: PADDING + 8,
        y,
        w: textW - 16,
        lineHeight: 34,
        opacity: 0.85,
      });
      y += 42;
    }
  }

  // Right image
  if (slide.imageUrl) {
    await placeImageWithShadow(frame, slide.imageUrl, {
      x: imgX,
      y: PADDING + 20,
      w: imgW,
      h: SLIDE_H - PADDING * 2 - 40,
      cornerRadius: 16,
    }, theme.colors.surface);
  }
}
