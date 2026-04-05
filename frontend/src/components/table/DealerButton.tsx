/** Dealer button */

interface Props {
  x: number;
  y: number;
}

export function DealerButton({ x, y }: Props) {
  return (
    <div
      className="absolute w-6 h-6 md:w-7 md:h-7 rounded-full flex items-center justify-center shadow-lg z-10"
      style={{
        left: `${x}%`,
        top: `${y}%`,
        transform: 'translate(-50%, -50%)',
        background: 'linear-gradient(180deg, #ffffff 0%, #e0e0e0 100%)',
        boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
      }}
    >
      <span className="text-gray-800 text-[10px] md:text-xs font-extrabold">D</span>
    </div>
  );
}
