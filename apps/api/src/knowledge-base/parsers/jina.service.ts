import { Injectable, Logger } from '@nestjs/common';

export interface JinaReaderResult {
  markdown: string;
  title: string;
  description: string;
}

@Injectable()
export class JinaReaderService {
  private readonly logger = new Logger(JinaReaderService.name);

  async extractPage(url: string): Promise<JinaReaderResult> {
    const response = await fetch(`https://r.jina.ai/${url}`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(60000),
    });

    if (!response.ok) {
      throw new Error(`Jina Reader HTTP ${response.status}: ${response.statusText}`);
    }

    const json = (await response.json()) as {
      code: number;
      data: { content: string; title: string; description: string };
    };

    if (!json.data?.content) {
      throw new Error('Jina Reader returned empty content');
    }

    this.logger.log(`Jina Reader extracted "${json.data.title}" (${json.data.content.length} chars) from ${url}`);

    return {
      markdown: json.data.content,
      title: json.data.title || '',
      description: json.data.description || '',
    };
  }
}
