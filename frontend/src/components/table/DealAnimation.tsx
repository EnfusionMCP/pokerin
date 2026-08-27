/** Brief deck flash in center when a new hand starts */

import { CardBack } from './Card';

interface Props {
  dealKey: number;
}

export function DealAnimation({ dealKey }: Props) {
  if (dealKey <= 0) return null;

  return (
    <div
      key={dealKey}
      className="absolute z-30 pointer-events-none"
      style={{
        left: '50%',
        top: '45%',
        transform: 'translate(-50%, -50%)',
        animation: 'badge-life 600ms ease-out both',
      }}
    >
      <div className="relative">
        <div className="absolute" style={{ top: -2, left: -1 }}><CardBack size="sm" /></div>
        <CardBack size="sm" />
      </div>
    </div>
  );
}
