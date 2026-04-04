/** The oval poker table felt with gold rail, inner line, and cloth texture */

export function Felt({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="relative w-full max-w-[1200px] mx-auto"
      style={{ aspectRatio: '2.2 / 1' }}
    >
      {/* Outer rail shadow */}
      <div
        className="absolute -inset-1 rounded-[50%]"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 60%, rgba(0,0,0,0.4) 100%)',
          filter: 'blur(8px)',
        }}
      />

      {/* Gold rail border */}
      <div
        className="absolute inset-0 rounded-[50%]"
        style={{
          background: 'linear-gradient(180deg, #d4b85c 0%, #a8893a 50%, #8a6f2e 100%)',
          padding: '3px',
        }}
      >
        {/* Felt surface */}
        <div
          className="w-full h-full rounded-[50%] relative overflow-hidden"
          style={{
            background: 'radial-gradient(ellipse at center, #11703a 0%, #0d5c2e 35%, #0a4a24 65%, #073d1c 100%)',
            boxShadow: 'inset 0 0 80px rgba(0,0,0,0.4), inset 0 0 20px rgba(0,0,0,0.2)',
          }}
        >
          {/* Cloth grain texture */}
          <div
            className="absolute inset-0 pointer-events-none opacity-[0.04]"
            style={{
              backgroundImage: `
                repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.3) 2px, transparent 4px),
                repeating-linear-gradient(90deg, transparent, transparent 2px, rgba(0,0,0,0.3) 2px, transparent 4px)
              `,
              backgroundSize: '4px 4px',
            }}
          />

          {/* Inner felt line — like a real poker table */}
          <div
            className="absolute rounded-[50%] pointer-events-none"
            style={{
              top: '12%',
              left: '6%',
              right: '6%',
              bottom: '12%',
              border: '1px solid rgba(201, 168, 76, 0.08)',
            }}
          />

          {/* Watermark */}
          <div className="absolute inset-0 flex items-end justify-center pb-[18%] pointer-events-none select-none">
            <span className="text-white/[0.04] font-display text-5xl md:text-6xl lg:text-7xl font-bold tracking-[0.25em]">
              pokerin.space
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
