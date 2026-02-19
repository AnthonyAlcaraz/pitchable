import type { FigmaExportSlideV2, ThemeConfig, LoadedFonts, FigmaStyles } from '../types';
import { createStyledText, createAccentLine, SLIDE_W, SLIDE_H, PADDING } from '../utils';
import { applySolidBackground } from '../builders/background-builder';
import { placeImageWithShadow } from '../builders/image-builder';
import { renderStructuredBody } from '../builders/text-builder';

/**
 * ARCHITECTURE layout: Full-width diagram with title and description.
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
    fontSize: 36,
    color: theme.colors.text,
    x: PADDING,
    y: PADDING,
    w: SLIDE_W - PADDING * 2,
    lineHeight: 44,
  });

  createAccentLine(frame, {
    x: PADDING,
    y: PADDING + 50,
    w: 50,
    h: 3,
    color: theme.colors.accent,
    cornerRadius: 2,
  });

  // Diagram image (full width, centered)
  if (slide.imageUrl) {
    const imgY = PADDING + 70;
    const imgH = SLIDE_H - imgY - PADDING - 20;
    await placeImageWithShadow(frame, slide.imageUrl, {
      x: PADDING,
      y: imgY,
      w: SLIDE_W - PADDING * 2,
      h: imgH,
      cornerRadius: 12,
    }, theme.colors.surface);
  } else if (slide.structuredBody?.length) {
    // No image — show body content
    renderStructuredBody(frame, slide.structuredBody, theme, fonts, PADDING + 74, SLIDE_W - PADDING * 2);
  } else {
    let y = PADDING + 74;
    for (const line of slide.bodyLines) {
      createStyledText(frame, {
        text: line,
        font: fonts.body,
        fontSize: 22,
        color: theme.colors.text,
        x: PADDING,
        y,
        w: SLIDE_W - PADDING * 2,
        lineHeight: 34,
        opacity: 0.85,
      });
      y += 42;
    }
  }
}
