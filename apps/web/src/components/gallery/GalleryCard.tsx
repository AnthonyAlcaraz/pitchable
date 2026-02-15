import { Link } from 'react-router-dom';
import { Layers } from 'lucide-react';

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
}

interface GalleryCardProps {
  presentation: GalleryPresentation;
}

export function GalleryCard({ presentation }: GalleryCardProps) {
  return (
    <Link
      to={`/gallery/${presentation.id}`}
      className="group overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg"
    >
      {/* Color gradient header */}
      <div
        className="flex h-36 items-center justify-center"
        style={{
          background: `linear-gradient(135deg, ${presentation.themeColor}30, ${presentation.themeColor}08)`,
        }}
      >
        <Layers className="h-12 w-12 text-slate-300 transition-transform group-hover:scale-110" />
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="mb-1 truncate text-sm font-semibold text-slate-900">
          {presentation.title}
        </h3>
        {presentation.description && (
          <p className="mb-2 line-clamp-2 text-xs text-slate-500">
            {presentation.description}
          </p>
        )}
        <div className="mb-2 flex items-center gap-2">
          <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-600">
            {TYPE_LABELS[presentation.presentationType] ?? presentation.presentationType}
          </span>
          <span className="text-xs text-slate-400">
            {presentation.slideCount} slide{presentation.slideCount !== 1 ? 's' : ''}
          </span>
        </div>
        <p className="text-xs text-slate-400">by {presentation.authorName}</p>
      </div>
    </Link>
  );
}
