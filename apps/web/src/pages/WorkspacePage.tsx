import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Layers } from 'lucide-react';
import { SplitScreen } from '@/components/layout/SplitScreen';
import { ChatPanel } from '@/components/chat/ChatPanel';
import { PreviewPanel } from '@/components/preview/PreviewPanel';

export function WorkspacePage() {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="flex h-screen flex-col">
      {/* Minimal top bar */}
      <header className="flex h-12 items-center gap-3 border-b border-border px-4">
        <Link
          to="/dashboard"
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Dashboard
        </Link>
        <div className="h-5 w-px bg-border" />
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium text-foreground">
            {id === 'new' ? 'New Presentation' : `Presentation ${id ?? ''}`}
          </span>
        </div>
      </header>

      {/* Split-screen workspace */}
      <div className="flex-1">
        <SplitScreen
          leftPanel={<ChatPanel presentationId={id} />}
          rightPanel={<PreviewPanel presentationId={id} />}
        />
      </div>
    </div>
  );
}

export default WorkspacePage;
