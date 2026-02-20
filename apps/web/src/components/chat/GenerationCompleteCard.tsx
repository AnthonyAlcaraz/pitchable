import { CheckCircle2, Download, Presentation } from 'lucide-react';

export interface GenerationCompleteData {
  presentationId: string;
  deckTitle: string;
  slideCount: number;
  themeName: string;
  imageCount: number;
  isSamplePreview?: boolean;
}

interface GenerationCompleteCardProps {
  data: GenerationCompleteData;
  onExport: (presentationId: string, format: string) => void;
}

export function GenerationCompleteCard({ data, onExport }: GenerationCompleteCardProps) {
  return (
    <div className="mx-4 my-3 rounded-lg border border-green-500/30 bg-green-500/5 p-4">
      <div className="mb-3 flex items-center gap-2">
        <CheckCircle2 className="h-5 w-5 text-green-400" />
        <span className="text-sm font-semibold text-green-400">Deck Generated</span>
      </div>

      <h4 className="mb-2 text-sm font-bold text-foreground">{data.deckTitle}</h4>

      <div className="mb-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
        <span>{data.slideCount} slides</span>
        <span className="text-border">|</span>
        <span>{data.themeName}</span>
        {data.imageCount > 0 && (
          <>
            <span className="text-border">|</span>
            <span>{data.imageCount} images queued</span>
          </>
        )}
      </div>

      {data.isSamplePreview && (
        <p className="mb-3 text-xs text-yellow-400">
          Sample preview. Upgrade to unlock the full deck.
        </p>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onExport(data.presentationId, 'pptx')}
          className="flex items-center gap-1.5 rounded-md bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20 transition-colors"
        >
          <Download className="h-3.5 w-3.5" />
          Download PPTX
        </button>
        <button
          type="button"
          onClick={() => onExport(data.presentationId, 'pdf')}
          className="flex items-center gap-1.5 rounded-md bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20 transition-colors"
        >
          <Presentation className="h-3.5 w-3.5" />
          Download PDF
        </button>
      </div>
    </div>
  );
}
