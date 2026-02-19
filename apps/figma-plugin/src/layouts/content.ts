import type { FigmaExportSlideV2, ThemeConfig, LoadedFonts, FigmaStyles } from '../types';
import { createStyledText, createAccentLine, SLIDE_W, SLIDE_H, PADDING } from '../utils';
import { applySolidBackground } from '../builders/background-builder';
import { placeImageWithShadow } from '../builders/image-builder';
import { renderStructuredBody } from '../builders/text-builder';

/**
 * CONTENT layout: Standard left-text, right-image split.
 */
export async function layout(
  frame: FrameNode,
  slide: FigmaExportSlideV2,
  theme: ThemeConfig,
  fonts: LoadedFonts,
  _styles: FigmaStyles,
): Promise<void> {
  applySolidBackground(frame, theme.colors.background);

  const textW = SLIDE_W * 0.55 - PADDING;
  const imgX = SLIDE_W * 0.57;
  const imgW = SLIDE_W - imgX - PADDING;

  // Title
  createStyledText(frame, {
    text: slide.title,
    font: fonts.headingBold,
    fontSize: 44,
    color: theme.colors.text,
    x: PADDING,
    y: PADDING,
    w: textW,
    lineHeight: 52,
  });

  // Accent line
  createAccentLine(frame, {
    x: PADDING,
    y: PADDING + 62,
    w: 50,
    h: 3,
    color: theme.colors.accent,
    cornerRadius: 2,
  });

  // Structured body or fallback
  if (slide.structuredBody?.length) {
    renderStructuredBody(frame, slide.structuredBody, theme, fonts, PADDING + 80, textW);
  } else {
    let y = PADDING + 84;
    for (const line of slide.bodyLines) {
      createStyledText(frame, {
        text: line,
        font: fonts.body,
        fontSize: 22,
        color: theme.colors.text,
        x: PADDING,
        y,
        w: textW,
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
