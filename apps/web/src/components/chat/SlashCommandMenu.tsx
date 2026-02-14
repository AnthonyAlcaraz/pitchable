import { useEffect, useState } from 'react';

const COMMANDS = [
  { command: '/theme', description: 'Change theme' },
  { command: '/export', description: 'Export presentation' },
  { command: '/outline', description: 'Regenerate outline' },
  { command: '/regenerate', description: 'Regenerate a slide' },
  { command: '/images', description: 'Generate images' },
  { command: '/help', description: 'Show commands' },
];

interface SlashCommandMenuProps {
  filter: string;
  onSelect: (command: string) => void;
  onClose: () => void;
}

export function SlashCommandMenu({
  filter,
  onSelect,
  onClose,
}: SlashCommandMenuProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const filtered = COMMANDS.filter((c) =>
    c.command.startsWith(`/${filter}`),
  );

  useEffect(() => {
    setSelectedIndex(0);
  }, [filter]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        if (filtered[selectedIndex]) {
          onSelect(filtered[selectedIndex].command + ' ');
        }
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handler, true);
    return () => document.removeEventListener('keydown', handler, true);
  }, [filtered, selectedIndex, onSelect, onClose]);

  if (filtered.length === 0) return null;

  return (
    <div className="absolute bottom-full left-0 mb-1 w-64 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
      {filtered.map((cmd, i) => (
        <button
          key={cmd.command}
          type="button"
          className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm ${
            i === selectedIndex ? 'bg-purple-50 text-purple-700' : 'text-gray-700 hover:bg-gray-50'
          }`}
          onMouseDown={(e) => {
            e.preventDefault();
            onSelect(cmd.command + ' ');
          }}
        >
          <span className="font-mono font-medium">{cmd.command}</span>
          <span className="text-gray-400">{cmd.description}</span>
        </button>
      ))}
    </div>
  );
}
