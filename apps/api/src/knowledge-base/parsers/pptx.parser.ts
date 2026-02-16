import { Injectable, Logger } from '@nestjs/common';
import { OfficeParser } from 'officeparser';
import type { OfficeContentNode, SlideMetadata } from 'officeparser';
import type { DocumentParser, ParseResult } from './parser.interface.js';

@Injectable()
export class PptxParser implements DocumentParser {
  private readonly logger = new Logger(PptxParser.name);

  async parse(input: Buffer): Promise<ParseResult> {
    try {
      const ast = await OfficeParser.parseOffice(input, { ignoreNotes: true });

      const slides = ast.content.filter((node) => node.type === 'slide');

      if (slides.length === 0) {
        // Fallback to plain text if no slide structure detected
        return {
          text: ast.toText(),
          title: ast.metadata?.title ?? undefined,
          metadata: { slideCount: 0 },
        };
      }

      const sections: string[] = [];

      for (const slide of slides) {
        const meta = slide.metadata as SlideMetadata | undefined;
        const slideNum = meta?.slideNumber ?? sections.length + 1;
        const slideTitle = this.extractSlideTitle(slide);
        const heading = slideTitle
          ? `## Slide ${slideNum}: ${slideTitle}`
          : `## Slide ${slideNum}`;

        const bodyText = this.extractText(slide).trim();
        if (bodyText) {
          sections.push(`${heading}\n\n${bodyText}`);
        } else {
          sections.push(heading);
        }
      }

      const text = sections.join('\n\n');

      this.logger.log(
        `Parsed PPTX: ${slides.length} slides, ${text.length} chars`,
      );

      return {
        text,
        title: ast.metadata?.title ?? undefined,
        metadata: {
          slideCount: slides.length,
          author: ast.metadata?.author,
        },
      };
    } catch (error) {
      throw new Error(
        `PPTX parsing failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Extract the first heading or first text line as slide title.
   */
  private extractSlideTitle(slide: OfficeContentNode): string | undefined {
    if (!slide.children) return undefined;

    for (const child of slide.children) {
      if (child.type === 'heading' && child.text?.trim()) {
        return child.text.trim();
      }
    }

    // Fall back to first non-empty paragraph text
    for (const child of slide.children) {
      if (child.type === 'paragraph' && child.text?.trim()) {
        return child.text.trim();
      }
    }

    return undefined;
  }

  /**
   * Recursively extract text from a content node, skipping the title line.
   */
  private extractText(node: OfficeContentNode): string {
    if (!node.children || node.children.length === 0) {
      return node.text ?? '';
    }

    const parts: string[] = [];
    let skippedTitle = false;

    for (const child of node.children) {
      // Skip the first heading/paragraph (already used as title)
      if (!skippedTitle && (child.type === 'heading' || child.type === 'paragraph') && child.text?.trim()) {
        skippedTitle = true;
        continue;
      }

      if (child.type === 'table') {
        parts.push(this.tableToMarkdown(child));
      } else if (child.type === 'list') {
        parts.push(this.listToText(child));
      } else if (child.text?.trim()) {
        parts.push(child.text.trim());
      } else if (child.children) {
        const nested = this.extractText(child);
        if (nested.trim()) parts.push(nested.trim());
      }
    }

    return parts.join('\n');
  }

  private tableToMarkdown(table: OfficeContentNode): string {
    if (!table.children) return '';

    const rows: string[][] = [];
    for (const row of table.children) {
      if (row.type !== 'row' || !row.children) continue;
      const cells = row.children.map((cell) => (cell.text ?? '').trim());
      rows.push(cells);
    }

    if (rows.length === 0) return '';

    const maxCols = Math.max(...rows.map((r) => r.length));
    const normalized = rows.map((r) => {
      while (r.length < maxCols) r.push('');
      return r.map((c) => c.replace(/\|/g, '\\|'));
    });

    const header = `| ${normalized[0].join(' | ')} |`;
    const sep = `| ${normalized[0].map(() => '---').join(' | ')} |`;
    const body = normalized
      .slice(1)
      .map((r) => `| ${r.join(' | ')} |`)
      .join('\n');

    return [header, sep, body].join('\n');
  }

  private listToText(list: OfficeContentNode): string {
    if (!list.children) return list.text ?? '';
    return list.children
      .map((item) => `- ${(item.text ?? '').trim()}`)
      .join('\n');
  }
}
