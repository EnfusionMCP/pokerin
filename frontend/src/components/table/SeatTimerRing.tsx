/** Bold circular countdown ring around the player whose turn it is.
 * Sweeps clockwise, green → orange → red, amber during bank time, with a
 * numeric seconds readout so it's obvious who's acting and how long they have. */

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
    if (!isActive || !startTime || !timeout) return;
    const tick = () => {
      const elapsed = (Date.now() - startTime) / 1000;
      setProgress(Math.max(0, 1 - elapsed / timeout));
    };
    const frame = requestAnimationFrame(tick);
    const id = setInterval(tick, 100);
    return () => {
      cancelAnimationFrame(frame);
      clearInterval(id);
    };
  }, [isActive, startTime, timeout]);

  if (!isActive) return null;

  const r = 27;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - progress);
  const secondsLeft = timeout ? Math.ceil(progress * timeout) : 0;

  let color = '#22c55e';
  if (bankTimeActive) color = '#f59e0b';
  else if (progress < 0.25) color = '#ef4444';
  else if (progress < 0.5) color = '#f97316';

  return (
    <>
      <svg
        className="absolute inset-0 w-full h-full -rotate-90"
        viewBox="0 0 60 60"
        style={{ pointerEvents: 'none', filter: `drop-shadow(0 0 4px ${color})` }}
      >
        <circle cx="30" cy="30" r={r} fill="none" stroke="rgba(0,0,0,0.45)" strokeWidth="4" />
        <circle
          cx="30" cy="30" r={r} fill="none" stroke={color} strokeWidth="4"
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.12s linear, stroke 0.3s ease' }}
        />
      </svg>
      {/* Seconds countdown under the avatar */}
      <div
        className="absolute left-1/2 -translate-x-1/2 -bottom-2 px-1.5 rounded-full text-[10px] font-extrabold tabular-nums shadow"
        style={{ background: color, color: bankTimeActive || progress >= 0.5 ? '#000' : '#fff' }}
      >
        {secondsLeft}{bankTimeActive ? '·bank' : ''}
      </div>
    </>
  );
}
