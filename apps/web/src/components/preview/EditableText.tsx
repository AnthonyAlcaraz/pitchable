import { useState, useRef, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { MarkdownBody } from './MarkdownBody';

interface EditableTextProps {
  value: string;
  onSave: (newValue: string) => void;
  className?: string;
  placeholder?: string;
  multiline?: boolean;
}

export function EditableText({
  value,
  onSave,
  className,
  placeholder = 'Click to edit...',
  multiline = false,
}: EditableTextProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLTextAreaElement | HTMLInputElement>(null);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = useCallback(() => {
    setIsEditing(false);
    const trimmed = draft.trim();
    if (trimmed !== value) {
      onSave(trimmed);
    }
  }, [draft, value, onSave]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        setDraft(value);
        setIsEditing(false);
      } else if (e.key === 'Enter' && !multiline) {
        e.preventDefault();
        handleSave();
      } else if (e.key === 'Enter' && e.ctrlKey && multiline) {
        e.preventDefault();
        handleSave();
      }
    },
    [value, multiline, handleSave],
  );

  if (isEditing) {
    const sharedProps = {
      ref: inputRef as React.RefObject<HTMLTextAreaElement & HTMLInputElement>,
      value: draft,
      onChange: (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) =>
        setDraft(e.target.value),
      onBlur: handleSave,
      onKeyDown: handleKeyDown,
      className: cn(
        'w-full rounded border border-primary/50 bg-transparent px-1 py-0.5 text-inherit outline-none ring-1 ring-primary/20',
        className,
      ),
      placeholder,
    };

    if (multiline) {
      const lineCount = Math.max(4, (draft.match(/\n/g) || []).length + 2);
      return <textarea {...sharedProps} rows={Math.min(lineCount, 20)} className={cn(sharedProps.className, 'font-mono text-sm')} />;
    }
    return <input type="text" {...sharedProps} />;
  }

  if (multiline && value) {
    return (
      <div
        onClick={() => setIsEditing(true)}
        className={cn(
          'cursor-pointer rounded px-1 py-0.5 transition-colors hover:bg-primary/5 hover:ring-1 hover:ring-primary/20',
          className,
        )}
        title="Click to edit"
      >
        <MarkdownBody>{value}</MarkdownBody>
      </div>
    );
  }

  return (
    <span
      onClick={() => setIsEditing(true)}
      className={cn(
        'cursor-pointer rounded px-1 py-0.5 transition-colors hover:bg-primary/5 hover:ring-1 hover:ring-primary/20',
        !value && 'italic text-muted-foreground',
        className,
      )}
      title="Click to edit"
    >
      {value || placeholder}
    </span>
  );
}
