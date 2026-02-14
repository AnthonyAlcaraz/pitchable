import { useState } from 'react';
import { Type, Globe, Loader2 } from 'lucide-react';

interface TextUrlInputProps {
  onSubmitText: (content: string, title?: string) => void;
  onSubmitUrl: (url: string, title?: string) => void;
  isUploading: boolean;
}

export function TextUrlInput({
  onSubmitText,
  onSubmitUrl,
  isUploading,
}: TextUrlInputProps) {
  const [mode, setMode] = useState<'text' | 'url'>('text');
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    if (mode === 'text') {
      onSubmitText(content.trim(), title.trim() || undefined);
    } else {
      onSubmitUrl(content.trim(), title.trim() || undefined);
    }
    setContent('');
    setTitle('');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setMode('text')}
          className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
            mode === 'text'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground hover:bg-accent'
          }`}
        >
          <Type className="h-3.5 w-3.5" />
          Paste Text
        </button>
        <button
          type="button"
          onClick={() => setMode('url')}
          className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
            mode === 'url'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground hover:bg-accent'
          }`}
        >
          <Globe className="h-3.5 w-3.5" />
          Add URL
        </button>
      </div>

      <input
        type="text"
        placeholder="Title (optional)"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
      />

      {mode === 'text' ? (
        <textarea
          placeholder="Paste your text content here..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={4}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-y"
        />
      ) : (
        <input
          type="url"
          placeholder="https://example.com/article"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
      )}

      <button
        type="submit"
        disabled={!content.trim() || isUploading}
        className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isUploading && <Loader2 className="h-4 w-4 animate-spin" />}
        {mode === 'text' ? 'Add Text' : 'Add URL'}
      </button>
    </form>
  );
}
