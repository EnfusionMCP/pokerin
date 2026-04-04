/** Community cards displayed in the center of the table */

import { useRef, useEffect } from 'react';
import { Card } from './Card';

interface Props {
  cards: string[];
}

export function CommunityCards({ cards }: Props) {
  // Track how many cards we've already shown so only new ones animate
  const prevCount = useRef(0);
  const newStartIdx = cards.length === 0 ? 0 : prevCount.current;

  // Update ref AFTER render, not during (React StrictMode safe)
  useEffect(() => {
    prevCount.current = cards.length;
  }, [cards.length]);

  if (cards.length === 0) return null;

  return (
    <div className="absolute left-1/2 top-[50%] -translate-x-1/2 -translate-y-1/2 flex gap-1.5">
      {cards.map((c, i) => (
        <div
          key={c}
          className={i >= newStartIdx ? 'animate-card-slide-in' : ''}
          style={i >= newStartIdx ? { animationDelay: `${(i - newStartIdx) * 60}ms` } : undefined}
        >
          <Card card={c} size="lg" />
        </div>
      ))}
    </div>
  );
}
