import { useTranslation } from 'react-i18next';
import { Trash2, FileText, Globe, Type, Loader2 } from 'lucide-react';
import { DocumentStatusBadge } from './DocumentStatusBadge';
import { useKbStore } from '@/stores/kb.store';

interface Document {
  id: string;
  title: string;
  sourceType: 'FILE' | 'TEXT' | 'URL';
  mimeType: string | null;
  fileSize: number | null;
  status: 'UPLOADED' | 'PARSING' | 'EMBEDDING' | 'READY' | 'ERROR';
  chunkCount: number;
  errorMessage: string | null;
  createdAt: string;
}

const SOURCE_ICON = {
  FILE: FileText,
  TEXT: Type,
  URL: Globe,
} as const;

function formatFileSize(bytes: number | null): string {
  if (bytes === null || bytes === 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface DocumentListProps {
  documents: Document[];
  onDelete: (id: string) => void;
  isLoading: boolean;
}

export function DocumentList({ documents, onDelete, isLoading }: DocumentListProps) {
  const { t } = useTranslation();
  const documentProgress = useKbStore((s) => s.documentProgress);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <FileText className="h-10 w-10 text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground">{t('knowledge_base.no_documents')}</p>
        <p className="text-xs text-muted-foreground mt-1">
          {t('knowledge_base.no_documents_hint')}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {documents.map((doc) => {
        const Icon = SOURCE_ICON[doc.sourceType] || FileText;
        return (
          <div
            key={doc.id}
            className="overflow-hidden rounded-lg border border-border bg-card transition-colors"
          >
            <div className="flex items-center gap-3 p-3 hover:bg-accent/50 transition-colors">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10">
                <Icon className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">
                  {doc.title}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-muted-foreground">
                    {doc.sourceType}
                  </span>
                  {doc.fileSize ? (
                    <span className="text-xs text-muted-foreground">
                      {formatFileSize(doc.fileSize)}
                    </span>
                  ) : null}
                  {doc.chunkCount > 0 && (
                    <span className="text-xs text-muted-foreground">
                      {t('common.chunks_count', { count: doc.chunkCount })}
                    </span>
                  )}
                </div>
                {doc.errorMessage && (
                  <p className="text-xs text-destructive mt-0.5 truncate">
                    {doc.errorMessage}
                  </p>
                )}
              </div>
              <DocumentStatusBadge status={doc.status} />
              <button
                onClick={() => onDelete(doc.id)}
                className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                aria-label={`Delete ${doc.title}`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            {(() => {
              const progress = documentProgress[doc.id];
              const isProcessing = progress && progress.progress > 0 && progress.progress < 100;
              if (!isProcessing) return null;
              return (
                <div className="px-3 pb-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px]" style={{ color: '#E88D67' }}>
                      {progress.message}
                    </span>
                    <span className="text-[10px] font-mono tabular-nums" style={{ color: '#FF9F6B' }}>
                      {progress.progress}%
                    </span>
                  </div>
                  <div className="h-1 overflow-hidden rounded-full" style={{ backgroundColor: '#FFF0E6' }}>
                    <div
                      className="h-full rounded-full transition-all duration-700 ease-out"
                      style={{
                        width: `${progress.progress}%`,
                        background: 'linear-gradient(90deg, #FFAB76, #FF9F6B, #E88D67)',
                      }}
                    />
                  </div>
                </div>
              );
            })()}
          </div>
        );
      })}
    </div>
  );
}
