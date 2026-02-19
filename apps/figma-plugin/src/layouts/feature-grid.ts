import type { FigmaExportSlideV2, ThemeConfig, LoadedFonts, FigmaStyles } from '../types';
import { createStyledText, createAccentLine, SLIDE_W, SLIDE_H, PADDING } from '../utils';
import { applySolidBackground } from '../builders/background-builder';
import { createContainerCard } from '../builders/shape-builder';

/**
 * FEATURE_GRID layout: 2x2 or 3x2 feature cards with icon placeholders.
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
    align: 'CENTER',
    lineHeight: 48,
  });

  createAccentLine(frame, {
    x: (SLIDE_W - 60) / 2,
    y: PADDING + 56,
    w: 60,
    h: 3,
    color: theme.colors.accent,
    cornerRadius: 2,
  });

  // Parse features from body lines
  const features = slide.bodyLines.map((line) => {
    const sep = line.indexOf(':');
    if (sep > -1) {
      return { title: line.slice(0, sep).trim(), desc: line.slice(sep + 1).trim() };
    }
    return { title: line.trim(), desc: '' };
  });

  const count = features.length;
  if (count === 0) return;

  const cols = count <= 4 ? 2 : 3;
  const rows = Math.ceil(count / cols);
  const gapX = 24;
  const gapY = 24;
  const cardW = (SLIDE_W - PADDING * 2 - (cols - 1) * gapX) / cols;
  const cardH = 160;
  const totalH = rows * cardH + (rows - 1) * gapY;
  const startY = PADDING + 80 + (SLIDE_H - PADDING * 2 - 80 - totalH) / 2;

  for (let i = 0; i < count; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const cx = PADDING + col * (cardW + gapX);
    const cy = startY + row * (cardH + gapY);

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

    // Icon placeholder (small accent square)
    createAccentLine(frame, {
      x: cx + 24,
      y: cy + 24,
      w: 36,
      h: 36,
      color: theme.colors.primary,
      cornerRadius: 8,
    });

    // Feature title
    createStyledText(frame, {
      text: features[i].title,
      font: fonts.headingBold,
      fontSize: 20,
      color: theme.colors.text,
      x: cx + 24,
      y: cy + 72,
      w: cardW - 48,
    });

    // Feature description
    if (features[i].desc) {
      createStyledText(frame, {
        text: features[i].desc,
        font: fonts.body,
        fontSize: 14,
        color: theme.colors.text,
        x: cx + 24,
        y: cy + 100,
        w: cardW - 48,
        lineHeight: 20,
        opacity: 0.7,
      });
    }
  }
}
