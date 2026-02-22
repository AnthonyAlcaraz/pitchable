import { useState, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Send, AlertCircle } from 'lucide-react';
import { SlashCommandMenu } from './SlashCommandMenu.js';
import { useWorkflowStore } from '../../stores/workflow.store.js';
import { useAuthStore } from '../../stores/auth.store.js';
import { usePresentationStore } from '../../stores/presentation.store.js';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const phase = useWorkflowStore((s) => s.phase);
  const creditBalance = useAuthStore((s) => s.user?.creditBalance ?? null);
  const slideCount = usePresentationStore((s) => s.presentation?.slides?.length ?? 0);
  const { t } = useTranslation();
  const [value, setValue] = useState('');
  const [showCommands, setShowCommands] = useState(false);
  const [commandFilter, setCommandFilter] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setValue(text);

    // Detect slash command at start
    if (text.startsWith('/')) {
      const afterSlash = text.slice(1).split(' ')[0];
      setCommandFilter(afterSlash);
      setShowCommands(true);
    } else {
      setShowCommands(false);
    }

    // Auto-resize
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
    }
  };

  const handleSend = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue('');
    setShowCommands(false);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [value, disabled, onSend]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (showCommands) return; // slash menu handles its own keys
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleCommandSelect = (cmd: string) => {
    setValue(cmd);
    setShowCommands(false);
    textareaRef.current?.focus();
  };

  // Context-aware placeholder
  const placeholder = slideCount > 0
    ? 'What would you like to change or add to your slides?'
    : t('chat.input.placeholder');

  return (
    <div className="relative border-t border-border bg-card p-3">
      {showCommands && (
        <SlashCommandMenu
          filter={commandFilter}
          onSelect={handleCommandSelect}
          onClose={() => setShowCommands(false)}
        />
      )}
      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled || phase === 'generating'}
          rows={1}
          className="flex-1 resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-orange-500/50 focus:bg-background disabled:opacity-50"
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={disabled || phase === 'generating' || !value.trim()}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-orange-500 text-white transition-colors hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
      <div className="mt-1 flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {t('chat.input.hint')}
        </p>
        {creditBalance === 0 && (
          <p className="flex items-center gap-1 text-xs text-amber-400">
            <AlertCircle className="h-3 w-3" />
            {t('chat.input.low_credits')}
          </p>
        )}
      </div>
    </div>
  );
}
