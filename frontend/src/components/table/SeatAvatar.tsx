/** Circular character portrait */

interface Props {
  portraitUrl: string;
  name: string;
  dimmed?: boolean;
}

export function SeatAvatar({ portraitUrl, name, dimmed = false }: Props) {
  const hasUrl = portraitUrl && portraitUrl.length > 0;
  const cls = `w-14 h-14 md:w-16 md:h-16 lg:w-[72px] lg:h-[72px] rounded-full border-2 border-surface-light shadow-lg shadow-black/30 ${dimmed ? 'opacity-35 grayscale' : ''}`;

  if (!hasUrl) {
    return (
      <div className={`${cls} bg-surface flex items-center justify-center text-text-muted text-lg font-bold`}>
        {name.charAt(0).toUpperCase() || '?'}
      </div>
    );
  }

  return <img src={portraitUrl} alt={name} className={cls} />;
}
