import type { ThemeConfig, FigmaStyles } from '../types';
import { hexToRgb } from '../utils';

/**
 * Create Figma local PaintStyles and TextStyles from the presentation theme.
 * Returns style references for use in layout functions.
 */
export async function applyTheme(
  theme: ThemeConfig,
  headingFont: FontName,
  bodyFont: FontName,
): Promise<FigmaStyles> {
  const paintStyles = new Map<string, PaintStyle>();
  const textStyles = new Map<string, TextStyle>();

  // Create PaintStyles for each theme color
  const colorMap: Record<string, string> = {
    'Primary': theme.colors.primary,
    'Secondary': theme.colors.secondary,
    'Accent': theme.colors.accent,
    'Background': theme.colors.background,
    'Text': theme.colors.text,
    'Surface': theme.colors.surface,
  };

  for (const [name, hex] of Object.entries(colorMap)) {
    const style = figma.createPaintStyle();
    style.name = `Pitchable/${name}`;
    style.paints = [{ type: 'SOLID', color: hexToRgb(hex) }];
    paintStyles.set(name, style);
  }

  // Create TextStyles
  const textStyleDefs = [
    { name: 'Heading/H1', font: headingFont, size: 64, lineHeight: 76 },
    { name: 'Heading/H2', font: headingFont, size: 44, lineHeight: 52 },
    { name: 'Heading/H3', font: headingFont, size: 32, lineHeight: 40 },
    { name: 'Body/Regular', font: bodyFont, size: 24, lineHeight: 38 },
    { name: 'Body/Small', font: bodyFont, size: 18, lineHeight: 28 },
    { name: 'Label/Uppercase', font: bodyFont, size: 14, lineHeight: 20 },
  ];

  for (const def of textStyleDefs) {
    const style = figma.createTextStyle();
    style.name = `Pitchable/${def.name}`;
    style.fontName = def.font;
    style.fontSize = def.size;
    style.lineHeight = { value: def.lineHeight, unit: 'PIXELS' };
    textStyles.set(def.name, style);
  }

  return { paintStyles, textStyles };
}
