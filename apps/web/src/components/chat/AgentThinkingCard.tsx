import { useState, useEffect } from 'react';
import { PeachLogo } from '../icons/PeachLogo.js';

const THINKING_VERBS = [
  'Peachifying your ideas',
  'Squeezing insights',
  'Ripening the narrative',
  'Juicing the data',
  'Pitching and polishing',
  'Nectar-distilling brilliance',
  'Zesting your concepts',
  'Pulping through research',
  'Orchard-harvesting wisdom',
  'Fermenting genius',
  'Pit-stopping for clarity',
  'Blending the perfect pitch',
  'Caramelizing key points',
  'Sun-drying the facts',
  'Peach-pressing your story',
];

interface AgentThinkingCardProps {
  text: string;
}

export function AgentThinkingCard({ text }: AgentThinkingCardProps) {
  const [verbIndex, setVerbIndex] = useState(() =>
    Math.floor(Math.random() * THINKING_VERBS.length),
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setVerbIndex((prev) => (prev + 1) % THINKING_VERBS.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

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
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-orange-500/10">
          <PeachLogo className="h-5 w-5 animate-pulse" />
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">{text}</p>
          <p
            className="mt-0.5 text-xs font-medium"
            style={{
              backgroundImage: 'linear-gradient(to right, #fb923c, #ea580c, #171717)',
              backgroundSize: '200% 100%',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              color: 'transparent',
              animation: 'gradientShift 3s ease-in-out infinite',
            }}
          >
            {THINKING_VERBS[verbIndex]}...
          </p>
        </div>
      </div>
    </div>
  );
}
