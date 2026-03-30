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

  const ringColor = isDanger ? '#ff2a2a' : isWarning ? '#ffaa00' : '#00aaff';
  const glowColor = isDanger ? 'rgba(255,42,42,0.6)' : isWarning ? 'rgba(255,170,0,0.4)' : 'rgba(0,170,255,0.4)';

  return (
    <div
      className="relative flex items-center justify-center p-2"
      style={{
        width: size,
        height: size,
        filter: isDanger ? `drop-shadow(0 0 12px ${glowColor})` : `drop-shadow(0 0 4px ${glowColor})`,
        animation: isDanger ? 'timerDangerPulse 0.6s ease-in-out infinite' : undefined,
      }}
    >
      <style>{`
        @keyframes timerDangerPulse {
          0%, 100% { filter: drop-shadow(0 0 8px rgba(255,42,42,0.4)); opacity: 1; }
          50% { filter: drop-shadow(0 0 20px rgba(255,42,42,0.9)); opacity: 0.8; }
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
