import type { FigmaExportSlideV2, ThemeConfig, LoadedFonts, FigmaStyles } from '../types';

import { layout as titleLayout } from './title';
import { layout as problemLayout } from './problem';
import { layout as solutionLayout } from './solution';
import { layout as architectureLayout } from './architecture';
import { layout as processLayout } from './process';
import { layout as comparisonLayout } from './comparison';
import { layout as dataMetricsLayout } from './data-metrics';
import { layout as ctaLayout } from './cta';
import { layout as contentLayout } from './content';
import { layout as quoteLayout } from './quote';
import { layout as visualHumorLayout } from './visual-humor';
import { layout as teamLayout } from './team';
import { layout as timelineLayout } from './timeline';
import { layout as sectionDividerLayout } from './section-divider';
import { layout as metricsHighlightLayout } from './metrics-highlight';
import { layout as featureGridLayout } from './feature-grid';
import { layout as productShowcaseLayout } from './product-showcase';
import { layout as logoWallLayout } from './logo-wall';
import { layout as marketSizingLayout } from './market-sizing';
import { layout as splitStatementLayout } from './split-statement';
import { layout as outlineLayout } from './outline';

export type LayoutFunction = (
  frame: FrameNode,
  slide: FigmaExportSlideV2,
  theme: ThemeConfig,
  fonts: LoadedFonts,
  styles: FigmaStyles,
) => Promise<void>;

/**
 * Registry mapping SlideType string to its layout function.
 * Falls back to contentLayout for unknown types.
 */
export const LAYOUT_REGISTRY: Record<string, LayoutFunction> = {
  TITLE: titleLayout,
  PROBLEM: problemLayout,
  SOLUTION: solutionLayout,
  ARCHITECTURE: architectureLayout,
  PROCESS: processLayout,
  COMPARISON: comparisonLayout,
  DATA_METRICS: dataMetricsLayout,
  CTA: ctaLayout,
  CONTENT: contentLayout,
  QUOTE: quoteLayout,
  VISUAL_HUMOR: visualHumorLayout,
  TEAM: teamLayout,
  TIMELINE: timelineLayout,
  SECTION_DIVIDER: sectionDividerLayout,
  METRICS_HIGHLIGHT: metricsHighlightLayout,
  FEATURE_GRID: featureGridLayout,
  PRODUCT_SHOWCASE: productShowcaseLayout,
  LOGO_WALL: logoWallLayout,
  MARKET_SIZING: marketSizingLayout,
  SPLIT_STATEMENT: splitStatementLayout,
  OUTLINE: outlineLayout,
};

/**
 * Get the layout function for a slide type, defaulting to CONTENT.
 */
export function getLayoutForType(slideType: string): LayoutFunction {
  return LAYOUT_REGISTRY[slideType] ?? contentLayout;
}
