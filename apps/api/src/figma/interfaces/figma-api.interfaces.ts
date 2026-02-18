// ── Figma REST API Response Types ────────────────────────────

/** GET /v1/me */
export interface FigmaUser {
  id: string;
  handle: string;
  email: string;
  img_url: string;
}

/** Node from document tree */
export interface FigmaNode {
  id: string;
  name: string;
  type: string;
  children?: FigmaNode[];
  absoluteBoundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

/** GET /v1/files/:key */
export interface FigmaFileResponse {
  name: string;
  lastModified: string;
  thumbnailUrl: string;
  version: string;
  document: FigmaNode;
}

/** GET /v1/images/:key */
export interface FigmaImageExportResponse {
  err: string | null;
  images: Record<string, string | null>;
}

/** Flattened frame info for the picker UI */
export interface FigmaFrameInfo {
  nodeId: string;
  name: string;
  width: number;
  height: number;
  pageName: string;
  thumbnailUrl?: string;
}
