import { Loader2 } from 'lucide-react';

interface AgentThinkingCardProps {
  text: string;
}

export function AgentThinkingCard({ text }: AgentThinkingCardProps) {
  return (
    <div className="relative overflow-hidden p-4">
      {/* Animated gradient shimmer at top */}
      <div
        className="absolute inset-x-0 top-0 h-0.5"
        style={{
          background: 'linear-gradient(90deg, transparent, #f97316, transparent)',
          animation: 'shimmer 2s ease-in-out infinite',
        }}
      />

      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">{text}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Working on your request...
          </p>
        </div>
      </div>
    </div>
  );
}
