import { Link } from 'react-router-dom';
import { Layers, Eye, GitFork, Star } from 'lucide-react';

const TYPE_LABELS: Record<string, string> = {
  STANDARD: 'Standard',
  VC_PITCH: 'VC Pitch',
  TECHNICAL: 'Technical',
  EXECUTIVE: 'Executive',
};

export interface GalleryPresentation {
  id: string;
  title: string;
  description: string | null;
  presentationType: string;
  slideCount: number;
  authorName: string;
  themeName: string;
  themeColor: string;
  publishedAt: string;
  createdAt: string;
  viewCount?: number;
  forkCount?: number;
  featured?: boolean;
}

interface GalleryCardProps {
  presentation: GalleryPresentation;
}

export function GalleryCard({ presentation }: GalleryCardProps) {
  return (
    <Link
      to={`/gallery/${presentation.id}`}
      className="group overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg"
    >
      {/* Color gradient header */}
      <div
        className="relative flex h-36 items-center justify-center"
        style={{
          background: `linear-gradient(135deg, ${presentation.themeColor}30, ${presentation.themeColor}08)`,
        }}
      >
        {presentation.featured && (
          <span className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-orange-500/90 px-2 py-0.5 text-[10px] font-bold text-white">
            <Star className="h-3 w-3 fill-white" />
            Featured
          </span>
        )}
        <Layers className="h-12 w-12 text-muted-foreground/30 transition-transform group-hover:scale-110" />
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="mb-1 truncate text-sm font-semibold text-foreground">
          {presentation.title}
        </h3>
        {presentation.description && (
          <p className="mb-2 line-clamp-2 text-xs text-muted-foreground">
            {presentation.description}
          </p>
        )}
        <div className="mb-2 flex items-center gap-2">
          <span className="rounded-full bg-orange-500/10 px-2 py-0.5 text-[10px] font-semibold text-orange-400">
            {TYPE_LABELS[presentation.presentationType] ?? presentation.presentationType}
          </span>
          <span className="text-xs text-muted-foreground">
            {presentation.slideCount} slide{presentation.slideCount !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">by {presentation.authorName}</p>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {presentation.viewCount !== undefined && presentation.viewCount > 0 && (
              <span className="flex items-center gap-1">
                <Eye className="h-3 w-3" />
                {presentation.viewCount}
              </span>
            )}
            {presentation.forkCount !== undefined && presentation.forkCount > 0 && (
              <span className="flex items-center gap-1">
                <GitFork className="h-3 w-3" />
                {presentation.forkCount}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
