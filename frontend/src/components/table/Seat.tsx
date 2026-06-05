/** Single player seat — self-contained unit with fixed, non-overlapping slots.
 *
 * Layout (top → bottom), each in its own slot so nothing collides:
 *   - action / fold badge   (above the avatar)
 *   - hole cards            (overlapping the top of the avatar)
 *   - avatar + circular timer ring (+ SB/BB corner chip)
 *   - nameplate (name + stack)
 *   - profit badge / show-cards button
 *
 * z-index scale: avatar 10, cards 20, badges/labels 30.
 */

import type { SeatData } from '../../types/ws';
import { formatIskCompact } from '../../lib/isk';
import { SeatAvatar } from './SeatAvatar';
import { Card, CardBack } from './Card';
import { SeatTimerRing } from './SeatTimerRing';

interface Props {
  seat: SeatData;
  x: number;
  y: number;
  isHero: boolean;
  isActionOn: boolean;
  shownCards?: string[];
  lastAction?: { action: string; amount: number; timestamp: number } | null;
  heroCards?: string[] | null;
  blindLabel?: 'SB' | 'BB' | null;
  canShowCards?: boolean;
  profit?: number;
  timerStart?: number | null;
  timerTimeout?: number;
  bankTimeActive?: boolean;
  onClickEmpty?: () => void;
  onShowCards?: () => void;
}

const ACTION_COLORS: Record<string, string> = {
  fold: 'bg-red/80 text-white',
  check: 'bg-green/80 text-black',
  call: 'bg-blue/80 text-white',
  bet: 'bg-orange/80 text-black',
  raise: 'bg-orange/80 text-black',
  allin: 'bg-red text-white',
};

function ActionBadge({ action, amount }: { action: string; amount: number }) {
  const cls = ACTION_COLORS[action] ?? 'bg-surface-light text-text';
  const label = action === 'allin' ? 'All-In'
    : action.charAt(0).toUpperCase() + action.slice(1);
  const showAmt = amount > 0 && action !== 'fold' && action !== 'check';
  return (
    <div className={`${cls} text-[11px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap shadow`}>
      {label}{showAmt ? ` ${formatIskCompact(amount)}` : ''}
    </div>
  );
}

function HoleCards({ cards, size, shown }: { cards: string[]; size: 'sm' | 'md' | 'lg'; shown?: boolean }) {
  return (
    <div className={`flex -space-x-1 rotate-[-3deg] ${shown ? 'animate-card-slide-in' : ''}`}>
      <Card card={cards[0]} size={size} />
      <div className="rotate-[6deg]">
        <Card card={cards[1]} size={size} />
      </div>
    </div>
  );
}

export function Seat({
  seat, x, y, isHero, isActionOn, shownCards, lastAction, heroCards,
  blindLabel, canShowCards, profit, timerStart, timerTimeout, bankTimeActive,
  onClickEmpty, onShowCards,
}: Props) {
  const isEmpty = seat.status === 'empty' || seat.user_id === null;
  const isFolded = seat.status === 'folded';
  const isSittingOut = seat.status === 'sitting_out';
  const isWaiting = seat.status === 'waiting';
  const dimmed = isFolded || isSittingOut || isWaiting;

  const hasHeroCards = isHero && heroCards && heroCards.length >= 2;
  const hasShownCards = shownCards && shownCards.length >= 2;
  const showCardBacks = !isHero && !isEmpty && !isFolded && !hasShownCards && !isWaiting && !isSittingOut;

  // One shared slot above the avatar: fold badge wins when folded, else the action badge.
  const topBadge = isFolded
    ? <div className="bg-red/70 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow">Fold</div>
    : (lastAction ? <ActionBadge action={lastAction.action} amount={lastAction.amount} /> : null);

  // Hero hole cards render larger so the player's own hand is the focal point.
  const cardSize: 'sm' | 'md' | 'lg' = isHero ? 'lg' : 'md';

  if (isEmpty) {
    return (
      <div
        className="absolute"
        style={{ left: `${x}%`, top: `${y}%`, transform: 'translate(-50%, -50%)' }}
      >
        <div
          className="w-14 h-14 md:w-16 md:h-16 lg:w-[72px] lg:h-[72px] rounded-full bg-surface/40 border-2 border-dashed border-surface-light/40 hover:border-green/40 hover:bg-surface/60 flex items-center justify-center cursor-pointer transition-all group"
          onClick={onClickEmpty}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-text-muted/40 group-hover:text-green/60 transition-colors">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </div>
      </div>
    );
  }

  return (
    <div
      className="absolute flex flex-col items-center"
      style={{ left: `${x}%`, top: `${y}%`, transform: 'translate(-50%, -50%)' }}
    >
      {/* Slot 1: action / fold badge (fixed height so the layout never jumps) */}
      <div className="h-6 flex items-end justify-center z-30">
        {topBadge}
      </div>

      {/* Slot 2 + 3: cards overlapping the avatar + timer ring */}
      <div className="relative flex flex-col items-center">
        {/* Hole cards / card backs — anchored above the avatar, not overlapping the nameplate */}
        {(hasHeroCards || hasShownCards || showCardBacks) && (
          <div className={`absolute left-1/2 -translate-x-1/2 z-20 ${isHero ? '-top-8' : '-top-5'}`}>
            {hasHeroCards && <HoleCards cards={heroCards!} size={cardSize} />}
            {hasShownCards && !hasHeroCards && <HoleCards cards={shownCards!} size="md" shown />}
            {showCardBacks && (
              <div className="flex -space-x-1 rotate-[-3deg]">
                <CardBack size="sm" />
                <div className="rotate-[6deg]"><CardBack size="sm" /></div>
              </div>
            )}
          </div>
        )}

        {/* Avatar with circular timer ring overlay */}
        <div className="relative z-10">
          {isActionOn && timerStart && timerTimeout && (
            <div className="absolute -inset-1 z-20 pointer-events-none">
              <SeatTimerRing
                isActive={isActionOn}
                startTime={timerStart}
                timeout={timerTimeout}
                bankTimeActive={bankTimeActive}
              />
            </div>
          )}
          <div className={`rounded-full ${isActionOn ? 'ring-2 ring-green/40' : ''}`}>
            <SeatAvatar portraitUrl={seat.portrait ?? ''} name={seat.name ?? ''} dimmed={dimmed} />
          </div>

          {/* SB/BB chip — top-right corner of the avatar */}
          {blindLabel && (
            <div className={`absolute -right-1 -top-1 z-30 text-[7px] md:text-[8px] font-bold px-1.5 py-0.5 rounded-sm text-white shadow ${
              blindLabel === 'SB' ? 'bg-blue' : 'bg-orange'
            }`}>
              {blindLabel}
            </div>
          )}
        </div>
      </div>

      {/* Slot 4: nameplate */}
      <div className="min-w-[70px] md:min-w-[84px] lg:min-w-[96px] mt-1 z-10">
        <div className="bg-surface/90 rounded-md px-2 md:px-2.5 py-0.5 md:py-1 text-center">
          <div className="text-[10px] md:text-xs text-text truncate max-w-[80px] md:max-w-[96px] font-semibold">
            {seat.name}
          </div>
          <div className="text-xs md:text-sm font-bold text-white">
            {formatIskCompact(seat.stack ?? 0)}
          </div>
        </div>
      </div>

      {/* Slot 5: show-cards button takes priority (actionable); otherwise the
          profit badge. Genuinely mutually exclusive so they never overlap — this
          matters on an uncontested win, where a winner can both show and profit. */}
      <div className="h-5 flex items-start justify-center z-30">
        {canShowCards ? (
          <button
            onClick={onShowCards}
            className="bg-green hover:bg-green-dim text-black text-[9px] font-bold px-2 py-0.5 rounded-full shadow-md transition-colors whitespace-nowrap"
          >
            Show Cards
          </button>
        ) : (profit !== undefined && profit > 0 && (
          <div className="text-green text-xs font-bold whitespace-nowrap animate-profit-float" style={{ animationDelay: '0.6s' }}>
            +{formatIskCompact(profit)}
          </div>
        ))}
      </div>
    </div>
  );
}
