/** Poker table felt — matches Stake's green oval with dark rail */

export function Felt({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="relative w-full max-w-[1200px] mx-auto"
      style={{ aspectRatio: '2.2 / 1' }}
    >
      {/* Dark outer rail */}
      <div
        className="absolute inset-0 rounded-[50%]"
        style={{
          background: 'linear-gradient(180deg, #1a3a2a 0%, #0f2a1c 50%, #0a1f14 100%)',
          padding: '4px',
          boxShadow: '0 4px 30px rgba(0,0,0,0.5)',
        }}
      >
        {/* Inner felt */}
        <div
          className="w-full h-full rounded-[50%] relative overflow-hidden"
          style={{
            background: 'radial-gradient(ellipse at 50% 40%, #2d8a4e 0%, #1a6e3c 30%, #145a30 60%, #0f4a26 100%)',
            boxShadow: 'inset 0 0 60px rgba(0,0,0,0.35), inset 0 0 120px rgba(0,0,0,0.15)',
          }}
        >
          {/* Cloth texture */}
          <div
            className="absolute inset-0 pointer-events-none opacity-[0.03]"
            style={{
              backgroundImage: `
                repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.4) 2px, transparent 4px),
                repeating-linear-gradient(90deg, transparent, transparent 2px, rgba(0,0,0,0.4) 2px, transparent 4px)
              `,
              backgroundSize: '4px 4px',
            }}
          />

          {/* Watermark */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
            <span className="text-white/[0.06] text-6xl md:text-7xl lg:text-8xl font-extrabold tracking-wider italic">
              pokerin
            </span>
          </div>
        </div>
      </div>

      {/* Content layer */}
      <div className="absolute inset-0">
        {children}
      </div>
    </div>
  );
}
