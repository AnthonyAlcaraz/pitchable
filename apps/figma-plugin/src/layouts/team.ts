import type { FigmaExportSlideV2, ThemeConfig, LoadedFonts, FigmaStyles } from '../types';
import { createStyledText, createAccentLine, SLIDE_W, SLIDE_H, PADDING } from '../utils';
import { applySolidBackground } from '../builders/background-builder';
import { createContainerCard, createCircle } from '../builders/shape-builder';

/**
 * TEAM layout: Grid of team member cards with circular avatar placeholders.
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
    fontSize: 44,
    color: theme.colors.text,
    x: PADDING,
    y: PADDING,
    w: SLIDE_W - PADDING * 2,
    align: 'CENTER',
    lineHeight: 52,
  });

  createAccentLine(frame, {
    x: (SLIDE_W - 60) / 2,
    y: PADDING + 62,
    w: 60,
    h: 3,
    color: theme.colors.accent,
    cornerRadius: 2,
  });

  // Parse team members from body lines (format: "Name - Role")
  const members = slide.bodyLines.map((line) => {
    const sep = line.indexOf(' - ');
    if (sep > -1) {
      return { name: line.slice(0, sep).trim(), role: line.slice(sep + 3).trim() };
    }
    return { name: line.trim(), role: '' };
  });

  const count = members.length;
  const cols = count <= 3 ? count : count <= 6 ? 3 : 4;
  const rows = Math.ceil(count / cols);
  const cardW = 260;
  const cardH = 220;
  const gapX = 32;
  const gapY = 24;
  const totalW = cols * cardW + (cols - 1) * gapX;
  const totalH = rows * cardH + (rows - 1) * gapY;
  const startX = (SLIDE_W - totalW) / 2;
  const startY = PADDING + 90 + (SLIDE_H - PADDING * 2 - 90 - totalH) / 2;

  for (let i = 0; i < members.length; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const cx = startX + col * (cardW + gapX);
    const cy = startY + row * (cardH + gapY);

    // Card background
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

    // Avatar circle placeholder
    const avatarSize = 64;
    createCircle(frame, {
      x: cx + (cardW - avatarSize) / 2,
      y: cy + 24,
      size: avatarSize,
      fill: theme.colors.primary,
      opacity: 0.15,
    });

    // Initials inside avatar
    const initials = members[i].name
      .split(' ')
      .map((w) => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
    createStyledText(frame, {
      text: initials,
      font: fonts.headingBold,
      fontSize: 22,
      color: theme.colors.primary,
      x: cx + (cardW - avatarSize) / 2,
      y: cy + 24 + 18,
      w: avatarSize,
      align: 'CENTER',
    });

    // Name
    createStyledText(frame, {
      text: members[i].name,
      font: fonts.headingBold,
      fontSize: 18,
      color: theme.colors.text,
      x: cx + 12,
      y: cy + 100,
      w: cardW - 24,
      align: 'CENTER',
    });

    // Role
    if (members[i].role) {
      createStyledText(frame, {
        text: members[i].role,
        font: fonts.body,
        fontSize: 14,
        color: theme.colors.text,
        x: cx + 12,
        y: cy + 128,
        w: cardW - 24,
        align: 'CENTER',
        opacity: 0.6,
      });
    }
  }
}
