/** Community cards displayed in the center of the table */

import { Card } from './Card';

interface Props {
  cards: string[];
}

export function CommunityCards({ cards }: Props) {
  if (cards.length === 0) return null;

  return (
    <div className="absolute left-1/2 top-[50%] -translate-x-1/2 -translate-y-1/2 flex gap-1.5 scale-[0.6] md:scale-100">
      {cards.map((c, i) => (
        <div
          key={c}
          className="animate-card-slide-in"
          style={{ animationDelay: cards.length === 3 ? `${i * 60}ms` : '0ms' }}
        >
          <Card card={c} size="lg" />
        </div>
      ))}
    </div>
  );
}
