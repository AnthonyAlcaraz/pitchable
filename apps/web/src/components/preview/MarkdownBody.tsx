import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Components } from 'react-markdown';

interface MarkdownBodyProps {
  children: string;
  /** Compact mode for tiny inline cards (smaller text, no tables) */
  compact?: boolean;
  className?: string;
}

const fullComponents: Components = {
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  h1: ({ children }) => <p className="text-[1.4em] font-bold leading-tight mb-1">{children}</p>,
  h2: ({ children }) => <p className="text-[1.2em] font-bold leading-tight mb-1">{children}</p>,
  h3: ({ children }) => <p className="text-[1.1em] font-semibold leading-tight mb-1">{children}</p>,
  h4: ({ children }) => <p className="text-[1.05em] font-semibold leading-tight mb-0.5">{children}</p>,
  p: ({ children }) => <p className="mb-1 last:mb-0">{children}</p>,
  ul: ({ children }) => <ul className="space-y-0.5 mb-1 last:mb-0">{children}</ul>,
  ol: ({ children }) => <ol className="space-y-0.5 mb-1 last:mb-0 list-decimal list-inside">{children}</ol>,
  li: ({ children }) => (
    <li className="flex items-start gap-1.5">
      <span className="mt-[0.45em] h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary" />
      <span className="flex-1">{children}</span>
    </li>
  ),
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-primary/40 pl-2 italic text-foreground/70 mb-1 last:mb-0">
      {children}
    </blockquote>
  ),
  table: ({ children }) => (
    <div className="my-1 overflow-x-auto">
      <table className="w-full border-collapse text-[0.9em]">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="border-b border-border">{children}</thead>,
  tbody: ({ children }) => <tbody>{children}</tbody>,
  tr: ({ children }) => <tr className="border-b border-border/50 last:border-0">{children}</tr>,
  th: ({ children }) => (
    <th className="px-1.5 py-0.5 text-left font-semibold text-foreground">{children}</th>
  ),
  td: ({ children }) => (
    <td className="px-1.5 py-0.5 text-foreground/80">{children}</td>
  ),
  hr: () => <hr className="my-1.5 border-border/50" />,
  a: ({ children, href }) => (
    <a href={href} className="text-primary underline" target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  ),
  code: ({ children }) => (
    <code className="rounded bg-muted px-1 py-0.5 text-[0.9em] font-mono">{children}</code>
  ),
};

const compactComponents: Components = {
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  p: ({ children }) => <p className="mb-0.5 last:mb-0">{children}</p>,
  ul: ({ children }) => <ul className="space-y-0">{children}</ul>,
  ol: ({ children }) => <ol className="space-y-0 list-decimal list-inside">{children}</ol>,
  li: ({ children }) => (
    <li className="truncate">- {children}</li>
  ),
  blockquote: ({ children }) => <>{children}</>,
  table: ({ children }) => <div className="text-muted-foreground">[table]</div>,
  h1: ({ children }) => <p className="font-bold">{children}</p>,
  h2: ({ children }) => <p className="font-bold">{children}</p>,
  h3: ({ children }) => <p className="font-semibold">{children}</p>,
  h4: ({ children }) => <p className="font-semibold">{children}</p>,
};

export function MarkdownBody({ children, compact = false, className }: MarkdownBodyProps) {
  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={compact ? compactComponents : fullComponents}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
