// ─────────────────────────────────────────────────────────────
// Typography Validation Module — Design Constraint Engine
// Enforces font whitelist, size minimums, pairing rules,
// and per-deck font count limits.
// ─────────────────────────────────────────────────────────────

// ── Interfaces ──────────────────────────────────────────────

export interface FontValidationResult {
  valid: boolean;
  suggestion?: string;
}

export interface FontSizeValidationResult {
  valid: boolean;
  violations: string[];
}

export interface FontPairingResult {
  valid: boolean;
  reason?: string;
}

export interface DeckFontsResult {
  valid: boolean;
  violations: string[];
}

export interface FontSizes {
  heading?: number;
  subheading?: number;
  body?: number;
  caption?: number;
}

// ── Constants ───────────────────────────────────────────────

export const ALLOWED_FONTS: readonly string[] = [
  'Inter',
  'Roboto',
  'Open Sans',
  'Montserrat',
  'Poppins',
  'Lato',
  'Source Sans Pro',
  'Nunito Sans',
  'Work Sans',
  'DM Sans',
  'Georgia',
  'Arial',
  'Source Serif Pro',
  'Playfair Display',
  'Raleway',
  'Helvetica',
  'Garamond',
  'Libre Baskerville',
] as const;

export const BANNED_FONTS: readonly string[] = [
  'Comic Sans MS',
  'Comic Sans',
  'Papyrus',
  'Bradley Hand',
  'Curlz MT',
  'Jokerman',
  'Impact',
  'Bleeding Cowboys',
  'Courier New',
] as const;

export const FONT_SIZE_MINIMUMS: Readonly<Record<string, number>> = {
  heading: 28,
  subheading: 22,
  body: 24,
  caption: 14,
};

export const MAX_FONTS_PER_DECK = 2;

/**
 * Geometric (sans-serif) fonts that pair poorly together because
 * they look nearly identical, creating visual monotony without
 * enough typographic contrast.
 */
const GEOMETRIC_SANS_FONTS = new Set([
  'Montserrat',
  'Poppins',
  'Nunito Sans',
  'DM Sans',
]);

/**
 * Humanist / grotesque sans-serif fonts.
 */
const HUMANIST_SANS_FONTS = new Set([
  'Inter',
  'Roboto',
  'Open Sans',
  'Lato',
  'Source Sans Pro',
  'Work Sans',
]);

/**
 * Serif fonts — always pair well with any sans-serif (excellent contrast).
 */
const SERIF_FONTS = new Set(['Georgia', 'Source Serif Pro', 'Playfair Display', 'Garamond', 'Libre Baskerville']);

/**
 * System sans-serif fonts (not Google Fonts).
 */
const SYSTEM_SANS_FONTS = new Set(['Arial', 'Helvetica']);

/**
 * Display/decorative sans-serif — geometric but with distinctive character.
 */
const DISPLAY_SANS_FONTS = new Set(['Raleway']);

// ── Helpers ─────────────────────────────────────────────────

/**
 * Levenshtein distance for fuzzy font name matching.
 */
function levenshtein(a: string, b: string): number {
  const aLower = a.toLowerCase();
  const bLower = b.toLowerCase();
  const matrix: number[][] = [];

  for (let i = 0; i <= aLower.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= bLower.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= aLower.length; i++) {
    for (let j = 1; j <= bLower.length; j++) {
      const cost = aLower[i - 1] === bLower[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost,
      );
    }
  }

  return matrix[aLower.length][bLower.length];
}

function findClosestFont(font: string): string | undefined {
  let bestMatch: string | undefined;
  let bestDistance = Infinity;

  for (const allowed of ALLOWED_FONTS) {
    const distance = levenshtein(font, allowed);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestMatch = allowed;
    }
  }

  // Only suggest if the distance is reasonable (less than half the font name length)
  if (bestMatch && bestDistance <= Math.ceil(font.length / 2)) {
    return bestMatch;
  }
  return undefined;
}

function areSameCategory(font1: string, font2: string): boolean {
  // Serif + sans-serif is always a good pairing (maximum typographic contrast)
  if (SERIF_FONTS.has(font1) || SERIF_FONTS.has(font2)) {
    return false;
  }
  // Display sans + any other sans is fine (distinctive enough)
  if (DISPLAY_SANS_FONTS.has(font1) || DISPLAY_SANS_FONTS.has(font2)) {
    return false;
  }
  // System sans (Arial, Helvetica) pair well with geometric sans
  if (SYSTEM_SANS_FONTS.has(font1) || SYSTEM_SANS_FONTS.has(font2)) {
    return false;
  }
  if (GEOMETRIC_SANS_FONTS.has(font1) && GEOMETRIC_SANS_FONTS.has(font2)) {
    return true;
  }
  if (HUMANIST_SANS_FONTS.has(font1) && HUMANIST_SANS_FONTS.has(font2)) {
    return true;
  }
  return false;
}

// ── Validators ──────────────────────────────────────────────

/**
 * Check if a font is in the whitelist.
 * If not, suggest the closest allowed font.
 */
export function validateFontChoice(font: string): FontValidationResult {
  // Check banned fonts first
  if (BANNED_FONTS.some((banned) => font.toLowerCase() === banned.toLowerCase())) {
    return {
      valid: false,
      suggestion: 'Inter',
    };
  }

  if (ALLOWED_FONTS.includes(font)) {
    return { valid: true };
  }

  const suggestion = findClosestFont(font);
  return {
    valid: false,
    suggestion: suggestion
      ? suggestion
      : undefined,
  };
}

/**
 * Validate font sizes against minimums.
 * Each provided size is checked against its role's minimum.
 */
export function validateFontSizes(sizes: FontSizes): FontSizeValidationResult {
  const violations: string[] = [];

  for (const [role, size] of Object.entries(sizes)) {
    if (size === undefined) continue;
    const minimum = FONT_SIZE_MINIMUMS[role];
    if (minimum !== undefined && size < minimum) {
      violations.push(
        `${role} font size ${size}px is below minimum ${minimum}px`,
      );
    }
  }

  return { valid: violations.length === 0, violations };
}

/**
 * Validate that a heading/body font pairing has enough contrast.
 * Warns if identical or if both belong to the same sub-family.
 */
export function validateFontPairing(
  headingFont: string,
  bodyFont: string,
): FontPairingResult {
  if (headingFont === bodyFont) {
    return {
      valid: false,
      reason: `Heading and body use the same font "${headingFont}". Use different fonts for visual hierarchy.`,
    };
  }

  if (areSameCategory(headingFont, bodyFont)) {
    return {
      valid: false,
      reason: `"${headingFont}" and "${bodyFont}" are both in the same typographic category and look too similar. Pair a geometric sans with a humanist sans for better contrast.`,
    };
  }

  return { valid: true };
}

/**
 * Enforce the per-deck font limit.
 */
export function validateDeckFonts(fonts: string[]): DeckFontsResult {
  const uniqueFonts = [...new Set(fonts)];
  const violations: string[] = [];

  if (uniqueFonts.length > MAX_FONTS_PER_DECK) {
    violations.push(
      `Deck uses ${uniqueFonts.length} fonts (${uniqueFonts.join(', ')}). Maximum allowed is ${MAX_FONTS_PER_DECK}.`,
    );
  }

  for (const font of uniqueFonts) {
    const result = validateFontChoice(font);
    if (!result.valid) {
      const msg = result.suggestion
        ? `Font "${font}" is not in the allowed list. Suggested: "${result.suggestion}".`
        : `Font "${font}" is not in the allowed list.`;
      violations.push(msg);
    }
  }

  return { valid: violations.length === 0, violations };
}
