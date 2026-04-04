/** Pot display with chip stack icon — centered above community cards */

import type { PotData } from '../../types/ws';
import { formatIskCompact } from '../../lib/isk';
import { useAnimatedValue } from '../../hooks/useAnimatedValue';

interface Props {
  pots: PotData[];
}

function ChipStackIcon() {
  return (
    <svg width="18" height="16" viewBox="0 0 18 16" fill="none" className="shrink-0">
      <ellipse cx="9" cy="13" rx="8" ry="3" fill="#a8893a" stroke="#8a6f2e" strokeWidth="0.5" />
      <ellipse cx="9" cy="10" rx="8" ry="3" fill="#c9a84c" stroke="#a8893a" strokeWidth="0.5" />
      <ellipse cx="9" cy="7" rx="8" ry="3" fill="#e8d48b" stroke="#c9a84c" strokeWidth="0.5" />
      <ellipse cx="9" cy="7" rx="4.5" ry="1.7" fill="none" stroke="#c9a84c" strokeWidth="0.6" strokeDasharray="1.5 1" />
    </svg>
  );
}

export function PotDisplay({ pots }: Props) {
  const total = pots.reduce((sum, p) => sum + p.amount, 0);
  const animated = useAnimatedValue(total);

  if (total <= 0 && animated <= 0) return null;

  return (
    <div className="absolute left-1/2 top-[28%] -translate-x-1/2 flex flex-col items-center gap-1 z-10">
      {/* Main pot */}
      <div className="flex items-center gap-2 bg-black/50 backdrop-blur-sm border border-gold/15 rounded-xl px-4 py-1.5 shadow-lg shadow-black/20">
        <ChipStackIcon />
        <span className="text-sm md:text-base font-bold text-gold font-mono tracking-tight">
          {formatIskCompact(animated)}
        </span>
      </div>

      {/* Side pots */}
      {pots.length > 1 && pots.slice(1).map((p, i) => (
        <div key={i} className="text-[10px] md:text-xs text-gray-400 bg-black/30 backdrop-blur-sm rounded-full px-2.5 py-0.5">
          Side: <span className="text-gold font-mono">{formatIskCompact(p.amount)}</span>
        </div>
      ))}
    </div>
  );
}
