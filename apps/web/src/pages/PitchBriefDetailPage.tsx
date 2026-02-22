import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { usePitchBriefStore } from '@/stores/pitch-brief.store';
import type { SearchResult } from '@/stores/pitch-brief.store';
import { usePitchLensStore } from '@/stores/pitch-lens.store';
import { ArrowLeft, BookOpen, Plus, Trash2, Upload, FileText, Link2, Unlink, Search, Network } from 'lucide-react';
import { useDocumentProgress } from '@/hooks/useDocumentProgress';
import { useKbStore } from '@/stores/kb.store';
import { InteractiveGraph } from '@/components/graph/InteractiveGraph';

const STATUS_COLORS: Record<string, string> = {
  EMPTY: 'bg-gray-500/10 text-gray-400',
  UPLOADED: 'bg-blue-500/10 text-blue-400',
  PARSING: 'bg-yellow-500/10 text-yellow-500',
  EMBEDDING: 'bg-yellow-500/10 text-yellow-500',
  PROCESSING: 'bg-yellow-500/10 text-yellow-500',
  READY: 'bg-green-500/10 text-green-500',
  ERROR: 'bg-red-500/10 text-red-500',
};



const ENTITY_COLORS: Record<string, string> = {
  PERSON: 'bg-blue-500/10 text-blue-400',
  ORGANIZATION: 'bg-amber-500/10 text-amber-500',
  CONCEPT: 'bg-green-500/10 text-green-500',
  TECHNOLOGY: 'bg-purple-500/10 text-purple-500',
  PRODUCT: 'bg-rose-500/10 text-rose-500',
  EVENT: 'bg-cyan-500/10 text-cyan-500',
  LOCATION: 'bg-orange-500/10 text-orange-500',
};

export function PitchBriefDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    currentBrief,
    graphData,
    graphStats,
    loadBrief,
    loadGraph,
    loadGraphStats,
    uploadDocument,
    addTextDocument,
    addUrlDocument,
    removeDocument,
    linkLens,
    unlinkLens,
    search,
  } = usePitchBriefStore();

  const { lenses, loadLenses } = usePitchLensStore();

  const [showLinkModal, setShowLinkModal] = useState(false);
  const [textTitle, setTextTitle] = useState('');
  const [textContent, setTextContent] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [urlTitle, setUrlTitle] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult | null>(null);
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null);

  // Activate real-time document progress WebSocket listener
  useDocumentProgress();
  const documentProgress = useKbStore((s) => s.documentProgress);

  const docs = currentBrief?.documents ?? [];
  const briefLenses = currentBrief?.briefLenses ?? [];

  // Compute aggregate document progress
  // Check both API status AND live WebSocket progress to avoid timing gaps
  const readyCount = docs.filter((d) => d.status === 'READY').length;
  const processingStatuses = new Set(['UPLOADED', 'PARSING', 'EMBEDDING', 'PROCESSING']);
  const processingDocs = docs.filter(
    (d) => processingStatuses.has(d.status) || (documentProgress[d.id] && documentProgress[d.id].progress > 0 && documentProgress[d.id].progress < 100),
  );
  const hasProcessingDocs = processingDocs.length > 0;
  const aggregateProgress = docs.length > 0
    ? Math.round(
        docs.reduce((sum, d) => {
          if (d.status === 'READY' && !documentProgress[d.id]) return sum + 100;
          if (d.status === 'ERROR' && !documentProgress[d.id]) return sum + 0;
          const prog = documentProgress[d.id];
          if (prog) return sum + Math.max(0, Math.min(100, prog.progress));
          // Status is processing but no WebSocket event yet — estimate
          if (d.status === 'PARSING') return sum + 15;
          if (d.status === 'EMBEDDING') return sum + 60;
          if (d.status === 'PROCESSING') return sum + 40;
          return sum + 5;
        }, 0) / docs.length,
      )
    : 0;

  useEffect(() => {
    if (id) {
      loadBrief(id);
      loadGraph(id);
      loadGraphStats(id);
      loadLenses();
    }
  }, [id, loadBrief, loadGraph, loadGraphStats, loadLenses]);

  // Poll while any document is still processing
  useEffect(() => {
    const hasProcessing = docs.some(
      (d) => ['UPLOADED', 'PARSING', 'EMBEDDING', 'PROCESSING'].includes(d.status),
    );
    if (!hasProcessing || !id) return;
    const interval = setInterval(() => loadBrief(id), 5000);
    return () => clearInterval(interval);
  }, [docs, id, loadBrief]);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !id) return;

    Array.from(files).forEach((file) => {
      uploadDocument(id, file);
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [id, uploadDocument]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (!files || !id) return;

    Array.from(files).forEach((file) => {
      uploadDocument(id, file);
    });
  }, [id, uploadDocument]);

  const handleAddText = async () => {
    if (!id || !textTitle || !textContent) return;
    await addTextDocument(id, textContent, textTitle);
    setTextTitle('');
    setTextContent('');
  };

  const handleAddUrl = async () => {
    if (!id || !urlInput || !urlTitle) return;
    await addUrlDocument(id, urlInput, urlTitle);
    setUrlInput('');
    setUrlTitle('');
  };

  const handleDeleteDoc = async (docId: string) => {
    if (!id) return;

    if (deletingDocId === docId) {
      await removeDocument(id, docId);
      setDeletingDocId(null);
    } else {
      setDeletingDocId(docId);
      setTimeout(() => setDeletingDocId(null), 3000);
    }
  };

  const handleSearch = async () => {
    if (!id || !searchQuery) return;
    const result = await search(id, searchQuery);
    setSearchResults(result);
  };

  const handleLinkLens = async (lensId: string) => {
    if (!id) return;
    await linkLens(id, lensId);
    setShowLinkModal(false);
  };

  const handleUnlinkLens = async (lensId: string) => {
    if (!id) return;
    await unlinkLens(id, lensId);
  };

  const linkedLensIds = new Set(briefLenses.map((bl) => bl.lens.id));
  const availableLenses = lenses.filter((lens) => !linkedLensIds.has(lens.id));

  if (!currentBrief) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-8 max-w-[1600px]">
      <button
        onClick={() => navigate('/pitch-briefs')}
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        {t('pitch_briefs.detail.back_to_briefs')}
      </button>

      <div className="flex items-start justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-lg bg-primary/10">
            <BookOpen className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-1">{currentBrief.name}</h1>
            {currentBrief.description && (
              <p className="text-muted-foreground">{currentBrief.description}</p>
            )}
            <div className="mt-2">
              <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[currentBrief.status]}`}>
                {currentBrief.status}
              </span>
            </div>
          </div>
        </div>
        <button
          onClick={() => navigate(`/pitch-briefs/${id}/edit`)}
          className="px-4 py-2 bg-card border border-border rounded-lg hover:border-primary/50 transition-colors text-foreground"
        >
          {t('common.edit')}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Left Column - Documents & Lenses */}
        <div className="lg:col-span-3 space-y-8">
          {/* Documents Section */}
          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
                <FileText className="w-5 h-5" />
                {t('pitch_briefs.detail.documents_title', { count: docs.length })}
              </h2>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-3 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm"
              >
                <Upload className="w-4 h-4" />
                {t('pitch_briefs.detail.upload')}
              </button>
            </div>

            {/* File Upload Zone */}
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              className="border-2 border-dashed border-border rounded-lg p-8 mb-6 text-center hover:border-primary/50 transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-foreground mb-1">{t('pitch_briefs.detail.drop_files')}</p>
              <p className="text-sm text-muted-foreground">{t('pitch_briefs.detail.supported_formats')}</p>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.docx,.txt,.md,.csv,.xlsx,.xls,.pptx"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>

            {/* Aggregate Document Progress */}
            {hasProcessingDocs && docs.length > 0 && (
              <div className="mb-6 p-4 bg-background border border-border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium" style={{ color: '#E88D67' }}>
                    {readyCount}/{docs.length} documents ready
                  </span>
                  <span className="text-xs font-mono font-semibold tabular-nums" style={{ color: '#E88D67' }}>
                    {aggregateProgress}%
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full" style={{ backgroundColor: '#FFF0E6' }}>
                  <div
                    className="h-full rounded-full transition-all duration-700 ease-out"
                    style={{
                      width: `${aggregateProgress}%`,
                      background: 'linear-gradient(90deg, #FFAB76, #FF9F6B, #E88D67)',
                    }}
                  />
                </div>
                {processingDocs.length > 0 && (
                  <p className="mt-2 text-xs text-muted-foreground truncate">
                    {documentProgress[processingDocs[0].id]?.message || `Processing ${processingDocs[0].title}...`}
                  </p>
                )}
              </div>
            )}

            {/* Document List */}
            <div className="space-y-3 mb-6">
              {docs.map((doc) => (
                <div
                  key={doc.id}
                  className="bg-background border border-border rounded-lg overflow-hidden"
                >
                  <div className="flex items-center justify-between p-4">
                    <div className="flex-1">
                      <h4 className="font-medium text-foreground mb-1">{doc.title}</h4>
                      <div className="flex items-center gap-2">
                        <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">
                          {doc.sourceType}
                        </span>
                        <span className={`text-xs px-2 py-1 rounded-full ${STATUS_COLORS[doc.status] ?? 'bg-gray-500/10 text-gray-400'}`}>
                          {doc.status}
                        </span>
                        {doc.chunkCount > 0 && (
                          <span className="text-xs text-muted-foreground">
                            {t('common.chunks_count', { count: doc.chunkCount })}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteDoc(doc.id)}
                      className="p-2 hover:bg-destructive/10 rounded-lg transition-colors"
                      title={deletingDocId === doc.id ? t('pitch_briefs.list.confirm_delete') : t('common.delete')}
                    >
                      <Trash2 className={`w-4 h-4 ${deletingDocId === doc.id ? 'text-destructive' : 'text-muted-foreground'}`} />
                    </button>
                  </div>
                  {/* Per-document inline progress bar */}
                  {documentProgress[doc.id] && documentProgress[doc.id].progress > 0 && documentProgress[doc.id].progress < 100 && (
                    <div className="px-4 pb-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-muted-foreground truncate">
                          {documentProgress[doc.id].message}
                        </span>
                        <span className="text-xs font-mono tabular-nums ml-2" style={{ color: '#E88D67' }}>
                          {documentProgress[doc.id].progress}%
                        </span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full" style={{ backgroundColor: '#FFF0E6' }}>
                        <div
                          className="h-full rounded-full transition-all duration-500 ease-out"
                          style={{
                            width: `${documentProgress[doc.id].progress}%`,
                            background: 'linear-gradient(90deg, #FFAB76, #FF9F6B, #E88D67)',
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Add Text Document */}
            <div className="mb-6 p-4 bg-background border border-border rounded-lg">
              <h3 className="text-sm font-medium text-foreground mb-3">{t('pitch_briefs.detail.add_text_document')}</h3>
              <input
                type="text"
                placeholder={t('pitch_briefs.detail.title_placeholder')}
                value={textTitle}
                onChange={(e) => setTextTitle(e.target.value)}
                className="w-full px-3 py-2 bg-card border border-border rounded-lg mb-2 text-foreground placeholder:text-muted-foreground"
              />
              <textarea
                placeholder={t('pitch_briefs.detail.content_placeholder')}
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                className="w-full px-3 py-2 bg-card border border-border rounded-lg mb-2 text-foreground placeholder:text-muted-foreground min-h-[100px]"
              />
              <button
                onClick={() => void handleAddText()}
                disabled={!textTitle || !textContent}
                className="w-full px-3 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                {t('pitch_briefs.detail.add_text')}
              </button>
            </div>

            {/* Add URL Document */}
            <div className="p-4 bg-background border border-border rounded-lg">
              <h3 className="text-sm font-medium text-foreground mb-3">{t('pitch_briefs.detail.add_url_document')}</h3>
              <input
                type="text"
                placeholder={t('pitch_briefs.detail.url_placeholder')}
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                className="w-full px-3 py-2 bg-card border border-border rounded-lg mb-2 text-foreground placeholder:text-muted-foreground"
              />
              <input
                type="text"
                placeholder={t('pitch_briefs.detail.title_placeholder')}
                value={urlTitle}
                onChange={(e) => setUrlTitle(e.target.value)}
                className="w-full px-3 py-2 bg-card border border-border rounded-lg mb-2 text-foreground placeholder:text-muted-foreground"
              />
              <button
                onClick={() => void handleAddUrl()}
                disabled={!urlInput || !urlTitle}
                className="w-full px-3 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                {t('pitch_briefs.detail.add_url')}
              </button>
            </div>
          </div>

          {/* Linked Lenses Section */}
          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
                <Link2 className="w-5 h-5" />
                {t('pitch_briefs.detail.linked_lenses_title', { count: briefLenses.length })}
              </h2>
              <button
                onClick={() => setShowLinkModal(!showLinkModal)}
                className="flex items-center gap-2 px-3 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm"
              >
                <Plus className="w-4 h-4" />
                {t('pitch_briefs.detail.link_lens')}
              </button>
            </div>

            {showLinkModal && (
              <div className="mb-4 p-4 bg-background border border-border rounded-lg">
                <h3 className="text-sm font-medium text-foreground mb-3">{t('pitch_briefs.detail.available_lenses')}</h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {availableLenses.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t('pitch_briefs.detail.no_available_lenses')}</p>
                  ) : (
                    availableLenses.map((lens) => (
                      <button
                        key={lens.id}
                        onClick={() => void handleLinkLens(lens.id)}
                        className="w-full p-3 bg-card border border-border rounded-lg hover:border-primary/50 transition-colors text-left"
                      >
                        <div className="font-medium text-foreground mb-1">{lens.name}</div>
                        <div className="flex gap-2 text-xs">
                          <span className="text-muted-foreground">{lens.audienceType}</span>
                          <span className="text-muted-foreground">{lens.pitchGoal}</span>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}

            {briefLenses.length > 0 ? (
              <div className="space-y-3">
                {briefLenses.map((bl) => (
                  <div
                    key={bl.lens.id}
                    className="flex items-center justify-between p-4 bg-background border border-border rounded-lg"
                  >
                    <div>
                      <h4 className="font-medium text-foreground mb-1">{bl.lens.name}</h4>
                      <div className="flex gap-2">
                        <span className="text-xs px-2 py-1 rounded-full bg-orange-500/10 text-orange-400">
                          {bl.lens.audienceType}
                        </span>
                        <span className="text-xs px-2 py-1 rounded-full bg-green-500/10 text-green-500">
                          {bl.lens.pitchGoal}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => void handleUnlinkLens(bl.lens.id)}
                      className="p-2 hover:bg-destructive/10 rounded-lg transition-colors"
                    >
                      <Unlink className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">{t('pitch_briefs.detail.no_lenses_linked')}</p>
            )}
          </div>
        </div>

        {/* Right Column - Graph Stats & Visualization */}
        <div className="lg:col-span-2 space-y-8">
          {/* Graph Stats */}
          <div className="bg-card border border-border rounded-lg p-6">
            <h2 className="text-xl font-semibold text-foreground mb-6 flex items-center gap-2">
              <Network className="w-5 h-5" />
              {t('pitch_briefs.detail.graph_stats_title')}
            </h2>

            {graphStats ? (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-background rounded-lg">
                    <div className="text-2xl font-bold text-foreground">{graphStats.totalNodes}</div>
                    <div className="text-sm text-muted-foreground">{t('pitch_briefs.detail.nodes')}</div>
                  </div>
                  <div className="p-4 bg-background rounded-lg">
                    <div className="text-2xl font-bold text-foreground">{graphStats.totalEdges}</div>
                    <div className="text-sm text-muted-foreground">{t('pitch_briefs.detail.edges')}</div>
                  </div>
                </div>

                {graphStats.nodeTypes && Object.keys(graphStats.nodeTypes).length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-foreground mb-3">{t('pitch_briefs.detail.node_types')}</h3>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(graphStats.nodeTypes).map(([type, count]) => (
                        <span
                          key={type}
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            ENTITY_COLORS[type] || 'bg-gray-500/10 text-gray-400'
                          }`}
                        >
                          {type}: {count}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {graphStats.edgeTypes && Object.keys(graphStats.edgeTypes).length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-foreground mb-3">{t('pitch_briefs.detail.edge_types')}</h3>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(graphStats.edgeTypes).map(([type, count]) => (
                        <span
                          key={type}
                          className="px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary"
                        >
                          {type}: {count}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">{t('pitch_briefs.detail.no_graph_data')}</p>
            )}
          </div>

          {/* Knowledge Graph Visualization */}
          <div className="bg-card border border-border rounded-lg p-6 relative">
            {graphData ? (
              <InteractiveGraph
                graphData={graphData}
                briefId={id!}
                onRefresh={() => id && loadGraph(id)}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-[400px] bg-background rounded-lg border border-border">
                <Network className="w-12 h-12 text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">{t('pitch_briefs.detail.empty_graph')}</p>
              </div>
            )}
          </div>

          {/* Search Panel */}
          <div className="bg-card border border-border rounded-lg p-6">
            <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
              <Search className="w-5 h-5" />
              {t('pitch_briefs.detail.search_title')}
            </h2>

            <div className="flex gap-2 mb-4">
              <input
                type="text"
                placeholder={t('pitch_briefs.detail.search_placeholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && void handleSearch()}
                className="flex-1 px-3 py-2 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground"
              />
              <button
                onClick={() => void handleSearch()}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                {t('common.search')}
              </button>
            </div>

            {searchResults && searchResults.sources.length > 0 && (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {searchResults.answer && (
                  <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg mb-3">
                    <p className="text-sm text-foreground">{searchResults.answer}</p>
                  </div>
                )}
                {searchResults.sources.map((source, i) => (
                  <div
                    key={i}
                    className="p-4 bg-background border border-border rounded-lg"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-primary">
                        {t('pitch_briefs.detail.score_label', { score: source.score.toFixed(3) })}
                      </span>
                    </div>
                    <p className="text-sm text-foreground line-clamp-3">{source.content}</p>
                  </div>
                ))}
              </div>
            )}

            {searchResults && searchResults.sources.length === 0 && searchQuery && (
              <p className="text-sm text-muted-foreground text-center py-8">{t('pitch_briefs.detail.no_results')}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default PitchBriefDetailPage;
