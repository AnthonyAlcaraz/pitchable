import { useState } from 'react';
import { Check, Pencil, X } from 'lucide-react';

interface SlidePreview {
  slideId: string;
  slideNumber: number;
  title: string;
  body: string;
  speakerNotes: string;
  slideType: string;
}

interface ValidationPromptProps {
  slide: SlidePreview;
  onAccept: (slideId: string) => void;
  onEdit: (slideId: string, edits: { title?: string; body?: string; speakerNotes?: string }) => void;
  onReject: (slideId: string) => void;
}

export function ValidationPrompt({ slide, onAccept, onEdit, onReject }: ValidationPromptProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(slide.title);
  const [editBody, setEditBody] = useState(slide.body);

  const handleSubmitEdit = () => {
    const edits: { title?: string; body?: string } = {};
    if (editTitle !== slide.title) edits.title = editTitle;
    if (editBody !== slide.body) edits.body = editBody;

    if (Object.keys(edits).length > 0) {
      onEdit(slide.slideId, edits);
    } else {
      onAccept(slide.slideId);
    }
    setIsEditing(false);
  };

  return (
    <div className="my-2 rounded-lg border border-border bg-card overflow-hidden">
      {/* Slide preview header */}
      <div className="flex items-center gap-2 border-b border-border bg-muted/30 px-3 py-2">
        <span className="rounded bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary">
          {slide.slideType.replace('_', ' ')}
        </span>
        <span className="text-xs text-muted-foreground">
          Slide {slide.slideNumber}
        </span>
      </div>

      {/* Slide content */}
      <div className="p-3">
        {isEditing ? (
          <div className="space-y-2">
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="w-full rounded border border-border bg-background px-2 py-1 text-sm font-semibold text-foreground focus:border-primary focus:outline-none"
            />
            <textarea
              value={editBody}
              onChange={(e) => setEditBody(e.target.value)}
              rows={4}
              className="w-full rounded border border-border bg-background px-2 py-1 text-sm text-foreground focus:border-primary focus:outline-none"
            />
            <div className="flex gap-2">
              <button
                onClick={handleSubmitEdit}
                className="rounded bg-primary px-3 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90"
              >
                Save Changes
              </button>
              <button
                onClick={() => {
                  setIsEditing(false);
                  setEditTitle(slide.title);
                  setEditBody(slide.body);
                }}
                className="rounded border border-border px-3 py-1 text-xs font-medium text-muted-foreground hover:bg-muted"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
            <h4 className="mb-1 text-sm font-semibold text-foreground">
              {slide.title}
            </h4>
            <div className="text-xs leading-relaxed text-foreground/70 whitespace-pre-line">
              {slide.body}
            </div>
          </>
        )}
      </div>

      {/* Action buttons */}
      {!isEditing && (
        <div className="flex border-t border-border">
          <button
            onClick={() => onAccept(slide.slideId)}
            className="flex flex-1 items-center justify-center gap-1.5 py-2 text-xs font-medium text-green-600 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-950/20"
          >
            <Check className="h-3.5 w-3.5" />
            Accept
          </button>
          <div className="w-px bg-border" />
          <button
            onClick={() => setIsEditing(true)}
            className="flex flex-1 items-center justify-center gap-1.5 py-2 text-xs font-medium text-orange-400 hover:bg-orange-500/10"
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </button>
          <div className="w-px bg-border" />
          <button
            onClick={() => onReject(slide.slideId)}
            className="flex flex-1 items-center justify-center gap-1.5 py-2 text-xs font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/20"
          >
            <X className="h-3.5 w-3.5" />
            Reject
          </button>
        </div>
      )}
    </div>
  );
}
