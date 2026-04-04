/** Compact action panel — bottom-right corner */

import { useState, useEffect } from 'react';
import { useTableStore } from '../../stores/tableStore';
import { formatIskCompact } from '../../lib/isk';

export function ActionPanel() {
  const prompt = useTableStore((s) => s.prompt);
  const send = useTableStore((s) => s.send);
  const blinds = useTableStore((s) => s.blinds);
  const pots = useTableStore((s) => s.pots);

  const [raiseAmount, setRaiseAmount] = useState(0);

  useEffect(() => {
    if (prompt) {
      setRaiseAmount(prompt.min_raise);
    }
  }, [prompt]);

  if (!prompt || !send) return null;

  const { valid, call_amount, min_raise, max_raise } = prompt;
  const potTotal = pots.reduce((sum, p) => sum + p.amount, 0);

  const canCheck = valid.includes('check');
  const canCall = valid.includes('call');
  const canBet = valid.includes('bet');
  const canRaise = valid.includes('raise');
  const canBetOrRaise = canBet || canRaise;

  const act = (msg: Parameters<typeof send>[0]) => {
    useTableStore.setState({ prompt: null, promptTimerStart: null });
    send(msg);
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
    <div className="fixed bottom-4 right-4 z-40 flex flex-col items-end gap-2.5 max-w-xs">
      {/* Bet presets + slider */}
      {canBetOrRaise && (
        <div className="flex items-center gap-1.5 bg-panel/90 backdrop-blur-md rounded-xl border border-gray-700/60 px-2.5 py-2 shadow-xl shadow-black/30">
          {presets.map((p) => (
            <button
              key={p.label}
              onClick={() => setRaiseAmount(Math.min(p.value, max_raise))}
              className="px-2.5 py-1.5 text-xs font-medium bg-surface-raised hover:bg-gray-600 text-gray-300 hover:text-white rounded-lg border border-gray-700/60 transition-all"
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
          <span className="text-xs text-gold font-mono font-bold min-w-[48px] text-right">
            {formatIskCompact(raiseAmount)}
          </span>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2">
        <button
          onClick={handleFold}
          className="px-5 py-2.5 bg-gray-800/90 hover:bg-red-800/90 text-gray-400 hover:text-white rounded-xl text-sm md:text-base font-semibold transition-all border border-gray-700/60 hover:border-red-700/60 shadow-lg shadow-black/20 backdrop-blur-sm"
        >
          Fold
        </button>

        {canCheck && (
          <button
            onClick={handleCheck}
            className="px-5 py-2.5 bg-emerald-700/90 hover:bg-emerald-600/90 text-white rounded-xl text-sm md:text-base font-semibold transition-all shadow-lg shadow-emerald-900/30 backdrop-blur-sm"
          >
            Check
          </button>
        )}

        {canCall && (
          <button
            onClick={handleCall}
            className="px-5 py-2.5 bg-emerald-700/90 hover:bg-emerald-600/90 text-white rounded-xl text-sm md:text-base font-semibold transition-all shadow-lg shadow-emerald-900/30 backdrop-blur-sm"
          >
            Call <span className="font-mono">{formatIskCompact(call_amount)}</span>
          </button>
        )}

        {canBetOrRaise && (
          <button
            onClick={handleRaise}
            className="px-5 py-2.5 bg-amber-600/90 hover:bg-amber-500/90 text-white rounded-xl text-sm md:text-base font-semibold transition-all whitespace-nowrap shadow-lg shadow-amber-900/30 backdrop-blur-sm"
          >
            {raiseAmount >= max_raise
              ? 'All-In'
              : <>{canBet ? 'Bet' : 'Raise'} <span className="font-mono">{formatIskCompact(raiseAmount)}</span></>}
          </button>
        )}
      </div>
    </div>
  );
}
