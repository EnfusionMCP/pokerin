/** Floating bet chip — green pill like Stake */

import { formatIskCompact } from '../../lib/isk';

interface Props {
  amount: number;
  x: number;
  y: number;
  collecting?: boolean;
}

export function BetChip({ amount, x, y, collecting }: Props) {
  if (amount <= 0) return null;

  return (
    <div
      className="absolute z-15 flex items-center gap-1 bg-green/95 rounded-full pl-1 pr-2 py-0.5 shadow-md ring-1 ring-black/30"
      style={{
        left: collecting ? '50%' : `${x}%`,
        top: collecting ? '30%' : `${y}%`,
        transform: `translate(-50%, -50%) scale(${collecting ? 0.4 : 1})`,
        opacity: collecting ? 0 : 1,
        transition: 'left 0.35s ease-in, top 0.35s ease-in, opacity 0.3s ease-in, transform 0.35s ease-in',
      }}
    >
      {/* little poker chip */}
      <span className="inline-block w-3 h-3 rounded-full border-2 border-white/80 bg-green-700" />
      <span className="text-xs font-extrabold text-black tabular-nums">
        {formatIskCompact(amount)}
      </span>
    </div>
  );
}
