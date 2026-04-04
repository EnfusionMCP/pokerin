/** Brief deck flash in center when a new hand starts */

import { useState, useEffect, useRef } from 'react';
import { CardBack } from './Card';

interface Props {
  dealKey: number;
}

export function DealAnimation({ dealKey }: Props) {
  const [visible, setVisible] = useState(false);
  const prevKey = useRef(dealKey);

  useEffect(() => {
    if (dealKey <= 0 || dealKey === prevKey.current) return;
    prevKey.current = dealKey;
    setVisible(true);
    const t = setTimeout(() => setVisible(false), 600);
    return () => clearTimeout(t);
  }, [dealKey]);

  if (!visible) return null;

  return (
    <div
      className="absolute z-30 pointer-events-none"
      style={{ left: '50%', top: '45%', transform: 'translate(-50%, -50%)', opacity: 0.8 }}
    >
      <div className="relative">
        <div className="absolute" style={{ top: -2, left: -1 }}><CardBack size="sm" /></div>
        <CardBack size="sm" />
      </div>
    </div>
  );
}
