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
      className="absolute z-15 flex items-center gap-0.5 bg-green/90 rounded-full px-2 py-0.5 shadow-md"
      style={{
        left: collecting ? '50%' : `${x}%`,
        top: collecting ? '30%' : `${y}%`,
        transform: `translate(-50%, -50%) scale(${collecting ? 0.4 : 1})`,
        opacity: collecting ? 0 : 1,
        transition: 'left 0.35s ease-in, top 0.35s ease-in, opacity 0.3s ease-in, transform 0.35s ease-in',
      }}
    >
      <span className="text-xs font-bold text-black">
        {formatIskCompact(amount)}
      </span>
    </div>
  );
}
