/** Single player seat around the table */

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
  fold: 'bg-gray-600/90',
  check: 'bg-emerald-600/90',
  call: 'bg-blue-600/90',
  bet: 'bg-amber-600/90',
  raise: 'bg-amber-600/90',
  allin: 'bg-red-600/90',
};

function ActionBadge({ action, amount }: { action: string; amount: number }) {
  const bg = ACTION_COLORS[action] ?? 'bg-gray-600/90';
  const label = action === 'allin' ? 'All-In'
    : action.charAt(0).toUpperCase() + action.slice(1);

  return (
    <div className={`${bg} text-white text-[11px] md:text-xs font-semibold px-2.5 py-0.5 rounded-full whitespace-nowrap shadow-md backdrop-blur-sm`}>
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
      className={`absolute inset-0 z-0 rounded-b-lg ${isLow ? 'bg-red-600/80' : 'bg-purple-500/60'}`}
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
          className="w-14 h-14 md:w-16 md:h-16 lg:w-[72px] lg:h-[72px] rounded-full bg-gray-800/40 border border-gray-700/50 border-dashed hover:border-gold/40 hover:bg-gray-800/60 flex items-center justify-center cursor-pointer transition-all group"
          onClick={onClickEmpty}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-gray-600 group-hover:text-gold/60 transition-colors">
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
              <div className="bg-gray-600/80 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full shadow-sm backdrop-blur-sm">Fold</div>
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

            {/* Avatar with action-on glow */}
            <div className={`rounded-full ${isActionOn ? 'ring-2 ring-gold ring-offset-2 ring-offset-transparent animate-seat-pulse' : ''}`}>
              <SeatAvatar
                portraitUrl={seat.portrait ?? ''}
                name={seat.name ?? ''}
                dimmed={dimmed}
              />
            </div>
          </div>

          {/* Name plate */}
          <div className="relative rounded-lg overflow-hidden min-w-[70px] md:min-w-[84px] lg:min-w-[96px] shadow-md">
            {/* Timer background */}
            {isActionOn && timerStart && timerTimeout && (
              <SeatTimerBar startTime={timerStart} timeout={timerTimeout} />
            )}
            {/* Content */}
            <div className={`px-2 md:px-2.5 py-0.5 md:py-1 text-center relative z-[1] ${
              isHero
                ? 'bg-gradient-to-b from-purple-700/90 to-purple-800/90'
                : isActionOn
                  ? 'bg-gradient-to-b from-purple-800/70 to-purple-900/70'
                  : 'bg-gradient-to-b from-gray-800/90 to-gray-900/90'
            }`}>
              <div className="text-[10px] md:text-xs text-gray-300 truncate max-w-[80px] md:max-w-[96px] font-medium">
                {seat.name}
              </div>
              <div className="text-xs md:text-sm font-bold text-white font-mono tracking-tight">
                {formatIskCompact(seat.stack ?? 0)}
              </div>
            </div>
          </div>

          {/* Blind label */}
          {blindLabel && (
            <div className={`absolute -right-1 -top-1 z-20 text-[7px] md:text-[8px] font-bold px-1.5 py-0.5 rounded-sm text-white shadow-sm ${
              blindLabel === 'SB' ? 'bg-blue-500/90' : 'bg-amber-500/90'
            }`}>
              {blindLabel}
            </div>
          )}

          {/* Profit badge */}
          {profit !== undefined && profit > 0 && (
            <div
              className="absolute -right-3 -top-2 z-20 text-green-400 text-xs font-bold font-mono whitespace-nowrap animate-profit-float"
              style={{ animationDelay: '0.6s' }}
            >
              +{formatIskCompact(profit)}
            </div>
          )}

          {/* Show Cards button */}
          {canShowCards && (
            <button
              onClick={onShowCards}
              className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-gold hover:bg-gold-light text-black text-[9px] font-bold px-2 py-0.5 rounded-full shadow-md transition-colors whitespace-nowrap z-20"
            >
              Show Cards
            </button>
          )}
        </>
      )}
    </div>
  );
}
