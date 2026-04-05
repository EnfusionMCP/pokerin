/** Single player seat — Stake-style: avatar with name/stack below, green bet pills */

import { useEffect, useState } from 'react';
import type { SeatData } from '../../types/ws';
import { formatIskCompact } from '../../lib/isk';
import { SeatAvatar } from './SeatAvatar';
import { Card, CardBack } from './Card';

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

  return (
    <div className={`${cls} text-[11px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap`}>
      {label}{amount > 0 && action !== 'fold' && action !== 'check' ? ` ${formatIskCompact(amount)}` : ''}
    </div>
  );
}

function SeatTimerBar({ startTime, timeout }: { startTime: number; timeout: number }) {
  const [pct, setPct] = useState(100);

  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000;
      const remaining = Math.max(0, 1 - elapsed / timeout);
      setPct(remaining * 100);
      if (remaining <= 0) clearInterval(interval);
    }, 50);
    return () => clearInterval(interval);
  }, [startTime, timeout]);

  const isLow = pct < 25;

  return (
    <div
      className={`absolute bottom-0 left-0 h-[3px] rounded-full ${isLow ? 'bg-red' : 'bg-green'}`}
      style={{
        width: `${pct}%`,
        transition: 'width 0.05s linear, background-color 0.3s',
      }}
    />
  );
}

export function Seat({ seat, x, y, isHero, isActionOn, shownCards, lastAction, heroCards, blindLabel, canShowCards, profit, timerStart, timerTimeout, onClickEmpty, onShowCards }: Props) {
  const isEmpty = seat.status === 'empty' || seat.user_id === null;
  const isFolded = seat.status === 'folded';
  const isSittingOut = seat.status === 'sitting_out';
  const isWaiting = seat.status === 'waiting';
  const dimmed = isFolded || isSittingOut || isWaiting;

  const hasHeroCards = isHero && heroCards && heroCards.length >= 2;
  const hasShownCards = shownCards && shownCards.length >= 2;
  const showCardBacks = !isHero && !isEmpty && !isFolded && !hasShownCards && seat.status !== 'waiting';

  const showAction = !isFolded && lastAction !== null && lastAction !== undefined;
  const showFoldBadge = isFolded;

  return (
    <div
      className="absolute flex flex-col items-center gap-0.5"
      style={{
        left: `${x}%`,
        top: `${y}%`,
        transform: 'translate(-50%, -50%)',
      }}
    >
      {isEmpty ? (
        <div
          className="w-14 h-14 md:w-16 md:h-16 lg:w-[72px] lg:h-[72px] rounded-full bg-surface/40 border-2 border-dashed border-surface-light/40 hover:border-green/40 hover:bg-surface/60 flex items-center justify-center cursor-pointer transition-all group"
          onClick={onClickEmpty}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-text-muted/40 group-hover:text-green/60 transition-colors">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </div>
      ) : (
        <>
          {/* Action badge */}
          {showAction && (
            <div className="absolute -top-10 left-1/2 -translate-x-1/2 z-20">
              <ActionBadge action={lastAction!.action} amount={lastAction!.amount} />
            </div>
          )}
          {showFoldBadge && (
            <div className="absolute -top-10 left-1/2 -translate-x-1/2 z-20">
              <div className="bg-red/70 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">Fold</div>
            </div>
          )}

          {/* Avatar + cards container */}
          <div className="relative">
            {hasHeroCards && (
              <div className="absolute -top-5 left-1/2 -translate-x-1/2 flex -space-x-1 z-10 rotate-[-3deg]">
                <Card card={heroCards![0]} size="md" />
                <div className="rotate-[6deg]">
                  <Card card={heroCards![1]} size="md" />
                </div>
              </div>
            )}
            {hasShownCards && (
              <div className="absolute -top-5 left-1/2 -translate-x-1/2 flex -space-x-1 z-10 rotate-[-3deg] animate-card-slide-in">
                <Card card={shownCards![0]} size="md" />
                <div className="rotate-[6deg]">
                  <Card card={shownCards![1]} size="md" />
                </div>
              </div>
            )}
            {showCardBacks && (
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 flex -space-x-1 z-10 rotate-[-3deg]">
                <CardBack size="sm" />
                <div className="rotate-[6deg]">
                  <CardBack size="sm" />
                </div>
              </div>
            )}

            {/* Avatar */}
            <div className={`rounded-full ${isActionOn ? 'ring-2 ring-green ring-offset-2 ring-offset-transparent animate-seat-pulse' : ''}`}>
              <SeatAvatar
                portraitUrl={seat.portrait ?? ''}
                name={seat.name ?? ''}
                dimmed={dimmed}
              />
            </div>
          </div>

          {/* Name plate — compact dark pill */}
          <div className="relative min-w-[70px] md:min-w-[84px] lg:min-w-[96px]">
            <div className="bg-surface/90 rounded-md px-2 md:px-2.5 py-0.5 md:py-1 text-center">
              <div className="text-[10px] md:text-xs text-text truncate max-w-[80px] md:max-w-[96px] font-semibold">
                {seat.name}
              </div>
              <div className="text-xs md:text-sm font-bold text-white">
                {formatIskCompact(seat.stack ?? 0)}
              </div>
            </div>
            {/* Timer bar */}
            {isActionOn && timerStart && timerTimeout && (
              <SeatTimerBar startTime={timerStart} timeout={timerTimeout} />
            )}
          </div>

          {/* Blind label */}
          {blindLabel && (
            <div className={`absolute -right-1 -top-1 z-20 text-[7px] md:text-[8px] font-bold px-1.5 py-0.5 rounded-sm text-white ${
              blindLabel === 'SB' ? 'bg-blue' : 'bg-orange'
            }`}>
              {blindLabel}
            </div>
          )}

          {/* Profit badge */}
          {profit !== undefined && profit > 0 && (
            <div
              className="absolute -right-3 -top-2 z-20 text-green text-xs font-bold whitespace-nowrap animate-profit-float"
              style={{ animationDelay: '0.6s' }}
            >
              +{formatIskCompact(profit)}
            </div>
          )}

          {/* Show Cards button */}
          {canShowCards && (
            <button
              onClick={onShowCards}
              className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-green hover:bg-green-dim text-black text-[9px] font-bold px-2 py-0.5 rounded-full shadow-md transition-colors whitespace-nowrap z-20"
            >
              Show Cards
            </button>
          )}
        </>
      )}
    </div>
  );
}
