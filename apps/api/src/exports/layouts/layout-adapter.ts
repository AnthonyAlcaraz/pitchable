import type { LayoutSpec } from './layout-spec.js';

/**
 * Theme configuration passed to layout adapters.
 */
export interface ThemeConfig {
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
}

/**
 * Rendered output from a layout adapter.
 */
export interface RenderedSlide {
  /** The rendered content in the adapter's native format */
  content: string;
  /** Optional CSS/styles associated with this slide */
  styles?: string;
}

/**
 * Abstract layout adapter interface.
 * Each export format implements this to render LayoutSpecs in its native format.
 *
 * Implementations:
 * - MarpLayoutAdapter (Markdown + CSS directives)
 * - Future: GoogleSlidesLayoutAdapter, KeynoteLayoutAdapter
 */
export interface LayoutAdapter {
  /**
   * Render a single slide from its layout specification.
   */
  renderSlide(spec: LayoutSpec, theme: ThemeConfig): RenderedSlide;

  /**
   * Render the global theme/style preamble (e.g., Marp CSS, PPTX master slide).
   */
  renderThemePreamble(theme: ThemeConfig): string;
}
