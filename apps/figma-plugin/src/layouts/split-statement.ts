import type { FigmaExportSlideV2, ThemeConfig, LoadedFonts, FigmaStyles } from '../types';
import { createStyledText, setFill, SLIDE_W, SLIDE_H, PADDING } from '../utils';
import { addRadialGlow } from '../builders/background-builder';

/**
 * SPLIT_STATEMENT layout: Two-tone split with bold statement.
 */
export async function layout(
  frame: FrameNode,
  slide: FigmaExportSlideV2,
  theme: ThemeConfig,
  fonts: LoadedFonts,
  _styles: FigmaStyles,
): Promise<void> {
  // Left half (dark/primary)
  const leftPanel = figma.createRectangle();
  leftPanel.name = 'Left Panel';
  leftPanel.x = 0;
  leftPanel.y = 0;
  leftPanel.resize(SLIDE_W / 2, SLIDE_H);
  setFill(leftPanel, theme.colors.primary);
  frame.appendChild(leftPanel);

  // Right half (background)
  const rightPanel = figma.createRectangle();
  rightPanel.name = 'Right Panel';
  rightPanel.x = SLIDE_W / 2;
  rightPanel.y = 0;
  rightPanel.resize(SLIDE_W / 2, SLIDE_H);
  setFill(rightPanel, theme.colors.background);
  frame.appendChild(rightPanel);

  addRadialGlow(frame, theme.colors.accent, { x: 0.25, y: 0.5, size: 500, opacity: 0.08 });

  // Big statement on left panel
  createStyledText(frame, {
    text: slide.title,
    font: fonts.headingBold,
    fontSize: 48,
    color: theme.colors.background,
    x: PADDING,
    y: SLIDE_H * 0.3,
    w: SLIDE_W / 2 - PADDING * 2,
    lineHeight: 60,
  });

  // Supporting text on right panel
  let y = SLIDE_H * 0.3;
  for (const line of slide.bodyLines) {
    createStyledText(frame, {
      text: line,
      font: fonts.body,
      fontSize: 22,
      color: theme.colors.text,
      x: SLIDE_W / 2 + PADDING,
      y,
      w: SLIDE_W / 2 - PADDING * 2,
      lineHeight: 34,
      opacity: 0.85,
    });
    y += 44;
  }

  // Section label (if present)
  if (slide.sectionLabel) {
    createStyledText(frame, {
      text: slide.sectionLabel.toUpperCase(),
      font: fonts.body,
      fontSize: 14,
      color: theme.colors.background,
      x: PADDING,
      y: SLIDE_H * 0.3 - 36,
      w: SLIDE_W / 2 - PADDING * 2,
      letterSpacing: 3,
      opacity: 0.5,
    });
  }
}
