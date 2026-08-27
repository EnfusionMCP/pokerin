/** Action panel — bottom-right, Stake-style buttons */

import { useState } from 'react';
import { useTableStore } from '../../stores/tableStore';
import { formatIskCompact } from '../../lib/isk';
import type { ActionPromptMsg, ClientMessage, PotData } from '../../types/ws';

export function ActionPanel() {
  const prompt = useTableStore((s) => s.prompt);
  const send = useTableStore((s) => s.send);
  const blinds = useTableStore((s) => s.blinds);
  const pots = useTableStore((s) => s.pots);

  if (!prompt || !send) return null;

  const promptKey = prompt.prompt_id
    ?? `${prompt.revision ?? 'legacy'}:${prompt.call_amount}:${prompt.min_raise}:${prompt.max_raise}`;
  return (
    <PromptActions
      key={promptKey}
      prompt={prompt}
      send={send}
      blinds={blinds}
      pots={pots}
    />
  );
}

interface PromptActionsProps {
  prompt: ActionPromptMsg;
  send: (message: ClientMessage) => string | null;
  blinds: { small: number; big: number };
  pots: PotData[];
}

function PromptActions({ prompt, send, blinds, pots }: PromptActionsProps) {
  const [raiseAmount, setRaiseAmount] = useState(prompt.min_raise);

  const { valid, call_amount, min_raise, max_raise } = prompt;
  const potTotal = pots.reduce((sum, p) => sum + p.amount, 0);

  const canCheck = valid.includes('check');
  const canCall = valid.includes('call');
  const canBet = valid.includes('bet');
  const canRaise = valid.includes('raise');
  const canBetOrRaise = canBet || canRaise;

  const act = (msg: Parameters<typeof send>[0]) => {
    if (send(msg)) {
      useTableStore.setState({ prompt: null, promptTimerStart: null });
    }
  };

  const handleFold = () => act({ type: 'action', action: 'fold' });
  const handleCheck = () => act({ type: 'action', action: 'check' });
  const handleCall = () => act({ type: 'action', action: 'call' });
  const handleRaise = () => {
    if (raiseAmount >= max_raise) {
      act({ type: 'action', action: 'allin' });
    } else {
      act({ type: 'action', action: canBet ? 'bet' : 'raise', amount: raiseAmount });
    }
  };

  const presets = [
    { label: '2BB', value: Math.max(min_raise, blinds.big * 2) },
    { label: '3BB', value: Math.max(min_raise, blinds.big * 3) },
    { label: '50%', value: Math.max(min_raise, Math.round(potTotal * 0.5)) },
    { label: 'Pot', value: Math.max(min_raise, potTotal) },
    { label: 'Max', value: max_raise },
  ];

  return (
    <div className="fixed bottom-4 right-4 z-40 flex flex-col items-end gap-2.5 max-w-sm">
      {/* Bet presets + slider */}
      {canBetOrRaise && (
        <div className="flex items-center gap-1.5 bg-surface/95 rounded-lg border border-surface-light px-2.5 py-2">
          {presets.map((p) => (
            <button
              key={p.label}
              onClick={() => setRaiseAmount(Math.min(p.value, max_raise))}
              className="px-2.5 py-1.5 text-xs font-bold bg-surface-light hover:bg-surface-lighter text-text rounded border border-surface-lighter/50 transition-colors"
            >
              {p.label}
            </button>
          ))}
          <input
            type="range"
            min={min_raise}
            max={max_raise}
            step={blinds.big || 1}
            value={raiseAmount}
            onChange={(e) => setRaiseAmount(Number(e.target.value))}
            className="w-20 md:w-28"
          />
          <span className="text-xs text-green font-bold min-w-[48px] text-right">
            {formatIskCompact(raiseAmount)}
          </span>
        </div>
      )}

      {/* Action buttons — Stake style: Fold (dark), Check/Call (green), Raise (darker) */}
      <div className="flex gap-2">
        <button
          onClick={handleFold}
          className="px-5 py-2.5 bg-surface-light hover:bg-red/20 text-text hover:text-red rounded-lg text-sm font-bold transition-all border border-surface-lighter/30"
        >
          Fold
        </button>

        {canCheck && (
          <button
            onClick={handleCheck}
            className="px-5 py-2.5 bg-green hover:brightness-110 text-black rounded-lg text-sm font-bold transition-all"
          >
            Check
          </button>
        )}

        {canCall && (
          <button
            onClick={handleCall}
            className="px-5 py-2.5 bg-green hover:brightness-110 text-black rounded-lg text-sm font-bold transition-all"
          >
            Call {formatIskCompact(call_amount)}
          </button>
        )}

        {canBetOrRaise && (
          <button
            onClick={handleRaise}
            className="px-5 py-2.5 bg-surface-light hover:bg-surface-lighter text-white rounded-lg text-sm font-bold transition-all border border-surface-lighter/30 whitespace-nowrap"
          >
            {raiseAmount >= max_raise
              ? 'All-In'
              : `${canBet ? 'Bet' : 'Raise'} ${formatIskCompact(raiseAmount)}`}
          </button>
        )}
      </div>
    </div>
  );
}
