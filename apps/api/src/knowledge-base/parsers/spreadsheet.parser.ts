import { Injectable, Logger } from '@nestjs/common';
import * as XLSX from 'xlsx';
import type { DocumentParser, ParseResult } from './parser.interface.js';

@Injectable()
export class SpreadsheetParser implements DocumentParser {
  private readonly logger = new Logger(SpreadsheetParser.name);

  async parse(input: Buffer): Promise<ParseResult> {
    try {
      const workbook = XLSX.read(input, { type: 'buffer' });
      const sheetNames = workbook.SheetNames;

      if (sheetNames.length === 0) {
        throw new Error('Spreadsheet contains no sheets');
      }

      const sections: string[] = [];

      for (const name of sheetNames) {
        const sheet = workbook.Sheets[name];
        if (!sheet) continue;

        const rows: string[][] = XLSX.utils.sheet_to_json(sheet, {
          header: 1,
          defval: '',
        }) as string[][];

        // Skip empty sheets
        const nonEmptyRows = rows.filter((r) =>
          r.some((cell) => String(cell).trim() !== ''),
        );
        if (nonEmptyRows.length === 0) continue;

        // Build Markdown table
        const heading =
          sheetNames.length > 1 ? `## ${name}\n\n` : '';

        const mdTable = this.rowsToMarkdownTable(nonEmptyRows);
        sections.push(`${heading}${mdTable}`);
      }

      const text = sections.join('\n\n');
      this.logger.log(
        `Parsed spreadsheet: ${sheetNames.length} sheets, ${text.length} chars`,
      );

      return {
        text,
        title: sheetNames[0],
        metadata: {
          sheetCount: sheetNames.length,
          sheetNames,
        },
      };
    } catch (error) {
      throw new Error(
        `Spreadsheet parsing failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private rowsToMarkdownTable(rows: string[][]): string {
    if (rows.length === 0) return '';

    // Normalize column count
    const maxCols = Math.max(...rows.map((r) => r.length));
    const normalized = rows.map((row) => {
      const padded = [...row];
      while (padded.length < maxCols) padded.push('');
      return padded.map((cell) => String(cell).replace(/\|/g, '\\|').trim());
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
