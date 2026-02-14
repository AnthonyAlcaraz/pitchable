// ─────────────────────────────────────────────────────────────
// Layout Validation Module — Design Constraint Engine
// Enforces layout rules: column count, font size variety,
// color variety, and overlay requirements.
// ─────────────────────────────────────────────────────────────

export interface LayoutConfig {
  columns?: number;
  fontSizes?: number[];
  distinctColors?: string[];
  hasFullBleedImage?: boolean;
  overlayOpacity?: number;
}

export interface LayoutValidationResult {
  valid: boolean;
  violations: string[];
}

export const LAYOUT_LIMITS = {
  maxColumns: 2,
  maxFontSizes: 3,
  maxDistinctColors: 3,
  minOverlayOpacity: 0.3,
} as const;

export function validateLayout(layout: LayoutConfig): LayoutValidationResult {
  const violations: string[] = [];

  if (layout.columns !== undefined && layout.columns > LAYOUT_LIMITS.maxColumns) {
    violations.push(
      `Slide has ${layout.columns} columns (max ${LAYOUT_LIMITS.maxColumns}).`,
    );
  }

  if (layout.fontSizes) {
    const uniqueSizes = [...new Set(layout.fontSizes)];
    if (uniqueSizes.length > LAYOUT_LIMITS.maxFontSizes) {
      violations.push(
        `Slide uses ${uniqueSizes.length} font sizes (max ${LAYOUT_LIMITS.maxFontSizes}).`,
      );
    }
  }

  if (layout.distinctColors) {
    // Exclude near-neutrals (grays, whites, blacks) from the count
    const nonNeutralColors = layout.distinctColors.filter((hex) => {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      const maxDiff = Math.max(Math.abs(r - g), Math.abs(g - b), Math.abs(r - b));
      return maxDiff > 30; // Neutral if all channels within 30 of each other
    });

    if (nonNeutralColors.length > LAYOUT_LIMITS.maxDistinctColors) {
      violations.push(
        `Slide uses ${nonNeutralColors.length} distinct colors (max ${LAYOUT_LIMITS.maxDistinctColors}, excluding neutrals).`,
      );
    }
  }

  if (layout.hasFullBleedImage) {
    if (
      layout.overlayOpacity === undefined ||
      layout.overlayOpacity < LAYOUT_LIMITS.minOverlayOpacity
    ) {
      const current = layout.overlayOpacity !== undefined
        ? `${Math.round(layout.overlayOpacity * 100)}%`
        : 'none';
      violations.push(
        `Full-bleed image with text requires at least ${Math.round(LAYOUT_LIMITS.minOverlayOpacity * 100)}% overlay (current: ${current}).`,
      );
    }
  }

  return { valid: violations.length === 0, violations };
}
