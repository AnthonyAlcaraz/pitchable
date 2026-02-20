import { FileValidator } from '@nestjs/common';

/**
 * Custom file validator that checks both magic-bytes MIME type and file extension.
 * NestJS's built-in FileTypeValidator uses the `file-type` npm package which only
 * detects binary formats (PDF, DOCX, etc.) via magic bytes. Text-based files
 * (TXT, MD, CSV) have no magic bytes and always fail.
 *
 * This validator accepts files if EITHER:
 * 1. The detected MIME type matches the allowed pattern, OR
 * 2. The file extension is in the allowed list
 */

const ALLOWED_EXTENSIONS = new Set([
  '.pdf',
  '.docx',
  '.xlsx',
  '.pptx',
  '.xls',
  '.csv',
  '.txt',
  '.md',
  '.markdown',
  '.text',
]);

const ALLOWED_MIME_PATTERN =
  /(pdf|vnd\.openxmlformats-officedocument\.wordprocessingml\.document|vnd\.openxmlformats-officedocument\.spreadsheetml\.sheet|vnd\.openxmlformats-officedocument\.presentationml\.presentation|vnd\.ms-excel|csv|plain|markdown|text)/;

export class DocumentFileValidator extends FileValidator {
  constructor() {
    super({});
  }

  isValid(file?: Express.Multer.File): boolean {
    if (!file) return false;

    // Check MIME type first (works for binary files like PDF, DOCX)
    if (file.mimetype && ALLOWED_MIME_PATTERN.test(file.mimetype)) {
      return true;
    }

    // Fallback: check file extension (works for text files like TXT, MD, CSV)
    if (file.originalname) {
      const ext = file.originalname.toLowerCase().slice(file.originalname.lastIndexOf('.'));
      if (ALLOWED_EXTENSIONS.has(ext)) {
        return true;
      }
    }

    return false;
  }

  buildErrorMessage(): string {
    return `Unsupported file type. Allowed: PDF, DOCX, XLSX, PPTX, CSV, TXT, MD`;
  }
}
