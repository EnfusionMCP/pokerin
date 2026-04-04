/** Circular EVE character portrait — responsive sizing with depth shadow */

interface Props {
  portraitUrl: string;
  name: string;
  dimmed?: boolean;
}

export function SeatAvatar({ portraitUrl, name, dimmed = false }: Props) {
  const hasUrl = portraitUrl && portraitUrl.length > 0;
  const cls = `w-14 h-14 md:w-16 md:h-16 lg:w-[72px] lg:h-[72px] rounded-full border-2 border-gray-600/80 shadow-lg shadow-black/30 ${dimmed ? 'opacity-40 grayscale' : ''}`;

  if (!hasUrl) {
    return (
      <div className={`${cls} bg-gradient-to-b from-gray-700 to-gray-800 flex items-center justify-center text-gray-400 text-lg font-display font-bold`}>
        {name.charAt(0).toUpperCase() || '?'}
      </div>
    );
  }

  return (
    <img
      src={portraitUrl}
      alt={name}
      className={cls}
    />
  );
}
