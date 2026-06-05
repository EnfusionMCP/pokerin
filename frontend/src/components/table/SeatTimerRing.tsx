/** Circular timer ring that depletes clockwise — green → orange → red */

import { useEffect, useState } from 'react';

interface Props {
  isActive: boolean;
  startTime?: number | null;
  timeout?: number;
  bankTimeActive?: boolean;
}

export function SeatTimerRing({ isActive, startTime, timeout, bankTimeActive }: Props) {
  const [progress, setProgress] = useState(1);

  useEffect(() => {
    if (!isActive || !startTime || !timeout) {
      setProgress(1);
      return;
    }

    const interval = setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000;
      const remaining = Math.max(0, 1 - elapsed / timeout);
      setProgress(remaining);
    }, 50);

    return () => clearInterval(interval);
  }, [isActive, startTime, timeout]);

  if (!isActive) return null;

  const r = 26;
  const circumference = 2 * Math.PI * r;
  const strokeDashoffset = circumference * (1 - progress);

  // Color based on progress and bank time (check tightest threshold first)
  let color = '#22c55e'; // green
  if (bankTimeActive) {
    color = '#f59e0b'; // amber for bank time
  } else if (progress < 0.25) {
    color = '#ef4444'; // red
  } else if (progress < 0.5) {
    color = '#f97316'; // orange
  }

  return (
    <svg
      className="absolute inset-0 w-full h-full -rotate-90"
      viewBox="0 0 60 60"
      style={{ pointerEvents: 'none' }}
    >
      {/* Background circle */}
      <circle
        cx="30"
        cy="30"
        r={r}
        fill="none"
        stroke="rgba(255,255,255,0.06)"
        strokeWidth="2"
      />
      {/* Progress circle */}
      <circle
        cx="30"
        cy="30"
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeDasharray={circumference}
        strokeDashoffset={strokeDashoffset}
        strokeLinecap="round"
        style={{
          transition: 'stroke-dashoffset 0.25s linear, stroke 0.3s ease',
        }}
      />
    </svg>
  );
}
