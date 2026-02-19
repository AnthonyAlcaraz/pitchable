import type { FigmaExportSlideV2, ThemeConfig, LoadedFonts, FigmaStyles } from '../types';
import { createStyledText, createAccentLine, SLIDE_W, SLIDE_H, PADDING, hexToRgb } from '../utils';
import { applySolidBackground } from '../builders/background-builder';
import { createContainerCard, createCircle, createConnector } from '../builders/shape-builder';

/**
 * PROCESS layout: Numbered steps with horizontal connectors.
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

  // Steps from body lines
  const steps = slide.bodyLines.map((line, i) => {
    const clean = line.replace(/^\d+\.\s*/, '');
    const sep = clean.indexOf(':');
    if (sep > -1) {
      return { label: clean.slice(0, sep).trim(), desc: clean.slice(sep + 1).trim() };
    }
    return { label: `Step ${i + 1}`, desc: clean.trim() };
  });

  const count = steps.length;
  if (count === 0) return;

  const stepW = 200;
  const gap = 60;
  const totalW = count * stepW + (count - 1) * gap;
  const startX = (SLIDE_W - totalW) / 2;
  const centerY = PADDING + 80 + (SLIDE_H - PADDING * 2 - 80) / 2;
  const nodeSize = 56;

  for (let i = 0; i < count; i++) {
    const cx = startX + i * (stepW + gap) + stepW / 2;
    const nodeX = cx - nodeSize / 2;
    const nodeY = centerY - nodeSize / 2 - 40;

    // Connector line to next step
    if (i < count - 1) {
      const nextCx = startX + (i + 1) * (stepW + gap) + stepW / 2;
      createConnector(
        frame,
        cx + nodeSize / 2 + 4,
        nodeY + nodeSize / 2,
        nextCx - nodeSize / 2 - 4,
        nodeY + nodeSize / 2,
        theme.colors.border,
        2,
      );
    }

    // Step circle
    createCircle(frame, {
      x: nodeX,
      y: nodeY,
      size: nodeSize,
      fill: theme.colors.primary,
    });

    // Step number
    createStyledText(frame, {
      text: `${i + 1}`,
      font: fonts.headingBold,
      fontSize: 24,
      color: theme.colors.background,
      x: nodeX,
      y: nodeY + 14,
      w: nodeSize,
      align: 'CENTER',
    });

    // Step label
    createStyledText(frame, {
      text: steps[i].label,
      font: fonts.headingBold,
      fontSize: 18,
      color: theme.colors.text,
      x: cx - stepW / 2,
      y: nodeY + nodeSize + 16,
      w: stepW,
      align: 'CENTER',
    });

    // Step description
    createStyledText(frame, {
      text: steps[i].desc,
      font: fonts.body,
      fontSize: 14,
      color: theme.colors.text,
      x: cx - stepW / 2,
      y: nodeY + nodeSize + 44,
      w: stepW,
      align: 'CENTER',
      lineHeight: 20,
      opacity: 0.7,
    });
  }
}
