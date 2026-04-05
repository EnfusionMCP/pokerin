/** Pot display — center of table */

import type { PotData } from '../../types/ws';
import { formatIskCompact } from '../../lib/isk';
import { useAnimatedValue } from '../../hooks/useAnimatedValue';

interface Props {
  pots: PotData[];
}

export function PotDisplay({ pots }: Props) {
  const total = pots.reduce((sum, p) => sum + p.amount, 0);
  const animated = useAnimatedValue(total);

  if (total <= 0 && animated <= 0) return null;

  return (
    <div className="absolute left-1/2 top-[28%] -translate-x-1/2 flex flex-col items-center gap-1 z-10">
      <div className="flex items-center gap-1.5 bg-black/40 rounded-full px-3 py-1">
        <span className="text-text-muted text-xs font-bold">Pot:</span>
        <span className="text-sm font-bold text-white">
          {formatIskCompact(animated)}
        </span>
      </div>

      {pots.length > 1 && pots.slice(1).map((p, i) => (
        <div key={i} className="text-[10px] text-text-muted bg-black/30 rounded-full px-2 py-0.5 font-semibold">
          Side: <span className="text-white">{formatIskCompact(p.amount)}</span>
        </div>
      ))}
    </div>
  );
}
