import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue, Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service.js';
import { FirecrawlService } from './parsers/firecrawl.service.js';
import { CreditsService } from '../credits/credits.service.js';
import { EventsGateway } from '../events/events.gateway.js';
import { BriefStatus, CreditReason, DocumentSourceType, DocumentStatus } from '../../generated/prisma/enums.js';
import type { DocumentProcessingJobData } from './knowledge-base.service.js';

export interface WebsiteCrawlJobData {
  userId: string;
  briefId: string;
  url: string;
  maxPages: number;
  maxDepth: number;
}

@Processor('website-crawl')
export class WebsiteCrawlProcessor extends WorkerHost {
  private readonly logger = new Logger(WebsiteCrawlProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly firecrawl: FirecrawlService,
    private readonly credits: CreditsService,
    private readonly events: EventsGateway,
    @InjectQueue('document-processing') private readonly docQueue: Queue,
  ) {
    super();
  }

  async process(job: Job<WebsiteCrawlJobData>): Promise<void> {
    const { userId, briefId, url, maxPages, maxDepth } = job.data;
    this.logger.log(`Website crawl started: url=${url}, maxPages=${maxPages}, briefId=${briefId}`);

    try {
      // 1. Crawl website via Firecrawl
      const result = await this.firecrawl.crawlWebsite(url, { maxPages, maxDepth });

      if (result.pages.length === 0) {
        this.logger.warn(`Crawl returned 0 pages for ${url}`);
        return;
      }

      this.logger.log(`Crawl complete: ${result.pages.length} pages from ${url}`);

      // 2. Create a Document for each crawled page and queue processing
      for (const page of result.pages) {
        const document = await this.prisma.document.create({
          data: {
            userId,
            briefId,
            title: page.title,
            sourceType: DocumentSourceType.URL,
            sourceUrl: page.url,
            status: DocumentStatus.UPLOADED,
          },
        });

        // Queue document processing (text-based, since we already have the markdown)
        await this.docQueue.add('process-document', {
          documentId: document.id,
          userId,
          sourceType: 'TEXT',
          rawText: page.markdown,
        } satisfies DocumentProcessingJobData);

        this.logger.log(`Crawled page ${page.url} → document ${document.id}`);
      }

      // 3. Update brief document count and status
      const docCount = await this.prisma.document.count({ where: { briefId } });
      await this.prisma.pitchBrief.update({
        where: { id: briefId },
        data: {
          documentCount: docCount,
          status: BriefStatus.PROCESSING,
        },
      });

      // 4. Deduct credits: 1 credit per 5 pages (ceil)
      const creditCost = Math.ceil(result.pages.length / 5);
      await this.credits.deductCredits(
        userId,
        creditCost,
        CreditReason.WEBSITE_CRAWL,
        briefId,
      );

      this.logger.log(
        `Website crawl complete for brief ${briefId}: ${result.pages.length} pages, ${creditCost} credits charged`,
      );
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Website crawl failed for ${url}: ${msg}`);
      throw error;
    }
  }
}
