/**
 * Sanitize a filename by removing dangerous characters.
 * Strips control chars, path separators, double dots; limits to 255 chars.
 */
export function sanitizeFilename(filename: string): string {
  return filename
    // Remove control characters
    .replace(/[\x00-\x1f\x80-\x9f]/g, '')
    // Remove path separators
    .replace(/[/\\]/g, '')
    // Remove double dots (directory traversal)
    .replace(/\.\./g, '.')
    // Trim leading/trailing whitespace and dots
    .replace(/^[\s.]+|[\s.]+$/g, '')
    // Limit length
    .slice(0, 255)
    || 'untitled';
}
