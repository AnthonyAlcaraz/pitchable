import type { FigmaExportSlideV2, ThemeConfig, LoadedFonts, FigmaStyles } from '../types';
import { createStyledText, createAccentLine, SLIDE_W, SLIDE_H, PADDING } from '../utils';
import { applySolidBackground } from '../builders/background-builder';
import { createContainerCard } from '../builders/shape-builder';
import { renderStructuredBody } from '../builders/text-builder';

/**
 * DATA_METRICS layout: Metric cards grid with large values.
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
    fontSize: 40,
    color: theme.colors.text,
    x: PADDING,
    y: PADDING,
    w: SLIDE_W - PADDING * 2,
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

  // If structured body has metrics block, use it
  const metricsBlock = slide.structuredBody?.find((b) => b.type === 'metrics');

  if (metricsBlock && metricsBlock.type === 'metrics') {
    const items = metricsBlock.items;
    const cols = Math.min(items.length, 4);
    const rows = Math.ceil(items.length / cols);
    const cardW = (SLIDE_W - PADDING * 2 - (cols - 1) * 24) / cols;
    const cardH = 160;
    const startY = PADDING + 90;

    for (let i = 0; i < items.length; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const cx = PADDING + col * (cardW + 24);
      const cy = startY + row * (cardH + 24);

      createContainerCard(frame, {
        x: cx,
        y: cy,
        w: cardW,
        h: cardH,
        fill: theme.colors.surface,
        cornerRadius: 16,
        borderColor: theme.colors.border,
        borderWidth: 1,
      });

      // Large value
      createStyledText(frame, {
        text: items[i].value,
        font: fonts.headingBold,
        fontSize: 44,
        color: theme.colors.primary,
        x: cx + 24,
        y: cy + 24,
        w: cardW - 48,
      });

      // Label
      createStyledText(frame, {
        text: items[i].label,
        font: fonts.body,
        fontSize: 16,
        color: theme.colors.text,
        x: cx + 24,
        y: cy + 80,
        w: cardW - 48,
        opacity: 0.7,
      });

      // Change indicator
      if (items[i].change) {
        createStyledText(frame, {
          text: items[i].change!,
          font: fonts.body,
          fontSize: 14,
          color: theme.colors.success || theme.colors.primary,
          x: cx + 24,
          y: cy + 110,
          w: cardW - 48,
          opacity: 0.6,
        });
      }
    }
  } else {
    // Fallback: render body lines as metric pairs
    renderStructuredBody(frame, slide.structuredBody ?? [], theme, fonts, PADDING + 80, SLIDE_W - PADDING * 2);
  }
}
