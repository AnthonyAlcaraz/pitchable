import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usePitchBriefStore } from '@/stores/pitch-brief.store';
import { usePitchLensStore } from '@/stores/pitch-lens.store';
import { ArrowLeft, BookOpen, Plus, Trash2, Upload, FileText, Link2, Unlink, Search, Network } from 'lucide-react';

const STATUS_COLORS: Record<string, string> = {
  EMPTY: 'bg-gray-500/10 text-gray-400',
  PROCESSING: 'bg-yellow-500/10 text-yellow-500',
  READY: 'bg-green-500/10 text-green-500',
  ERROR: 'bg-red-500/10 text-red-500',
};

const ENTITY_COLORS: Record<string, string> = {
  PERSON: 'bg-orange-500/10 text-orange-400',
  ORGANIZATION: 'bg-amber-500/10 text-amber-500',
  CONCEPT: 'bg-green-500/10 text-green-500',
  TECHNOLOGY: 'bg-purple-500/10 text-purple-500',
  PRODUCT: 'bg-rose-500/10 text-rose-500',
  EVENT: 'bg-cyan-500/10 text-cyan-500',
  LOCATION: 'bg-orange-500/10 text-orange-500',
};

const NODE_COLORS: Record<string, string> = {
  PERSON: '#3b82f6',
  ORGANIZATION: '#f59e0b',
  CONCEPT: '#10b981',
  TECHNOLOGY: '#a855f7',
  PRODUCT: '#f43f5e',
  EVENT: '#06b6d4',
  LOCATION: '#f97316',
};

export function PitchBriefDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    currentBrief,
    documents,
    graph,
    graphStats,
    searchResults,
    loadBrief,
    loadDocuments,
    loadGraph,
    loadGraphStats,
    uploadDocument,
    addTextDocument,
    addUrlDocument,
    deleteDocument,
    linkLens,
    unlinkLens,
    searchBrief,
  } = usePitchBriefStore();

  const { lenses, loadLenses } = usePitchLensStore();

  const [showLinkModal, setShowLinkModal] = useState(false);
  const [textTitle, setTextTitle] = useState('');
  const [textContent, setTextContent] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [urlTitle, setUrlTitle] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      loadBrief(id);
      loadDocuments(id);
      loadGraph(id);
      loadGraphStats(id);
      loadLenses();
    }
  }, [id, loadBrief, loadDocuments, loadGraph, loadGraphStats, loadLenses]);

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
    await addTextDocument(id, { title: textTitle, content: textContent });
    setTextTitle('');
    setTextContent('');
  };

  const handleAddUrl = async () => {
    if (!id || !urlInput || !urlTitle) return;
    await addUrlDocument(id, { url: urlInput, title: urlTitle });
    setUrlInput('');
    setUrlTitle('');
  };

  const handleDeleteDoc = async (docId: string) => {
    if (!id) return;

    if (deletingDocId === docId) {
      await deleteDocument(id, docId);
      setDeletingDocId(null);
    } else {
      setDeletingDocId(docId);
      setTimeout(() => setDeletingDocId(null), 3000);
    }
  };

  const handleSearch = () => {
    if (!id || !searchQuery) return;
    searchBrief(id, searchQuery);
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

  const availableLenses = lenses.filter(
    (lens) => !currentBrief?.linkedLenses?.some((ll) => ll.id === lens.id)
  );

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
        Back to Briefs
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
          Edit
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
                Documents ({documents.length})
              </h2>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-3 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm"
              >
                <Upload className="w-4 h-4" />
                Upload
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
              <p className="text-foreground mb-1">Drop files here or click to upload</p>
              <p className="text-sm text-muted-foreground">PDF, DOCX, TXT, MD</p>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.docx,.txt,.md"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>

            {/* Document List */}
            <div className="space-y-3 mb-6">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-4 bg-background border border-border rounded-lg"
                >
                  <div className="flex-1">
                    <h4 className="font-medium text-foreground mb-1">{doc.title}</h4>
                    <div className="flex items-center gap-2">
                      <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">
                        {doc.sourceType}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded-full ${STATUS_COLORS[doc.status]}`}>
                        {doc.status}
                      </span>
                      {doc.chunkCount && (
                        <span className="text-xs text-muted-foreground">
                          {doc.chunkCount} chunks
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteDoc(doc.id)}
                    className="p-2 hover:bg-destructive/10 rounded-lg transition-colors"
                    title={deletingDocId === doc.id ? 'Click again to confirm' : 'Delete'}
                  >
                    <Trash2 className={`w-4 h-4 ${deletingDocId === doc.id ? 'text-destructive' : 'text-muted-foreground'}`} />
                  </button>
                </div>
              ))}
            </div>

            {/* Add Text Document */}
            <div className="mb-6 p-4 bg-background border border-border rounded-lg">
              <h3 className="text-sm font-medium text-foreground mb-3">Add Text Document</h3>
              <input
                type="text"
                placeholder="Title"
                value={textTitle}
                onChange={(e) => setTextTitle(e.target.value)}
                className="w-full px-3 py-2 bg-card border border-border rounded-lg mb-2 text-foreground placeholder:text-muted-foreground"
              />
              <textarea
                placeholder="Content"
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                className="w-full px-3 py-2 bg-card border border-border rounded-lg mb-2 text-foreground placeholder:text-muted-foreground min-h-[100px]"
              />
              <button
                onClick={handleAddText}
                disabled={!textTitle || !textContent}
                className="w-full px-3 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                Add Text
              </button>
            </div>

            {/* Add URL Document */}
            <div className="p-4 bg-background border border-border rounded-lg">
              <h3 className="text-sm font-medium text-foreground mb-3">Add URL Document</h3>
              <input
                type="text"
                placeholder="URL"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                className="w-full px-3 py-2 bg-card border border-border rounded-lg mb-2 text-foreground placeholder:text-muted-foreground"
              />
              <input
                type="text"
                placeholder="Title"
                value={urlTitle}
                onChange={(e) => setUrlTitle(e.target.value)}
                className="w-full px-3 py-2 bg-card border border-border rounded-lg mb-2 text-foreground placeholder:text-muted-foreground"
              />
              <button
                onClick={handleAddUrl}
                disabled={!urlInput || !urlTitle}
                className="w-full px-3 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                Add URL
              </button>
            </div>
          </div>

          {/* Linked Lenses Section */}
          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
                <Link2 className="w-5 h-5" />
                Linked Lenses ({currentBrief.linkedLenses?.length || 0})
              </h2>
              <button
                onClick={() => setShowLinkModal(!showLinkModal)}
                className="flex items-center gap-2 px-3 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm"
              >
                <Plus className="w-4 h-4" />
                Link Lens
              </button>
            </div>

            {showLinkModal && (
              <div className="mb-4 p-4 bg-background border border-border rounded-lg">
                <h3 className="text-sm font-medium text-foreground mb-3">Available Lenses</h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {availableLenses.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No available lenses</p>
                  ) : (
                    availableLenses.map((lens) => (
                      <button
                        key={lens.id}
                        onClick={() => handleLinkLens(lens.id)}
                        className="w-full p-3 bg-card border border-border rounded-lg hover:border-primary/50 transition-colors text-left"
                      >
                        <div className="font-medium text-foreground mb-1">{lens.name}</div>
                        <div className="flex gap-2 text-xs">
                          <span className="text-muted-foreground">Audience: {lens.audience}</span>
                          <span className="text-muted-foreground">Goal: {lens.goal}</span>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}

            {currentBrief.linkedLenses && currentBrief.linkedLenses.length > 0 ? (
              <div className="space-y-3">
                {currentBrief.linkedLenses.map((lens) => (
                  <div
                    key={lens.id}
                    className="flex items-center justify-between p-4 bg-background border border-border rounded-lg"
                  >
                    <div>
                      <h4 className="font-medium text-foreground mb-1">{lens.name}</h4>
                      <div className="flex gap-2">
                        <span className="text-xs px-2 py-1 rounded-full bg-orange-500/10 text-orange-400">
                          {lens.audience}
                        </span>
                        <span className="text-xs px-2 py-1 rounded-full bg-green-500/10 text-green-500">
                          {lens.goal}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleUnlinkLens(lens.id)}
                      className="p-2 hover:bg-destructive/10 rounded-lg transition-colors"
                    >
                      <Unlink className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No lenses linked yet</p>
            )}
          </div>
        </div>

        {/* Right Column - Graph Stats & Visualization */}
        <div className="lg:col-span-2 space-y-8">
          {/* Graph Stats */}
          <div className="bg-card border border-border rounded-lg p-6">
            <h2 className="text-xl font-semibold text-foreground mb-6 flex items-center gap-2">
              <Network className="w-5 h-5" />
              Graph Stats
            </h2>

            {graphStats ? (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-background rounded-lg">
                    <div className="text-2xl font-bold text-foreground">{graphStats.totalNodes}</div>
                    <div className="text-sm text-muted-foreground">Nodes</div>
                  </div>
                  <div className="p-4 bg-background rounded-lg">
                    <div className="text-2xl font-bold text-foreground">{graphStats.totalEdges}</div>
                    <div className="text-sm text-muted-foreground">Edges</div>
                  </div>
                  <div className="p-4 bg-background rounded-lg">
                    <div className="text-2xl font-bold text-foreground">{graphStats.density?.toFixed(3)}</div>
                    <div className="text-sm text-muted-foreground">Density</div>
                  </div>
                  <div className="p-4 bg-background rounded-lg">
                    <div className="text-2xl font-bold text-foreground">{graphStats.avgDegree?.toFixed(1)}</div>
                    <div className="text-sm text-muted-foreground">Avg Degree</div>
                  </div>
                </div>

                {graphStats.nodeTypeBreakdown && (
                  <div>
                    <h3 className="text-sm font-medium text-foreground mb-3">Node Types</h3>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(graphStats.nodeTypeBreakdown).map(([type, count]) => (
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

                {graphStats.edgeTypeBreakdown && (
                  <div>
                    <h3 className="text-sm font-medium text-foreground mb-3">Edge Types</h3>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(graphStats.edgeTypeBreakdown).map(([type, count]) => (
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
              <p className="text-sm text-muted-foreground text-center py-8">No graph data available</p>
            )}
          </div>

          {/* Knowledge Graph Visualization */}
          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-foreground">Knowledge Graph</h2>
              <button
                onClick={() => id && loadGraph(id)}
                className="px-3 py-1 text-sm bg-background border border-border rounded-lg hover:border-primary/50 transition-colors"
              >
                Refresh
              </button>
            </div>

            {graph && graph.nodes.length > 0 ? (
              <svg
                viewBox="0 0 400 400"
                className="w-full h-[400px] bg-background rounded-lg border border-border"
              >
                {/* Render edges */}
                {graph.edges.map((edge, i) => {
                  const sourceNode = graph.nodes.find((n) => n.id === edge.source);
                  const targetNode = graph.nodes.find((n) => n.id === edge.target);
                  if (!sourceNode || !targetNode) return null;

                  const sourceAngle = (graph.nodes.indexOf(sourceNode) / graph.nodes.length) * 2 * Math.PI;
                  const targetAngle = (graph.nodes.indexOf(targetNode) / graph.nodes.length) * 2 * Math.PI;
                  const radius = 150;

                  const x1 = 200 + Math.cos(sourceAngle) * radius;
                  const y1 = 200 + Math.sin(sourceAngle) * radius;
                  const x2 = 200 + Math.cos(targetAngle) * radius;
                  const y2 = 200 + Math.sin(targetAngle) * radius;

                  return (
                    <line
                      key={`edge-${i}`}
                      x1={x1}
                      y1={y1}
                      x2={x2}
                      y2={y2}
                      stroke="#444"
                      strokeWidth="1"
                      opacity="0.3"
                    />
                  );
                })}

                {/* Render nodes */}
                {graph.nodes.map((node, i) => {
                  const angle = (i / graph.nodes.length) * 2 * Math.PI;
                  const radius = 150;
                  const x = 200 + Math.cos(angle) * radius;
                  const y = 200 + Math.sin(angle) * radius;
                  const color = NODE_COLORS[node.type] || '#6b7280';

                  return (
                    <g key={node.id}>
                      <circle
                        cx={x}
                        cy={y}
                        r="8"
                        fill={color}
                        stroke="#fff"
                        strokeWidth="2"
                      />
                      <text
                        x={x}
                        y={y + 20}
                        textAnchor="middle"
                        fontSize="10"
                        fill="#9ca3af"
                        className="select-none"
                      >
                        {node.name.length > 12 ? node.name.substring(0, 12) + '...' : node.name}
                      </text>
                    </g>
                  );
                })}
              </svg>
            ) : (
              <div className="flex flex-col items-center justify-center h-[400px] bg-background rounded-lg border border-border">
                <Network className="w-12 h-12 text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">Upload documents to build the knowledge graph</p>
              </div>
            )}
          </div>

          {/* Search Panel */}
          <div className="bg-card border border-border rounded-lg p-6">
            <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
              <Search className="w-5 h-5" />
              Search
            </h2>

            <div className="flex gap-2 mb-4">
              <input
                type="text"
                placeholder="Search knowledge base..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="flex-1 px-3 py-2 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground"
              />
              <button
                onClick={handleSearch}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                Search
              </button>
            </div>

            {searchResults && searchResults.length > 0 && (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {searchResults.map((result, i) => (
                  <div
                    key={i}
                    className="p-4 bg-background border border-border rounded-lg"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-primary">
                        Score: {result.score.toFixed(3)}
                      </span>
                    </div>
                    <p className="text-sm text-foreground line-clamp-3">{result.content}</p>
                  </div>
                ))}
              </div>
            )}

            {searchResults && searchResults.length === 0 && searchQuery && (
              <p className="text-sm text-muted-foreground text-center py-8">No results found</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default PitchBriefDetailPage;
