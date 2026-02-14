export interface DocumentChunkData {
  content: string;
  heading: string | null;
  headingLevel: number;
  chunkIndex: number;
  metadata: {
    sourceFile?: string;
    pageNumber?: number;
    sectionPath: string[];
  };
}
