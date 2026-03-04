/**
 * Per-slide layout/rendering overrides applied via chat commands.
 * Stored as JSON in Slide.layoutOverrides.
 */
export interface LayoutOverrides {
  accentColor?: string;
  backgroundColor?: string;
  textColor?: string;
  fontScale?: number; // 0.75–1.5
  imagePosition?: 'right' | 'left' | 'background' | 'hidden';
  spacing?: 'compact' | 'default' | 'spacious';
  slideType?: string;
}

const VALID_IMAGE_POSITIONS = new Set(['right', 'left', 'background', 'hidden']);
const VALID_SPACINGS = new Set(['compact', 'default', 'spacious']);
const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;

export function isValidLayoutOverrides(val: unknown): val is LayoutOverrides {
  if (typeof val !== 'object' || val === null || Array.isArray(val)) return false;
  const obj = val as Record<string, unknown>;

  if (obj.accentColor !== undefined && (typeof obj.accentColor !== 'string' || !HEX_COLOR_RE.test(obj.accentColor))) return false;
  if (obj.backgroundColor !== undefined && (typeof obj.backgroundColor !== 'string' || !HEX_COLOR_RE.test(obj.backgroundColor))) return false;
  if (obj.textColor !== undefined && (typeof obj.textColor !== 'string' || !HEX_COLOR_RE.test(obj.textColor))) return false;

  if (obj.fontScale !== undefined) {
    if (typeof obj.fontScale !== 'number' || obj.fontScale < 0.75 || obj.fontScale > 1.5) return false;
  }

  if (obj.imagePosition !== undefined && (typeof obj.imagePosition !== 'string' || !VALID_IMAGE_POSITIONS.has(obj.imagePosition))) return false;
  if (obj.spacing !== undefined && (typeof obj.spacing !== 'string' || !VALID_SPACINGS.has(obj.spacing))) return false;
  if (obj.slideType !== undefined && typeof obj.slideType !== 'string') return false;

  return true;
}
