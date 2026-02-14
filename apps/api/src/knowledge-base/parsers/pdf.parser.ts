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
      const text = textResult.text;
      await parser.destroy();

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
}
