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

    // Marp frontmatter with Z4-quality CSS
    const frontmatter = [
      '---',
      'marp: true',
      'theme: uncover',
      'paginate: true',
      'style: |',
      '  section {',
      `    background-color: ${palette.background};`,
      `    color: ${palette.text};`,
      `    font-family: '${theme.bodyFont}', sans-serif;`,
      '    font-size: 28px;',
      '  }',
      '  h1, h2, h3, h4, h5, h6 {',
      `    color: ${palette.primary};`,
      `    font-family: '${theme.headingFont}', sans-serif;`,
      '  }',
      '  h1 { font-size: 1.8em; }',
      '  h2 { font-size: 1.4em; }',
      '  strong {',
      `    color: ${palette.accent};`,
      '  }',
      '  em {',
      `    color: ${palette.secondary};`,
      '  }',
      '  a {',
      `    color: ${palette.accent};`,
      '    text-decoration: none;',
      '  }',
      '  blockquote {',
      `    border-left: 4px solid ${palette.accent};`,
      `    color: ${palette.secondary};`,
      '    padding-left: 1em;',
      '    font-style: italic;',
      '    font-size: 0.95em;',
      '  }',
      '  table {',
      '    width: 100%;',
      '    border-collapse: collapse;',
      '    font-size: 0.85em;',
      '  }',
      '  th {',
      `    background-color: ${palette.surface};`,
      `    color: ${palette.primary};`,
      `    border-bottom: 2px solid ${palette.border};`,
      '    padding: 8px 12px;',
      '    text-align: left;',
      '  }',
      '  td {',
      `    border-bottom: 1px solid ${palette.border};`,
      '    padding: 6px 12px;',
      '  }',
      '  tr:nth-child(even) td {',
      `    background-color: ${palette.surface};`,
      '  }',
      '  code {',
      `    background-color: ${palette.surface};`,
      '    padding: 0.2em 0.4em;',
      '    border-radius: 4px;',
      '    font-size: 0.85em;',
      '  }',
      '  .source {',
      '    font-size: 0.5em;',
      `    color: ${palette.secondary};`,
      '    position: absolute;',
      '    bottom: 20px;',
      '  }',
      '  section.lead {',
      '    text-align: center;',
      '    display: flex;',
      '    flex-direction: column;',
      '    justify-content: center;',
      '  }',
      '  section.lead h1 {',
      '    font-size: 2.2em;',
      '  }',
      '  section::after {',
      `    color: ${palette.border};`,
      '    font-size: 0.6em;',
      '  }',
      '  ul { list-style-type: disc; }',
      '  ul ul { list-style-type: circle; }',
      '  li { margin-bottom: 0.3em; }',
      '---',
    ];

    sections.push(frontmatter.join('\n'));

    const sortedSlides = [...slides].sort(
      (a, b) => a.slideNumber - b.slideNumber,
    );

    for (const slide of sortedSlides) {
      sections.push(this.buildSlideMarkdown(slide));
    }

    return sections.join('\n\n---\n\n');
  }

  private buildSlideMarkdown(slide: SlideModel): string {
    const lines: string[] = [];
    const type = slide.slideType;

    // Slide-type-specific Marp directives
    if (type === 'TITLE' || type === 'CTA') {
      lines.push('<!-- _class: lead -->');
      lines.push('<!-- _paginate: false -->');
      lines.push('');
    }

    // Title
    if (slide.title) {
      lines.push(`# ${slide.title}`);
      lines.push('');
    }

    // Image placement — varies by slide type
    if (slide.imageUrl) {
      if (type === 'TITLE' || type === 'CTA') {
        // Full background image at low opacity for hero slides
        lines.push(`![bg opacity:0.15](${slide.imageUrl})`);
      } else if (type === 'ARCHITECTURE') {
        // Full-width image below title
        lines.push(`![w:90%](${slide.imageUrl})`);
      } else {
        // Standard right-side image
        lines.push(`![bg right:35%](${slide.imageUrl})`);
      }
      lines.push('');
    }

    // Body content — varies by slide type
    if (slide.body) {
      if (type === 'QUOTE') {
        // Wrap body in blockquote
        const quoteLines = slide.body
          .split('\n')
          .filter((l) => l.trim())
          .map((l) => `> ${l.replace(/^[-*]\s+/, '')}`);
        lines.push(quoteLines.join('\n'));
      } else {
        lines.push(slide.body);
      }
      lines.push('');
    }

    // Speaker notes
    if (slide.speakerNotes) {
      lines.push('<!--');
      lines.push(slide.speakerNotes);
      lines.push('-->');
    }

    return lines.join('\n');
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
