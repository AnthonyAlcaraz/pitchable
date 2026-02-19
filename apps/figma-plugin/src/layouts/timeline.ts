import type { FigmaExportSlideV2, ThemeConfig, LoadedFonts, FigmaStyles } from '../types';
import { createStyledText, createAccentLine, SLIDE_W, SLIDE_H, PADDING } from '../utils';
import { applySolidBackground } from '../builders/background-builder';
import { createCircle, createDividerLine } from '../builders/shape-builder';

/**
 * TIMELINE layout: Horizontal timeline with nodes and labels.
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

  // Parse milestones from body lines
  const milestones = slide.bodyLines.map((line) => {
    const sep = line.indexOf(':');
    if (sep > -1) {
      return { date: line.slice(0, sep).trim(), text: line.slice(sep + 1).trim() };
    }
    return { date: '', text: line.trim() };
  });

  const count = milestones.length;
  if (count === 0) return;

  const lineY = SLIDE_H * 0.55;
  const lineStartX = PADDING + 40;
  const lineEndX = SLIDE_W - PADDING - 40;

  // Horizontal timeline line
  createDividerLine(frame, {
    x: lineStartX,
    y: lineY,
    w: lineEndX - lineStartX,
    color: theme.colors.border,
    thickness: 2,
  });

  const spacing = (lineEndX - lineStartX) / (count - 1 || 1);

  for (let i = 0; i < count; i++) {
    const cx = count === 1 ? SLIDE_W / 2 : lineStartX + i * spacing;
    const nodeSize = 16;
    const isActive = i === count - 1;

    // Node circle
    createCircle(frame, {
      x: cx - nodeSize / 2,
      y: lineY - nodeSize / 2 + 1,
      size: nodeSize,
      fill: isActive ? theme.colors.accent : theme.colors.primary,
    });

    // Date label (above)
    if (milestones[i].date) {
      createStyledText(frame, {
        text: milestones[i].date,
        font: fonts.headingBold,
        fontSize: 14,
        color: theme.colors.primary,
        x: cx - 80,
        y: lineY - 50,
        w: 160,
        align: 'CENTER',
        letterSpacing: 1,
      });
    }

    // Description (below)
    createStyledText(frame, {
      text: milestones[i].text,
      font: fonts.body,
      fontSize: 16,
      color: theme.colors.text,
      x: cx - 90,
      y: lineY + 24,
      w: 180,
      align: 'CENTER',
      lineHeight: 22,
      opacity: 0.8,
    });
  }
}
