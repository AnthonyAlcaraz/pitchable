import { useState, useRef, useCallback } from 'react';
import { Send } from 'lucide-react';
import { SlashCommandMenu } from './SlashCommandMenu.js';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
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

  return (
    <div className="relative border-t border-gray-200 bg-white p-3">
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
          placeholder="Describe your presentation or type / for commands..."
          disabled={disabled}
          rows={1}
          className="flex-1 resize-none rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none transition-colors placeholder:text-gray-400 focus:border-purple-300 focus:bg-white disabled:opacity-50"
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={disabled || !value.trim()}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-purple-600 text-white transition-colors hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
      <p className="mt-1 text-xs text-gray-400">
        Enter to send, Shift+Enter for newline
      </p>
    </div>
  );
}
