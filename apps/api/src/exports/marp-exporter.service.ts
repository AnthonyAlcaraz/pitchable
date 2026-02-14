import { Injectable, Logger } from '@nestjs/common';
import { execFile } from 'child_process';
import { writeFile, mkdir } from 'fs/promises';
import { dirname, resolve } from 'path';
import { promisify } from 'util';
import type { PresentationModel } from '../../generated/prisma/models/Presentation.js';
import type { SlideModel } from '../../generated/prisma/models/Slide.js';
import type { ThemeModel } from '../../generated/prisma/models/Theme.js';

const execFileAsync = promisify(execFile);

interface ColorPalette {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  text: string;
  surface: string;
  border: string;
  success: string;
  warning: string;
  error: string;
}

@Injectable()
export class MarpExporterService {
  private readonly logger = new Logger(MarpExporterService.name);

  generateMarpMarkdown(
    presentation: PresentationModel,
    slides: SlideModel[],
    theme: ThemeModel,
  ): string {
    const palette = theme.colorPalette as unknown as ColorPalette;
    const sections: string[] = [];

    // Marp frontmatter with custom theme CSS
    const frontmatter = [
      '---',
      'marp: true',
      'theme: uncover',
      'style: |',
      '  section {',
      `    background-color: ${palette.background};`,
      `    color: ${palette.text};`,
      `    font-family: '${theme.bodyFont}', sans-serif;`,
      '  }',
      '  h1, h2, h3, h4, h5, h6 {',
      `    color: ${palette.primary};`,
      `    font-family: '${theme.headingFont}', sans-serif;`,
      '  }',
      '  a {',
      `    color: ${palette.accent};`,
      '  }',
      '  blockquote {',
      `    border-left: 4px solid ${palette.accent};`,
      `    color: ${palette.secondary};`,
      '    padding-left: 1em;',
      '  }',
      '  table {',
      '    width: 100%;',
      '  }',
      '  th {',
      `    background-color: ${palette.surface};`,
      `    color: ${palette.primary};`,
      `    border-bottom: 2px solid ${palette.border};`,
      '  }',
      '  td {',
      `    border-bottom: 1px solid ${palette.border};`,
      '  }',
      '  code {',
      `    background-color: ${palette.surface};`,
      '    padding: 0.2em 0.4em;',
      '    border-radius: 4px;',
      '  }',
      '---',
    ];

    sections.push(frontmatter.join('\n'));

    const sortedSlides = [...slides].sort(
      (a, b) => a.slideNumber - b.slideNumber,
    );

    for (const slide of sortedSlides) {
      const slideLines: string[] = [];

      // Title
      if (slide.title) {
        slideLines.push(`# ${slide.title}`);
        slideLines.push('');
      }

      // Image placement
      if (slide.imageUrl) {
        slideLines.push(`![bg right:35%](${slide.imageUrl})`);
        slideLines.push('');
      }

      // Body content
      if (slide.body) {
        slideLines.push(slide.body);
        slideLines.push('');
      }

      // Speaker notes
      if (slide.speakerNotes) {
        slideLines.push('<!--');
        slideLines.push(slide.speakerNotes);
        slideLines.push('-->');
      }

      sections.push(slideLines.join('\n'));
    }

    return sections.join('\n\n---\n\n');
  }

  async exportToPptx(
    marpMarkdown: string,
    outputPath: string,
  ): Promise<string> {
    const resolvedOutput = resolve(outputPath);
    const tempDir = dirname(resolvedOutput);
    await mkdir(tempDir, { recursive: true });

    const tempMdPath = resolvedOutput.replace(/\.pptx$/, '.md');
    await writeFile(tempMdPath, marpMarkdown, 'utf-8');

    try {
      await execFileAsync('npx', [
        '@marp-team/marp-cli',
        tempMdPath,
        '--pptx',
        '-o',
        resolvedOutput,
      ], { timeout: 120_000 });

      this.logger.log(`PPTX exported to ${resolvedOutput}`);
      return resolvedOutput;
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Unknown export error';
      this.logger.error(`PPTX export failed: ${message}`);
      throw new Error(`PPTX export failed: ${message}`);
    }
  }

  async exportToPdf(
    marpMarkdown: string,
    outputPath: string,
  ): Promise<string> {
    const resolvedOutput = resolve(outputPath);
    const tempDir = dirname(resolvedOutput);
    await mkdir(tempDir, { recursive: true });

    const tempMdPath = resolvedOutput.replace(/\.pdf$/, '.md');
    await writeFile(tempMdPath, marpMarkdown, 'utf-8');

    try {
      await execFileAsync('npx', [
        '@marp-team/marp-cli',
        tempMdPath,
        '--pdf',
        '-o',
        resolvedOutput,
      ], { timeout: 120_000 });

      this.logger.log(`PDF exported to ${resolvedOutput}`);
      return resolvedOutput;
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Unknown export error';
      this.logger.error(`PDF export failed: ${message}`);
      throw new Error(`PDF export failed: ${message}`);
    }
  }
}
