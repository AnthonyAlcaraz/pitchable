import type { FigmaExportSlideV2, ThemeConfig, LoadedFonts, FigmaStyles } from '../types';
import { createStyledText, createAccentLine, SLIDE_W, SLIDE_H, PADDING } from '../utils';
import { applySolidBackground } from '../builders/background-builder';
import { createContainerCard } from '../builders/shape-builder';

/**
 * LOGO_WALL layout: Grid of logo placeholders with company names.
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

  // Logo names from body lines
  const logos = slide.bodyLines.map((l) => l.replace(/^[-\u2022]\s*/, '').trim()).filter(Boolean);
  const count = logos.length;
  if (count === 0) return;

  const cols = count <= 4 ? count : count <= 8 ? 4 : 5;
  const rows = Math.ceil(count / cols);
  const cardW = 180;
  const cardH = 100;
  const gapX = 32;
  const gapY = 28;
  const totalW = cols * cardW + (cols - 1) * gapX;
  const totalH = rows * cardH + (rows - 1) * gapY;
  const startX = (SLIDE_W - totalW) / 2;
  const startY = PADDING + 90 + (SLIDE_H - PADDING * 2 - 90 - totalH) / 2;

  for (let i = 0; i < count; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const cx = startX + col * (cardW + gapX);
    const cy = startY + row * (cardH + gapY);

    // Logo card
    createContainerCard(frame, {
      x: cx,
      y: cy,
      w: cardW,
      h: cardH,
      fill: theme.colors.surface,
      cornerRadius: 12,
      borderColor: theme.colors.border,
      borderWidth: 1,
    });

    // Company name centered in card
    createStyledText(frame, {
      text: logos[i],
      font: fonts.headingBold,
      fontSize: 16,
      color: theme.colors.text,
      x: cx + 12,
      y: cy + (cardH - 20) / 2,
      w: cardW - 24,
      align: 'CENTER',
      opacity: 0.6,
    });
  }
}
