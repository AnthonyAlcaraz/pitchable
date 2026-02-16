import { Injectable, Logger } from '@nestjs/common';
import { PDFParse } from 'pdf-parse';
import type { DocumentParser, ParseResult } from './parser.interface.js';

@Injectable()
export class PdfParser implements DocumentParser {
  private readonly logger = new Logger(PdfParser.name);

  async parse(input: Buffer): Promise<ParseResult> {
    try {
      const parser = new PDFParse({ data: input, verbosity: 0 });
      const info = await parser.getInfo();
      const textResult = await parser.getText();
      const rawText = textResult.text;
      await parser.destroy();

      const text = this.detectAndFormatTables(rawText);

      this.logger.log(`Parsed PDF: ${textResult.total} pages, ${text.length} chars`);
      return {
        text,
        title: info?.info?.Title || undefined,
        metadata: {
          pageCount: textResult.total,
          author: info?.info?.Author,
        },
      };
    } catch (error) {
      throw new Error(`PDF parsing failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Detect table-like patterns in extracted PDF text and convert to Markdown tables.
   * Looks for consecutive lines with consistent tab/multi-space column separators.
   */
  private detectAndFormatTables(text: string): string {
    const lines = text.split('\n');
    const result: string[] = [];
    let i = 0;

    while (i < lines.length) {
      const tableLines = this.collectTableLines(lines, i);

      if (tableLines.length >= 2) {
        // Convert the group to a Markdown table
        const mdTable = this.toMarkdownTable(tableLines);
        result.push('', mdTable, '');
        i += tableLines.length;
      } else {
        result.push(lines[i]);
        i++;
      }
    }

    return result.join('\n');
  }

  /**
   * Starting at index `start`, collect consecutive lines that look like table rows.
   * A table row has 2+ columns separated by tabs or 2+ consecutive spaces.
   */
  private collectTableLines(lines: string[], start: number): string[][] {
    const rows: string[][] = [];
    let colCount = 0;

    for (let i = start; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) break;

      // Split on tab or 2+ spaces
      const cells = line.split(/\t|  +/).map((c) => c.trim()).filter(Boolean);
      if (cells.length < 2) break;

      // First row sets expected column count; allow ±1 tolerance
      if (rows.length === 0) {
        colCount = cells.length;
      } else if (Math.abs(cells.length - colCount) > 1) {
        break;
      }

      rows.push(cells);
    }

    return rows;
  }

  /**
   * Convert a 2D array of cells into a Markdown table string.
   */
  private toMarkdownTable(rows: string[][]): string {
    // Normalize all rows to the same column count
    const maxCols = Math.max(...rows.map((r) => r.length));
    const normalized = rows.map((r) => {
      while (r.length < maxCols) r.push('');
      return r;
    });

    const header = `| ${normalized[0].join(' | ')} |`;
    const separator = `| ${normalized[0].map(() => '---').join(' | ')} |`;
    const body = normalized
      .slice(1)
      .map((row) => `| ${row.join(' | ')} |`)
      .join('\n');

    return [header, separator, body].join('\n');
  }
}
