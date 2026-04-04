/** Floating bet chip — positioned between player and table center */

import { formatIskCompact } from '../../lib/isk';

interface Props {
  amount: number;
  x: number;
  y: number;
  collecting?: boolean;
}

function ChipIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0">
      <circle cx="7" cy="7" r="6.5" fill="#c9a84c" stroke="#a8893a" strokeWidth="1" />
      <circle cx="7" cy="7" r="4" fill="none" stroke="#a8893a" strokeWidth="0.8" strokeDasharray="2 1.5" />
    </svg>
  );
}

export function BetChip({ amount, x, y, collecting }: Props) {
  if (amount <= 0) return null;

  return (
    <div
      className="absolute z-15 flex items-center gap-1 bg-black/50 backdrop-blur-sm rounded-full px-1.5 py-0.5 shadow-md"
      style={{
        left: collecting ? '50%' : `${x}%`,
        top: collecting ? '30%' : `${y}%`,
        transform: `translate(-50%, -50%) scale(${collecting ? 0.4 : 1})`,
        opacity: collecting ? 0 : 1,
        transition: 'left 0.35s ease-in, top 0.35s ease-in, opacity 0.3s ease-in, transform 0.35s ease-in',
      }}
    >
      <ChipIcon />
      <span className="text-xs md:text-sm font-bold text-gold font-mono">
        {formatIskCompact(amount)}
      </span>
    </div>
  );
}
