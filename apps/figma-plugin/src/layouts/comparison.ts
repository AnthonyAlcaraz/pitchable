import type { FigmaExportSlideV2, ThemeConfig, LoadedFonts, FigmaStyles } from '../types';
import { createStyledText, createAccentLine, SLIDE_W, SLIDE_H, PADDING } from '../utils';
import { applySolidBackground } from '../builders/background-builder';
import { createContainerCard, createDividerLine } from '../builders/shape-builder';

/**
 * COMPARISON layout: Two-column comparison with cards.
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

  // Split body lines into two columns at "vs" or midpoint
  const lines = slide.bodyLines;
  let leftLines: string[] = [];
  let rightLines: string[] = [];
  let leftTitle = 'Before';
  let rightTitle = 'After';

  const vsIndex = lines.findIndex((l) =>
    l.toLowerCase().trim() === 'vs' || l.toLowerCase().trim() === 'vs.'
  );
  if (vsIndex > -1) {
    leftLines = lines.slice(0, vsIndex);
    rightLines = lines.slice(vsIndex + 1);
  } else {
    const mid = Math.ceil(lines.length / 2);
    leftLines = lines.slice(0, mid);
    rightLines = lines.slice(mid);
  }

  // Extract column headers if first line looks like a header
  if (leftLines.length > 0 && !leftLines[0].startsWith('-') && !leftLines[0].startsWith('\u2022')) {
    leftTitle = leftLines.shift()!;
  }
  if (rightLines.length > 0 && !rightLines[0].startsWith('-') && !rightLines[0].startsWith('\u2022')) {
    rightTitle = rightLines.shift()!;
  }

  const colW = (SLIDE_W - PADDING * 2 - 40) / 2;
  const cardY = PADDING + 80;
  const cardH = SLIDE_H - cardY - PADDING;

  // Left card
  createContainerCard(frame, {
    x: PADDING,
    y: cardY,
    w: colW,
    h: cardH,
    fill: theme.colors.surface,
    cornerRadius: 16,
    borderColor: theme.colors.border,
    borderWidth: 1,
  });

  createStyledText(frame, {
    text: leftTitle,
    font: fonts.headingBold,
    fontSize: 24,
    color: theme.colors.primary,
    x: PADDING + 24,
    y: cardY + 24,
    w: colW - 48,
  });

  let ly = cardY + 68;
  for (const line of leftLines) {
    const clean = line.replace(/^[-\u2022]\s*/, '');
    createStyledText(frame, {
      text: `\u2022 ${clean}`,
      font: fonts.body,
      fontSize: 20,
      color: theme.colors.text,
      x: PADDING + 24,
      y: ly,
      w: colW - 48,
      lineHeight: 30,
      opacity: 0.85,
    });
    ly += 38;
  }

  // Right card
  const rightX = PADDING + colW + 40;
  createContainerCard(frame, {
    x: rightX,
    y: cardY,
    w: colW,
    h: cardH,
    fill: theme.colors.surface,
    cornerRadius: 16,
    borderColor: theme.colors.primary,
    borderWidth: 2,
  });

  createStyledText(frame, {
    text: rightTitle,
    font: fonts.headingBold,
    fontSize: 24,
    color: theme.colors.primary,
    x: rightX + 24,
    y: cardY + 24,
    w: colW - 48,
  });

  let ry = cardY + 68;
  for (const line of rightLines) {
    const clean = line.replace(/^[-\u2022]\s*/, '');
    createStyledText(frame, {
      text: `\u2713 ${clean}`,
      font: fonts.body,
      fontSize: 20,
      color: theme.colors.text,
      x: rightX + 24,
      y: ry,
      w: colW - 48,
      lineHeight: 30,
      opacity: 0.85,
    });
    ry += 38;
  }

  // VS divider circle
  const vsSize = 48;
  const vsCircle = figma.createEllipse();
  vsCircle.name = 'VS Circle';
  vsCircle.resize(vsSize, vsSize);
  vsCircle.x = SLIDE_W / 2 - vsSize / 2;
  vsCircle.y = cardY + cardH / 2 - vsSize / 2;
  vsCircle.fills = [{ type: 'SOLID', color: hexToRgb(theme.colors.background) }];
  vsCircle.strokes = [{ type: 'SOLID', color: hexToRgb(theme.colors.border) }];
  vsCircle.strokeWeight = 1;
  frame.appendChild(vsCircle);

  createStyledText(frame, {
    text: 'VS',
    font: fonts.headingBold,
    fontSize: 14,
    color: theme.colors.text,
    x: SLIDE_W / 2 - vsSize / 2,
    y: cardY + cardH / 2 - 10,
    w: vsSize,
    align: 'CENTER',
    opacity: 0.5,
  });
}
