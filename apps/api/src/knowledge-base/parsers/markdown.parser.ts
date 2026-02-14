import { Injectable, Logger } from '@nestjs/common';
import { marked, type Tokens } from 'marked';
import type { DocumentParser, ParseResult } from './parser.interface.js';

@Injectable()
export class MarkdownParser implements DocumentParser {
  private readonly logger = new Logger(MarkdownParser.name);

  async parse(input: Buffer | string): Promise<ParseResult> {
    const text = typeof input === 'string' ? input : input.toString('utf-8');
    try {
      const tokens = marked.lexer(text);
      let title: string | undefined;
      for (const token of tokens) {
        if (token.type === 'heading' && (token as Tokens.Heading).depth === 1) {
          title = (token as Tokens.Heading).text;
          break;
        }
      }
      this.logger.log(`Parsed Markdown: ${text.length} chars`);
      return { text, title };
    } catch (error) {
      throw new Error(`Markdown parsing failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
