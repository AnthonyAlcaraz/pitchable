import { NODE_COLORS, NODE_TYPE_LABELS } from './graph-types';

interface TypeFilterChipsProps {
  availableTypes: string[];
  activeTypes: Set<string>;
  onToggle: (type: string) => void;
}

export function TypeFilterChips({ availableTypes, activeTypes, onToggle }: TypeFilterChipsProps) {
  if (availableTypes.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5 px-1">
      {availableTypes.map((type) => {
        const active = activeTypes.has(type);
        const color = NODE_COLORS[type] ?? '#6b7280';
        const label = NODE_TYPE_LABELS[type] ?? type;

        return (
          <button
            key={type}
            onClick={() => onToggle(type)}
            className="px-2 py-0.5 rounded-full text-xs font-medium transition-all border"
            style={{
              backgroundColor: active ? `${color}20` : 'transparent',
              borderColor: active ? color : '#374151',
              color: active ? color : '#6b7280',
              opacity: active ? 1 : 0.5,
            }}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
