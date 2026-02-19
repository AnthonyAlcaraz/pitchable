import type { FigmaExportSlideV2, ThemeConfig, LoadedFonts, FigmaStyles } from '../types';
import { createStyledText, createAccentLine, SLIDE_W, SLIDE_H, PADDING } from '../utils';
import { applySolidBackground, addRadialGlow } from '../builders/background-builder';
import { placeImageWithShadow } from '../builders/image-builder';

/**
 * PRODUCT_SHOWCASE layout: Large product image with feature list.
 */
export async function layout(
  frame: FrameNode,
  slide: FigmaExportSlideV2,
  theme: ThemeConfig,
  fonts: LoadedFonts,
  _styles: FigmaStyles,
): Promise<void> {
  applySolidBackground(frame, theme.colors.background);
  addRadialGlow(frame, theme.colors.primary, { x: 0.4, y: 0.5, size: 700, opacity: 0.06 });

  // Title
  createStyledText(frame, {
    text: slide.title,
    font: fonts.headingBold,
    fontSize: 40,
    color: theme.colors.text,
    x: PADDING,
    y: PADDING,
    w: SLIDE_W * 0.5,
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

  // Feature list (left side)
  let y = PADDING + 80;
  for (const line of slide.bodyLines) {
    createStyledText(frame, {
      text: `\u2713 ${line.replace(/^[-\u2022]\s*/, '')}`,
      font: fonts.body,
      fontSize: 20,
      color: theme.colors.text,
      x: PADDING,
      y,
      w: SLIDE_W * 0.42,
      lineHeight: 30,
      opacity: 0.85,
    });
    y += 38;
  }

  // Product image (right side, large with shadow)
  if (slide.imageUrl) {
    const imgW = SLIDE_W * 0.48;
    const imgH = SLIDE_H - PADDING * 2 - 40;
    await placeImageWithShadow(frame, slide.imageUrl, {
      x: SLIDE_W - PADDING - imgW,
      y: PADDING + 20,
      w: imgW,
      h: imgH,
      cornerRadius: 20,
    }, theme.colors.surface);
  }
}
