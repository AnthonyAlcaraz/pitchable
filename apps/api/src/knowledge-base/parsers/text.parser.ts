import { Injectable, Logger } from '@nestjs/common';
import type { DocumentParser, ParseResult } from './parser.interface.js';

@Injectable()
export class TextParser implements DocumentParser {
  private readonly logger = new Logger(TextParser.name);

  async parse(input: Buffer | string): Promise<ParseResult> {
    const text = typeof input === 'string' ? input : input.toString('utf-8');
    this.logger.log(`Parsed plain text: ${text.length} chars`);
    const firstLine = text.split('\n').find((l) => l.trim().length > 0)?.trim();
    return {
      text,
      title: firstLine && firstLine.length <= 100 ? firstLine : undefined,
    };
  }
}
