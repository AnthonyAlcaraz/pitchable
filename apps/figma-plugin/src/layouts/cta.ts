import type { FigmaExportSlideV2, ThemeConfig, LoadedFonts, FigmaStyles } from '../types';
import { createStyledText, createAccentLine, SLIDE_W, SLIDE_H, PADDING, hexToRgb } from '../utils';
import { applyGradientBackground, addRadialGlow } from '../builders/background-builder';
import { createContainerCard } from '../builders/shape-builder';

/**
 * CTA layout: Centered call-to-action with accent button shape.
 */
export async function layout(
  frame: FrameNode,
  slide: FigmaExportSlideV2,
  theme: ThemeConfig,
  fonts: LoadedFonts,
  _styles: FigmaStyles,
): Promise<void> {
  // Bold gradient background
  applyGradientBackground(frame, theme.colors.background, theme.colors.surface, 135);
  addRadialGlow(frame, theme.colors.accent, { x: 0.5, y: 0.5, size: 900, opacity: 0.1 });

  // Title (large, centered)
  createStyledText(frame, {
    text: slide.title,
    font: fonts.headingBold,
    fontSize: 52,
    color: theme.colors.text,
    x: PADDING + 100,
    y: SLIDE_H * 0.28,
    w: SLIDE_W - PADDING * 2 - 200,
    align: 'CENTER',
    lineHeight: 64,
  });

  // Subtitle / body text
  const bodyText = slide.bodyLines.join('\n');
  if (bodyText) {
    createStyledText(frame, {
      text: bodyText,
      font: fonts.body,
      fontSize: 24,
      color: theme.colors.text,
      x: PADDING + 200,
      y: SLIDE_H * 0.28 + 90,
      w: SLIDE_W - PADDING * 2 - 400,
      align: 'CENTER',
      lineHeight: 38,
      opacity: 0.75,
    });
  }

  // CTA button shape
  const btnW = 320;
  const btnH = 60;
  const btnX = (SLIDE_W - btnW) / 2;
  const btnY = SLIDE_H * 0.62;

  const btn = createContainerCard(frame, {
    x: btnX,
    y: btnY,
    w: btnW,
    h: btnH,
    fill: theme.colors.primary,
    cornerRadius: btnH / 2,
  });
  btn.name = 'CTA Button';

  // Button text
  const ctaLabel = slide.bodyLines[slide.bodyLines.length - 1] || 'Get Started';
  createStyledText(frame, {
    text: ctaLabel,
    font: fonts.headingBold,
    fontSize: 20,
    color: theme.colors.background,
    x: btnX,
    y: btnY + 18,
    w: btnW,
    align: 'CENTER',
  });

  // Decorative accent lines
  const lineW = 60;
  createAccentLine(frame, {
    x: (SLIDE_W - lineW) / 2,
    y: SLIDE_H * 0.22,
    w: lineW,
    h: 3,
    color: theme.colors.accent,
    cornerRadius: 2,
  });

  // Bottom contact info area
  if (slide.sectionLabel) {
    createStyledText(frame, {
      text: slide.sectionLabel,
      font: fonts.body,
      fontSize: 16,
      color: theme.colors.text,
      x: PADDING,
      y: SLIDE_H - 80,
      w: SLIDE_W - PADDING * 2,
      align: 'CENTER',
      opacity: 0.5,
    });
  }
}
