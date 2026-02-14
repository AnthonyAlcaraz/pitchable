import { useEffect, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import { useKbStore } from '@/stores/kb.store';
import { FileUploadZone } from '@/components/knowledge-base/FileUploadZone';
import { DocumentList } from '@/components/knowledge-base/DocumentList';
import { TextUrlInput } from '@/components/knowledge-base/TextUrlInput';

export function KnowledgeBasePage() {
  const {
    documents,
    searchResults,
    isLoading,
    isUploading,
    isSearching,
    error,
    fetchDocuments,
    uploadFile,
    createTextSource,
    createUrlSource,
    deleteDocument,
    search,
    clearSearch,
    clearError,
  } = useKbStore();

  const [searchQuery, setSearchQuery] = useState('');
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    void fetchDocuments();
  }, [fetchDocuments]);

  useEffect(() => {
    const hasProcessing = documents.some(
      (d) => d.status === 'UPLOADED' || d.status === 'PARSING' || d.status === 'EMBEDDING',
    );

    if (hasProcessing) {
      pollRef.current = setInterval(() => {
        void fetchDocuments();
      }, 3000);
    }

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [documents, fetchDocuments]);

  const handleUpload = (files: File[]) => {
    files.forEach((file) => void uploadFile(file));
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      void search(searchQuery.trim());
    }
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Knowledge Base</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload documents, paste text, or add URLs to build your knowledge base
        </p>
      </div>

      {error && (
        <div className="mb-6 flex items-center justify-between rounded-lg border border-destructive/50 bg-destructive/10 p-3">
          <p className="text-sm text-destructive">{error}</p>
          <button onClick={clearError} className="text-destructive hover:text-destructive/80">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left column: Upload & Input */}
        <div className="space-y-6">
          <section>
            <h2 className="mb-3 text-sm font-semibold text-foreground">Upload Files</h2>
            <FileUploadZone onUpload={handleUpload} isUploading={isUploading} />
          </section>

          <section>
            <h2 className="mb-3 text-sm font-semibold text-foreground">Add Text or URL</h2>
            <TextUrlInput
              onSubmitText={createTextSource}
              onSubmitUrl={createUrlSource}
              isUploading={isUploading}
            />
          </section>
        </div>

        {/* Right column: Search & Document List */}
        <div className="space-y-6">
          <section>
            <h2 className="mb-3 text-sm font-semibold text-foreground">Search Knowledge Base</h2>
            <form onSubmit={handleSearch} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search your documents..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-md border border-border bg-background pl-9 pr-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <button
                type="submit"
                disabled={!searchQuery.trim() || isSearching}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                Search
              </button>
            </form>

            {searchResults.length > 0 && (
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-muted-foreground">
                    {searchResults.length} results
                  </p>
                  <button
                    onClick={clearSearch}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    Clear
                  </button>
                </div>
                {searchResults.map((result) => (
                  <div
                    key={result.id}
                    className="rounded-lg border border-border bg-card p-3"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-primary">
                        {Math.round(result.similarity * 100)}% match
                      </span>
                      <span className="text-xs text-muted-foreground">
                        from {result.documentTitle}
                      </span>
                    </div>
                    {result.heading && (
                      <p className="text-xs font-medium text-foreground mb-1">
                        {result.heading}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground line-clamp-3">
                      {result.content}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="mb-3 text-sm font-semibold text-foreground">
              Documents ({documents.length})
            </h2>
            <DocumentList
              documents={documents}
              onDelete={deleteDocument}
              isLoading={isLoading}
            />
          </section>
        </div>
      </div>
    </div>
  );
}
