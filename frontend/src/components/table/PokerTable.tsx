/** Main poker table — composes felt, seats, cards, pot, dealer, actions */

import { useState, useMemo } from 'react';
import { useTableStore } from '../../stores/tableStore';
import { useLobbyStore } from '../../stores/lobbyStore';
import { getPositions, getPositionsPortrait, getDealerPosition, getBetPosition } from '../../lib/positions';
import { formatIskCompact } from '../../lib/isk';
import { evaluateHandStrength } from '../../lib/handStrength';
import { Felt } from './Felt';
import { Seat } from './Seat';
import { BetChip } from './BetChip';
import { CommunityCards } from './CommunityCards';
import { PotDisplay } from './PotDisplay';
import { DealerButton } from './DealerButton';
import { DealAnimation } from './DealAnimation';
import { ActionPanel } from './ActionPanel';
import { PreActionBar } from './PreActionBar';
import { SitDialog } from './SitDialog';

export function PokerTable({ spectator = false }: { spectator?: boolean }) {
  const seats = useTableStore((s) => s.seats);
  const community = useTableStore((s) => s.community);
  const pots = useTableStore((s) => s.pots);
  const dealer = useTableStore((s) => s.dealer);
  const actionOn = useTableStore((s) => s.actionOn);
  const mySeat = useTableStore((s) => s.mySeat);
  const myCards = useTableStore((s) => s.myCards);
  const shownCards = useTableStore((s) => s.shownCards);
  const lastActions = useTableStore((s) => s.lastActions);
  const blinds = useTableStore((s) => s.blinds);
  const tableId = useTableStore((s) => s.tableId);
  const tableName = useTableStore((s) => s.tableName);
  const winners = useTableStore((s) => s.winners);
  const handStartStacks = useTableStore((s) => s.handStartStacks);

  const dealKey = useTableStore((s) => s.dealKey);
  const [sitSeat, setSitSeat] = useState<number | null>(null);

  // Look up table config from lobby store for min/max buyin
  const tables = useLobbyStore((s) => s.tables);
  const tableConfig = tables.find((t) => t.table_id === tableId);
  const minBuyin = tableConfig?.min_buyin ?? (blinds.big > 0 ? blinds.big * 40 : 0);
  const maxBuyin = tableConfig?.max_buyin ?? (blinds.big > 0 ? blinds.big * 100 : 0);

  const maxSeats = seats.length || 9;
  const heroSeat = mySeat >= 0 ? mySeat : 0;
  // Use portrait layout on mobile (below md breakpoint = 768px), horizontal on desktop
  const isPortrait = typeof window !== 'undefined' && window.innerWidth < 768;
  const positions = isPortrait ? getPositionsPortrait(heroSeat, maxSeats) : getPositions(heroSeat, maxSeats);

  // Dealer button position
  const dealerPos = dealer >= 0 && dealer < maxSeats
    ? getDealerPosition(positions[dealer])
    : null;

  // Can only sit if not already seated and authenticated
  const canSit = !spectator && mySeat < 0 && maxBuyin > 0;

  // (dealTargets removed — DealAnimation simplified to just show a deck flash)

  // Compute SB/BB seat indices from dealer position
  const blindLabels = useMemo(() => {
    const labels: Record<number, 'SB' | 'BB'> = {};
    if (dealer < 0) return labels;
    const activeSeatIndices = seats
      .map((s, i) => (s.user_id !== null ? i : -1))
      .filter((i) => i >= 0);
    if (activeSeatIndices.length < 2) return labels;

    function nextActive(from: number): number {
      for (let step = 1; step <= maxSeats; step++) {
        const idx = (from + step) % maxSeats;
        if (activeSeatIndices.includes(idx)) return idx;
      }
      return -1;
    }

    if (activeSeatIndices.length === 2) {
      // Heads-up: dealer is SB
      labels[dealer] = 'SB';
      labels[nextActive(dealer)] = 'BB';
    } else {
      labels[nextActive(dealer)] = 'SB';
      labels[nextActive(nextActive(dealer))] = 'BB';
    }
    return labels;
  }, [dealer, seats, maxSeats]);

  // Hero can show cards at showdown (any player, not just winners)
  const heroCanShow = winners.length > 0
    && mySeat >= 0
    && !shownCards[String(mySeat)]
    && myCards !== null;

  const send = useTableStore((s) => s.send);
  const phase = useTableStore((s) => s.phase);
  const promptTimerStart = useTableStore((s) => s.promptTimerStart);
  const actionTimeout = useTableStore((s) => s.actionTimeout);
  const collectingBets = useTableStore((s) => s.collectingBets);

  // Hand strength indicator
  const handStrength = useMemo(() => {
    if (!myCards || myCards.length < 2) return '';
    return evaluateHandStrength(myCards, community);
  }, [myCards, community]);

  // Calculate profit per seat for winners
  // profit = current_stack - stack_at_hand_start (positive = they won more than they put in)
  const winnerProfits = useMemo(() => {
    const profits: Record<number, number> = {};
    for (const w of winners) {
      const startStack = handStartStacks[w.seat];
      if (startStack !== undefined) {
        // Find the seat's current stack
        const currentStack = seats[w.seat]?.stack ?? 0;
        profits[w.seat] = currentStack - startStack;
      }
    }
    return profits;
  }, [winners, handStartStacks, seats]);

  return (
    <>
      <Felt>
        {/* Pot */}
        <PotDisplay pots={pots} />

        {/* Community cards */}
        <CommunityCards cards={community} />

        {/* Secondary pot below community cards */}
        {pots.length > 0 && community.length > 0 && winners.length === 0 && (
          <div className="absolute left-1/2 top-[58%] -translate-x-1/2 flex items-center gap-1.5 bg-black/30 rounded-full px-2.5 py-0.5">
            <span className="text-xs text-text-muted font-bold">Pot:</span>
            <span className="text-xs text-white font-bold">
              {formatIskCompact(pots.reduce((s, p) => s + p.amount, 0))}
            </span>
          </div>
        )}

        {/* Winner info — below community cards, delayed 300ms after card reveal */}
        {winners.length > 0 && (
          <div
            className="absolute left-1/2 top-[62%] -translate-x-1/2 text-center animate-fade-in"
            style={{ animationDelay: '0.3s', animationFillMode: 'both' }}
          >
            {winners.map((w, i) => (
              <div key={i} className="text-xs text-green-400 font-medium">
                {w.hand && <span>{w.hand}</span>}
              </div>
            ))}
          </div>
        )}

        {/* Dealer button */}
        {dealerPos && <DealerButton x={dealerPos.x} y={dealerPos.y} />}

        {/* Floating bet chips — only during active play */}
        {phase !== 'idle' && phase !== 'complete' && seats.map((seat, i) => {
          const bet = seat.current_bet ?? 0;
          if (bet <= 0) return null;
          const betPos = getBetPosition(positions[i]);
          return <BetChip key={`bet-${i}`} amount={bet} x={betPos.x} y={betPos.y} collecting={collectingBets} />;
        })}

        {/* Seats */}
        {seats.map((seat, i) => (
          <Seat
            key={i}
            seat={seat}
            x={positions[i].x}
            y={positions[i].y}
            isHero={i === mySeat}
            isActionOn={i === actionOn}
            shownCards={shownCards[String(i)]}
            lastAction={lastActions[i] ?? null}
            heroCards={i === mySeat ? myCards : undefined}
            blindLabel={blindLabels[i] ?? null}
            canShowCards={i === mySeat && heroCanShow}
            profit={winnerProfits[i]}
            timerStart={i === actionOn ? promptTimerStart : null}
            timerTimeout={actionTimeout}
            onClickEmpty={canSit ? () => setSitSeat(i) : undefined}
            onShowCards={() => send?.({ type: 'chat', text: '/show' })}
          />
        ))}

        {/* Deal animation */}
        <DealAnimation dealKey={dealKey} />

        {/* Table info */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/30 rounded-full px-3 py-1">
          <span className="text-[10px] md:text-xs text-white/20 font-semibold">{tableName}</span>
          <span className="text-[10px] text-white/10">|</span>
          <span className="text-[10px] md:text-xs text-white/20 font-semibold">
            NL {formatIskCompact(blinds.small)}/{formatIskCompact(blinds.big)}
          </span>
        </div>
      </Felt>

      {/* Action panel — compact bottom-right */}
      <ActionPanel />

      {/* Pre-action buttons — shown when not your turn */}
      <PreActionBar />

      {/* Hand strength indicator — positioned above action/pre-action buttons */}
      {handStrength && mySeat >= 0 && (
        <div className="fixed bottom-16 right-4 z-20 text-xs text-text bg-surface/90 border border-surface-light rounded-lg px-3 py-1.5 font-semibold">
          {handStrength}
        </div>
      )}

      {/* Rebuy button — shown between hands when stack is low */}
      {mySeat >= 0 && (phase === 'idle' || phase === 'complete') && (() => {
        const myStack = seats[mySeat]?.stack ?? 0;
        const canAdd = maxBuyin - myStack;
        if (canAdd <= 0) return null;
        return (
          <button
            onClick={() => {
              const addAmount = canAdd;
              send?.({ type: 'add_chips', amount: addAmount });
            }}
            className="fixed bottom-4 left-4 z-20 bg-green/10 hover:bg-green/20 text-green text-xs font-bold px-3 py-2 rounded-lg border border-green/20 transition-all"
          >
            Top Up to {formatIskCompact(maxBuyin)}
          </button>
        );
      })()}

      {/* Sit dialog */}
      {sitSeat !== null && (
        <SitDialog
          seatIndex={sitSeat}
          minBuyin={minBuyin}
          maxBuyin={maxBuyin}
          bigBlind={blinds.big}
          onClose={() => setSitSeat(null)}
        />
      )}
    </>
  );
}
