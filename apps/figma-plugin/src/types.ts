// ── V1 Types (backward compat) ────────────────────────────

export interface FigmaExportSlide {
  slideNumber: number;
  slideType: string;
  title: string;
  bodyLines: string[];
  imageUrl: string | null;
  speakerNotes: string | null;
  sectionLabel: string | null;
  backgroundColor: string;
  textColor: string;
  accentColor: string;
}

export interface FigmaExportPayload {
  version: number;
  presentationId: string;
  title: string;
  slideCount: number;
  theme: {
    name: string;
    headingFont: string;
    bodyFont: string;
    colors: {
      primary: string;
      secondary: string;
      accent: string;
      background: string;
      text: string;
      surface: string;
    };
  };
  slides: FigmaExportSlide[];
  dimensions: { width: number; height: number };
}

// ── V2 Types (rich editable export) ───────────────────────

export type StructuredBodyBlock =
  | { type: 'bullets'; items: Array<{ text: string; bold?: boolean }> }
  | { type: 'numbered'; items: Array<{ text: string; bold?: boolean }> }
  | { type: 'paragraph'; text: string }
  | { type: 'table'; headers: string[]; rows: string[][] }
  | { type: 'metrics'; items: Array<{ label: string; value: string; change?: string }> }
  | { type: 'subheading'; text: string };

export interface FigmaExportSlideV2 extends FigmaExportSlide {
  structuredBody: StructuredBodyBlock[];
  backgroundVariant: string;
}

export interface ColorPaletteV2 {
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

export interface FigmaExportPayloadV2 {
  version: 2;
  presentationId: string;
  title: string;
  slideCount: number;
  theme: {
    name: string;
    headingFont: string;
    bodyFont: string;
    colors: ColorPaletteV2;
  };
  slides: FigmaExportSlideV2[];
  dimensions: { width: 1920; height: 1080 };
}

// ── Shared Config Types ───────────────────────────────────

export interface ThemeConfig {
  name: string;
  headingFont: string;
  bodyFont: string;
  colors: ColorPaletteV2;
}

export interface LoadedFonts {
  heading: FontName;
  headingBold: FontName;
  body: FontName;
}

export interface FigmaStyles {
  // Figma local style references (created by theme-builder)
  paintStyles: Map<string, PaintStyle>;
  textStyles: Map<string, TextStyle>;
}
