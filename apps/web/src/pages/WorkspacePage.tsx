import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Layers, BookOpen, Focus } from 'lucide-react';
import { PeachLogo } from '@/components/icons/PeachLogo';
import { SplitScreen } from '@/components/layout/SplitScreen';
import { ChatPanel } from '@/components/chat/ChatPanel';
import { PreviewPanel } from '@/components/preview/PreviewPanel';

export function WorkspacePage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const briefId = searchParams.get('briefId');
  const lensId = searchParams.get('lensId');
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ id: string }>).detail;
      navigate(`/workspace/${detail.id}`, { replace: true });
    };
    window.addEventListener('presentation-created', handler);
    return () => window.removeEventListener('presentation-created', handler);
  }, [navigate]);

  return (
    <div className="flex h-screen flex-col">
      {/* Minimal top bar */}
      <header className="flex h-12 items-center gap-3 border-b border-border px-4">
        <Link
          to="/cockpit"
          className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <PeachLogo className="h-5 w-5" />
          <span className="font-medium text-foreground">Pitchable</span>
        </Link>
        <div className="h-5 w-px bg-border" />
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium text-foreground">
            {id === 'new' ? t('workspace.new_presentation') : t('workspace.presentation_label', { id: id ?? '' })}
          </span>
        </div>
        {briefId && (
          <>
            <div className="h-5 w-px bg-border" />
            <Link
              to={`/pitch-briefs/${briefId}`}
              className="flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary/20"
            >
              <BookOpen className="h-3 w-3" />
              {t('workspace.brief')}
            </Link>
          </>
        )}
        {lensId && (
          <>
            {!briefId && <div className="h-5 w-px bg-border" />}
            <Link
              to={`/pitch-lens/${lensId}`}
              className="flex items-center gap-1.5 rounded-full bg-accent px-2.5 py-1 text-xs font-medium text-accent-foreground hover:bg-accent/80"
            >
              <Focus className="h-3 w-3" />
              {t('workspace.lens')}
            </Link>
          </>
        )}
      </header>

      {/* Split-screen workspace */}
      <div className="flex-1">
        <SplitScreen
          leftPanel={<ChatPanel presentationId={id} briefId={briefId ?? undefined} lensId={lensId ?? undefined} />}
          rightPanel={<PreviewPanel presentationId={id} />}
        />
      </div>
    </div>
  );
}

export default WorkspacePage;
