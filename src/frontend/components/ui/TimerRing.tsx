import React, { useEffect, useRef } from 'react';

interface TimerRingProps {
  secondsTotal: number;
  secondsLeft: number;
  size?: number;
}

/**
 * Cronómetro visual SVG con anillo de progreso, zonas de color y animaciones de presión.
 */
export const TimerRing: React.FC<TimerRingProps> = ({ secondsTotal, secondsLeft, size = 80 }) => {
  const pct = secondsLeft / secondsTotal;
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - pct);

  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const timeStr = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

  // Color zones
  const isWarning = pct < 0.33;
  const isDanger = pct < 0.15;

  const ringColor = isDanger ? '#ef4444' : isWarning ? '#f59e0b' : '#3b82f6';
  const glowColor = isDanger ? 'rgba(239,68,68,0.4)' : isWarning ? 'rgba(245,158,11,0.3)' : 'rgba(59,130,246,0.3)';

  return (
    <div
      className="relative flex items-center justify-center"
      style={{
        width: size,
        height: size,
        filter: isDanger ? `drop-shadow(0 0 8px ${glowColor})` : undefined,
        animation: isDanger ? 'timerPulse 0.8s ease-in-out infinite' : undefined,
      }}
    >
      <style>{`
        @keyframes timerPulse {
          0%, 100% { filter: drop-shadow(0 0 6px rgba(239,68,68,0.4)); }
          50% { filter: drop-shadow(0 0 16px rgba(239,68,68,0.8)); }
        }
      `}</style>

      <svg width={size} height={size} className="-rotate-90">
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#1e293b"
          strokeWidth={6}
        />
        {/* Progress */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={ringColor}
          strokeWidth={6}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          style={{ transition: 'stroke-dashoffset 0.9s linear, stroke 0.5s ease' }}
        />
      </svg>

      {/* Time text */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span
          className="font-mono font-black tabular-nums"
          style={{
            fontSize: size < 72 ? '0.65rem' : '0.85rem',
            color: ringColor,
            letterSpacing: '-0.05em',
          }}
        >
          {timeStr}
        </span>
      </div>
    </div>
  );
};
