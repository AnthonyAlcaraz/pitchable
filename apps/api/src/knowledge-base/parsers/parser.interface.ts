export interface ParseResult {
  text: string;
  title?: string;
  metadata?: Record<string, unknown>;
}

export interface DocumentParser {
  parse(input: Buffer | string): Promise<ParseResult>;
}
