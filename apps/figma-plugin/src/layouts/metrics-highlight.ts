import type { FigmaExportSlideV2, ThemeConfig, LoadedFonts, FigmaStyles } from '../types';
import { createStyledText, createAccentLine, SLIDE_W, SLIDE_H, PADDING } from '../utils';
import { applySolidBackground, addRadialGlow } from '../builders/background-builder';

/**
 * METRICS_HIGHLIGHT layout: Big number hero with supporting text.
 */
export async function layout(
  frame: FrameNode,
  slide: FigmaExportSlideV2,
  theme: ThemeConfig,
  fonts: LoadedFonts,
  _styles: FigmaStyles,
): Promise<void> {
  applySolidBackground(frame, theme.colors.background);
  addRadialGlow(frame, theme.colors.primary, { x: 0.5, y: 0.4, size: 800, opacity: 0.08 });

  // Extract the big number from title or first metric
  const metricsBlock = slide.structuredBody?.find((b) => b.type === 'metrics');
  let bigValue = slide.title;
  let bigLabel = '';

  if (metricsBlock && metricsBlock.type === 'metrics' && metricsBlock.items.length > 0) {
    bigValue = metricsBlock.items[0].value;
    bigLabel = metricsBlock.items[0].label;
  }

  // Big hero number
  createStyledText(frame, {
    text: bigValue,
    font: fonts.headingBold,
    fontSize: 120,
    color: theme.colors.primary,
    x: PADDING,
    y: SLIDE_H * 0.25,
    w: SLIDE_W - PADDING * 2,
    align: 'CENTER',
    lineHeight: 130,
  });

  // Label under the number
  const labelText = bigLabel || slide.title;
  if (bigLabel || bigValue !== slide.title) {
    createStyledText(frame, {
      text: labelText,
      font: fonts.headingBold,
      fontSize: 32,
      color: theme.colors.text,
      x: PADDING + 100,
      y: SLIDE_H * 0.25 + 140,
      w: SLIDE_W - PADDING * 2 - 200,
      align: 'CENTER',
      lineHeight: 40,
    });
  }

  // Accent line
  createAccentLine(frame, {
    x: (SLIDE_W - 80) / 2,
    y: SLIDE_H * 0.25 + 200,
    w: 80,
    h: 3,
    color: theme.colors.accent,
    cornerRadius: 2,
  });

  // Supporting text
  const bodyText = slide.bodyLines.join(' ');
  if (bodyText) {
    createStyledText(frame, {
      text: bodyText,
      font: fonts.body,
      fontSize: 22,
      color: theme.colors.text,
      x: PADDING + 160,
      y: SLIDE_H * 0.25 + 224,
      w: SLIDE_W - PADDING * 2 - 320,
      align: 'CENTER',
      lineHeight: 34,
      opacity: 0.7,
    });
  }

  // Secondary metrics (if more than 1 in metrics block)
  if (metricsBlock && metricsBlock.type === 'metrics' && metricsBlock.items.length > 1) {
    const secondary = metricsBlock.items.slice(1, 4);
    const cols = secondary.length;
    const colW = (SLIDE_W - PADDING * 2 - 200) / cols;
    const secY = SLIDE_H * 0.72;

    for (let i = 0; i < secondary.length; i++) {
      const cx = PADDING + 100 + i * colW;

      createStyledText(frame, {
        text: secondary[i].value,
        font: fonts.headingBold,
        fontSize: 36,
        color: theme.colors.primary,
        x: cx,
        y: secY,
        w: colW,
        align: 'CENTER',
      });

      createStyledText(frame, {
        text: secondary[i].label,
        font: fonts.body,
        fontSize: 14,
        color: theme.colors.text,
        x: cx,
        y: secY + 44,
        w: colW,
        align: 'CENTER',
        opacity: 0.6,
      });
    }
  }
}
