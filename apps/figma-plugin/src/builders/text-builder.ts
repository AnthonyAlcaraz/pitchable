import type { StructuredBodyBlock, ThemeConfig, LoadedFonts } from '../types';
import { createStyledText, SLIDE_W, SLIDE_H, PADDING } from '../utils';

/**
 * Render structured body blocks into a frame with rich text formatting.
 */
export function renderStructuredBody(
  frame: FrameNode,
  blocks: StructuredBodyBlock[],
  theme: ThemeConfig,
  fonts: LoadedFonts,
  startY: number,
  maxWidth: number,
  startX: number = PADDING,
): number {
  let y = startY;

  for (const block of blocks) {
    switch (block.type) {
      case 'subheading': {
        createStyledText(frame, {
          text: block.text,
          font: fonts.headingBold,
          fontSize: 28,
          color: theme.colors.primary,
          x: startX,
          y,
          w: maxWidth,
          lineHeight: 36,
        });
        y += 44;
        break;
      }

      case 'paragraph': {
        createStyledText(frame, {
          text: block.text,
          font: fonts.body,
          fontSize: 24,
          color: theme.colors.text,
          x: startX,
          y,
          w: maxWidth,
          lineHeight: 38,
          opacity: 0.85,
        });
        y += 50;
        break;
      }

      case 'bullets':
      case 'numbered': {
        for (let i = 0; i < block.items.length; i++) {
          const item = block.items[i];
          const prefix =
            block.type === 'numbered' ? `${i + 1}. ` : '• ';
          const font = item.bold ? fonts.headingBold : fonts.body;

          createStyledText(frame, {
            text: `${prefix}${item.text}`,
            font,
            fontSize: 22,
            color: theme.colors.text,
            x: startX + 20,
            y,
            w: maxWidth - 20,
            lineHeight: 34,
            opacity: 0.85,
          });
          y += 40;
        }
        y += 8;
        break;
      }

      case 'metrics': {
        const cols = Math.min(block.items.length, 4);
        const cardW = (maxWidth - (cols - 1) * 16) / cols;

        for (let i = 0; i < block.items.length; i++) {
          const item = block.items[i];
          const col = i % cols;
          const row = Math.floor(i / cols);
          const cx = startX + col * (cardW + 16);
          const cy = y + row * 100;

          // Metric value (large)
          createStyledText(frame, {
            text: item.value,
            font: fonts.headingBold,
            fontSize: 36,
            color: theme.colors.primary,
            x: cx,
            y: cy,
            w: cardW,
          });

          // Metric label (small)
          createStyledText(frame, {
            text: item.label,
            font: fonts.body,
            fontSize: 16,
            color: theme.colors.text,
            x: cx,
            y: cy + 44,
            w: cardW,
            opacity: 0.7,
          });
        }
        y += Math.ceil(block.items.length / cols) * 100 + 16;
        break;
      }

      case 'table': {
        // Simplified table rendering with text nodes
        const colW = maxWidth / block.headers.length;

        // Headers
        for (let c = 0; c < block.headers.length; c++) {
          createStyledText(frame, {
            text: block.headers[c],
            font: fonts.headingBold,
            fontSize: 18,
            color: theme.colors.primary,
            x: startX + c * colW,
            y,
            w: colW - 8,
          });
        }
        y += 32;

        // Rows
        for (const row of block.rows) {
          for (let c = 0; c < row.length; c++) {
            createStyledText(frame, {
              text: row[c],
              font: fonts.body,
              fontSize: 16,
              color: theme.colors.text,
              x: startX + c * colW,
              y,
              w: colW - 8,
              opacity: 0.85,
            });
          }
          y += 28;
        }
        y += 12;
        break;
      }
    }
  }

  return y;
}
