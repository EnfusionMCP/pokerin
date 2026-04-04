/** Single playing card — CSS-styled with premium feel */

import { parseCard } from '../../lib/cards';

interface Props {
  card: string;
  size?: 'sm' | 'md' | 'lg';
}

const SIZES = {
  sm: { w: 40, h: 56, corner: 10, pip: 20, cornerSuit: 8 },
  md: { w: 56, h: 78, corner: 13, pip: 28, cornerSuit: 10 },
  lg: { w: 72, h: 100, corner: 16, pip: 36, cornerSuit: 13 },
};

export function Card({ card, size = 'md' }: Props) {
  const { rankDisplay, suitSymbol, color } = parseCard(card);
  const s = SIZES[size];

  return (
    <div
      className="relative inline-block rounded-lg select-none overflow-hidden"
      style={{
        width: s.w,
        height: s.h,
        background: 'linear-gradient(170deg, #ffffff 0%, #f8f7f4 40%, #f2f0eb 100%)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.2), 0 4px 8px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.8)',
      }}
    >
      {/* Top-left corner */}
      <div className="absolute top-[2px] left-[3px] flex flex-col items-center leading-none">
        <span className="font-bold" style={{ fontSize: s.corner, color, lineHeight: 1 }}>
          {rankDisplay}
        </span>
        <span style={{ fontSize: s.cornerSuit, color, lineHeight: 1, marginTop: -1 }}>
          {suitSymbol}
        </span>
      </div>

      {/* Center pip */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span style={{ fontSize: s.pip, color, lineHeight: 1, opacity: 0.9 }}>
          {suitSymbol}
        </span>
      </div>

      {/* Bottom-right corner */}
      <div
        className="absolute bottom-[2px] right-[3px] flex flex-col items-center leading-none"
        style={{ transform: 'rotate(180deg)' }}
      >
        <span className="font-bold" style={{ fontSize: s.corner, color, lineHeight: 1 }}>
          {rankDisplay}
        </span>
        <span style={{ fontSize: s.cornerSuit, color, lineHeight: 1, marginTop: -1 }}>
          {suitSymbol}
        </span>
      </div>
    </div>
  );
}

export function CardBack({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const s = SIZES[size];

  return (
    <div
      className="relative inline-block rounded-lg select-none overflow-hidden"
      style={{
        width: s.w,
        height: s.h,
        boxShadow: '0 1px 3px rgba(0,0,0,0.2), 0 4px 8px rgba(0,0,0,0.15)',
      }}
    >
      {/* Outer frame — deep crimson */}
      <div className="absolute inset-0" style={{ background: 'linear-gradient(170deg, #c62828 0%, #991b1b 50%, #7f1d1d 100%)' }} />
      {/* Inner pattern area */}
      <div
        className="absolute inset-[3px] rounded-sm"
        style={{
          background: `
            repeating-linear-gradient(
              45deg,
              transparent,
              transparent 3px,
              rgba(255,255,255,0.06) 3px,
              rgba(255,255,255,0.06) 6px
            ),
            linear-gradient(170deg, #b71c1c 0%, #8b1a1a 100%)
          `,
          border: '1px solid rgba(255,255,255,0.1)',
        }}
      />
      {/* Center diamond */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className="rounded-sm"
          style={{
            width: s.w * 0.28,
            height: s.w * 0.28,
            background: 'linear-gradient(135deg, rgba(201, 168, 76, 0.2), rgba(201, 168, 76, 0.08))',
            transform: 'rotate(45deg)',
            border: '1px solid rgba(201, 168, 76, 0.15)',
          }}
        />
      </div>
    </div>
  );
}
