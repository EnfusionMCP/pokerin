/** Dealer button — positioned near the dealer seat */

interface Props {
  x: number;
  y: number;
}

export function DealerButton({ x, y }: Props) {
  return (
    <div
      className="absolute w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center shadow-lg z-10"
      style={{
        left: `${x}%`,
        top: `${y}%`,
        transform: 'translate(-50%, -50%)',
        background: 'linear-gradient(180deg, #ffffff 0%, #e8e8e8 60%, #d4d4d4 100%)',
        boxShadow: '0 2px 6px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.9)',
      }}
    >
      <span className="text-gray-800 text-xs md:text-sm font-bold" style={{ lineHeight: 1 }}>D</span>
    </div>
  );
}
