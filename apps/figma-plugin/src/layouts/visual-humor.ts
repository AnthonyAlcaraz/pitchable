import type { FigmaExportSlideV2, ThemeConfig, LoadedFonts, FigmaStyles } from '../types';
import { createStyledText, SLIDE_W, SLIDE_H, PADDING } from '../utils';
import { placeBackgroundImage } from '../builders/image-builder';
import { addDarkOverlay } from '../builders/background-builder';

/**
 * VISUAL_HUMOR layout: Full-bleed image with dark overlay and centered title.
 */
export async function layout(
  frame: FrameNode,
  slide: FigmaExportSlideV2,
  theme: ThemeConfig,
  fonts: LoadedFonts,
  _styles: FigmaStyles,
): Promise<void> {
  // Full-bleed background image
  if (slide.imageUrl) {
    await placeBackgroundImage(frame, slide.imageUrl, 0.85);
  }

  // Dark gradient overlay for text readability
  addDarkOverlay(frame, 0.6);

  // Centered title (short, witty)
  createStyledText(frame, {
    text: slide.title,
    font: fonts.headingBold,
    fontSize: 56,
    color: '#FFFFFF',
    x: PADDING + 60,
    y: SLIDE_H * 0.4,
    w: SLIDE_W - PADDING * 2 - 120,
    align: 'CENTER',
    lineHeight: 68,
  });

  // Optional punchline subtitle
  const subtitle = slide.bodyLines[0] ?? '';
  if (subtitle) {
    createStyledText(frame, {
      text: subtitle,
      font: fonts.body,
      fontSize: 24,
      color: '#FFFFFF',
      x: PADDING + 120,
      y: SLIDE_H * 0.4 + 90,
      w: SLIDE_W - PADDING * 2 - 240,
      align: 'CENTER',
      lineHeight: 36,
      opacity: 0.8,
    });
  }
}
