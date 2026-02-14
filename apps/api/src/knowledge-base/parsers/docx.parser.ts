import { Injectable, Logger } from '@nestjs/common';
import mammoth from 'mammoth';
import type { DocumentParser, ParseResult } from './parser.interface.js';

@Injectable()
export class DocxParser implements DocumentParser {
  private readonly logger = new Logger(DocxParser.name);

  async parse(input: Buffer): Promise<ParseResult> {
    try {
      const result = await mammoth.extractRawText({ buffer: input });
      if (result.messages.length > 0) {
        this.logger.warn(`DOCX parse warnings: ${JSON.stringify(result.messages)}`);
      }
      this.logger.log(`Parsed DOCX: ${result.value.length} chars`);
      return { text: result.value };
    } catch (error) {
      throw new Error(`DOCX parsing failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
