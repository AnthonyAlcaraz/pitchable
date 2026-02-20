import { useEffect, useState } from 'react';

interface CountdownBarProps {
  durationMs: number;
  startedAt: number;
  onTimeout?: () => void;
  className?: string;
}

export function CountdownBar({ durationMs, startedAt, onTimeout, className = '' }: CountdownBarProps) {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = Date.now() - startedAt;
      const remaining = Math.max(0, 100 - (elapsed / durationMs) * 100);
      setProgress(remaining);

      if (remaining <= 0) {
        clearInterval(interval);
        onTimeout?.();
      }
    }, 100);

    return () => clearInterval(interval);
  }, [durationMs, startedAt, onTimeout]);

  return (
    <div className={`h-1 w-full overflow-hidden rounded-full bg-muted ${className}`}>
      <div
        className="h-full rounded-full bg-primary transition-[width] duration-100 ease-linear"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
