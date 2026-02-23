import { Check } from 'lucide-react';

const STATUS_COLORS: Record<string, string> = {
  generating: '#E88D67',
  verifying: '#14b8a6',
  verified: '#22c55e',
  fixed: '#f59e0b',
  error: '#ef4444',
};

interface CircularProgressProps {
  /** Progress value 0-100 */
  percent: number;
  /** Outer diameter in pixels */
  size?: number;
  /** Stroke width */
  strokeWidth?: number;
  /** Track color (background ring) */
  trackColor?: string;
  /** Fill color — overrides status color */
  fillColor?: string;
  /** Optional label inside the circle */
  label?: string;
  /** Show checkmark when complete */
  showCheck?: boolean;
  /** Status for automatic color coding */
  status?: 'generating' | 'verifying' | 'verified' | 'fixed' | 'error';
  /** Indeterminate spinning mode */
  indeterminate?: boolean;
}

export function CircularProgress({
  percent,
  size = 40,
  strokeWidth = 3,
  trackColor,
  fillColor,
  label,
  showCheck = false,
  status = 'generating',
  indeterminate = false,
}: CircularProgressProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(percent, 100) / 100) * circumference;
  const color = fillColor ?? STATUS_COLORS[status] ?? STATUS_COLORS.generating;
  const track = trackColor ?? `${color}20`;
  const isComplete = percent >= 100 && showCheck;

  return (
    <div
      className="relative inline-flex items-center justify-center flex-shrink-0"
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        className={indeterminate ? 'animate-spin' : undefined}
        style={{ transform: indeterminate ? undefined : 'rotate(-90deg)' }}
      >
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={track}
          strokeWidth={strokeWidth}
        />
        {/* Progress arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={indeterminate ? circumference * 0.75 : offset}
          style={{
            transition: indeterminate ? 'none' : 'stroke-dashoffset 0.7s ease-out',
          }}
        />
      </svg>

      {/* Center content */}
      <div className="absolute inset-0 flex items-center justify-center">
        {isComplete ? (
          <Check className="text-current" style={{ width: size * 0.4, height: size * 0.4, color }} />
        ) : label ? (
          <span
            className="font-mono font-semibold tabular-nums leading-none"
            style={{ fontSize: size * 0.25, color }}
          >
            {label}
          </span>
        ) : null}
      </div>
    </div>
  );
}
