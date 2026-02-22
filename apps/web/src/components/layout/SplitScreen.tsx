import { useState, useRef, useCallback, useEffect } from 'react';
import type { ReactNode } from 'react';
import { MessageSquare, Monitor } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SplitScreenProps {
  leftPanel?: ReactNode;
  rightPanel?: ReactNode;
}

const MIN_PANEL_WIDTH = 300;
const DEFAULT_LEFT_RATIO = 0.6;

export function SplitScreen({ leftPanel, rightPanel }: SplitScreenProps) {
  const [activeTab, setActiveTab] = useState<'chat' | 'preview'>('preview');
  const [leftRatio, setLeftRatio] = useState(DEFAULT_LEFT_RATIO);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback(() => {
    setIsDragging(true);
  }, []);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const totalWidth = rect.width;
      const x = e.clientX - rect.left;

      // Enforce min widths
      const minRatio = MIN_PANEL_WIDTH / totalWidth;
      const maxRatio = 1 - MIN_PANEL_WIDTH / totalWidth;
      const ratio = Math.min(maxRatio, Math.max(minRatio, x / totalWidth));
      setLeftRatio(ratio);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  const defaultLeft = (
    <div className="flex flex-1 flex-col items-center justify-center p-8">
      <MessageSquare className="mb-4 h-12 w-12 text-muted-foreground/40" />
      <p className="text-center text-sm text-muted-foreground">
        Chat-driven slide generation coming in Phase 3.
      </p>
    </div>
  );

  const defaultRight = (
    <div className="flex flex-1 flex-col items-center justify-center bg-muted/30 p-8">
      <Monitor className="mb-4 h-12 w-12 text-muted-foreground/40" />
      <p className="text-center text-sm text-muted-foreground">
        Live slide preview coming in Phase 3.
      </p>
    </div>
  );

  const leftContent = leftPanel ?? defaultLeft;
  const rightContent = rightPanel ?? defaultRight;

  return (
    <div className="flex h-full flex-col">
      {/* Mobile tabs (< 768px) */}
      <div className="flex border-b border-border md:hidden">
        <button
          onClick={() => setActiveTab('chat')}
          className={cn(
            'flex flex-1 items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors',
            activeTab === 'chat'
              ? 'border-b-2 border-primary text-primary'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          <MessageSquare className="h-4 w-4" />
          Chat
        </button>
        <button
          onClick={() => setActiveTab('preview')}
          className={cn(
            'flex flex-1 items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors',
            activeTab === 'preview'
              ? 'border-b-2 border-primary text-primary'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          <Monitor className="h-4 w-4" />
          Preview
        </button>
      </div>

      {/* Mobile content */}
      <div className="flex-1 overflow-auto md:hidden">
        {activeTab === 'chat' ? (
          <div className="flex h-full flex-col">{rightContent}</div>
        ) : (
          <div className="flex h-full flex-col">{leftContent}</div>
        )}
      </div>

      {/* Desktop split view (>= 768px) */}
      <div
        ref={containerRef}
        className="hidden h-full md:flex"
        style={{ cursor: isDragging ? 'col-resize' : undefined }}
      >
        {/* Left panel (Preview) */}
        <div
          className="flex flex-col overflow-hidden border-r border-border"
          style={{ width: `${leftRatio * 100}%` }}
        >
          <div className="flex h-10 items-center gap-2 border-b border-border px-4">
            <Monitor className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">Preview</span>
          </div>
          <div className="flex flex-1 flex-col overflow-auto">
            {leftContent}
          </div>
        </div>

        {/* Resizable divider */}
        <div
          onMouseDown={handleMouseDown}
          className={cn(
            'w-1 cursor-col-resize transition-colors hover:bg-primary/30',
            isDragging ? 'bg-primary/40' : 'bg-transparent',
          )}
          role="separator"
          aria-orientation="vertical"
        />

        {/* Right panel (Chat) */}
        <div
          className="flex flex-col overflow-hidden"
          style={{ width: `${(1 - leftRatio) * 100}%` }}
        >
          <div className="flex h-10 items-center gap-2 border-b border-border px-4">
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">Chat</span>
          </div>
          <div className="flex flex-1 flex-col overflow-auto">
            {rightContent}
          </div>
        </div>
      </div>
    </div>
  );
}
