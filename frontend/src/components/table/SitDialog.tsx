/** Modal for choosing a seat and buy-in amount */

import { useState, useEffect } from 'react';
import { useTableStore } from '../../stores/tableStore';
import { useAuthStore } from '../../stores/authStore';
import { api } from '../../lib/api';
import { formatIsk } from '../../lib/isk';

interface Props {
  seatIndex: number;
  minBuyin: number;
  maxBuyin: number;
  bigBlind: number;
  onClose: () => void;
}

export function SitDialog({ seatIndex, minBuyin, maxBuyin, bigBlind, onClose }: Props) {
  const defaultBuyin = bigBlind > 0 ? Math.min(Math.max(bigBlind * 60, minBuyin), maxBuyin) : maxBuyin;
  const [buyin, setBuyin] = useState(defaultBuyin);
  const [balance, setBalance] = useState<number | null>(null);
  const send = useTableStore((s) => s.send);
  const isAuth = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    if (isAuth) {
      api.getBalance().then((b) => setBalance(b.balance)).catch(() => {});
    }
  }, [isAuth]);

  const insufficientBalance = balance !== null && buyin > balance;

  const handleSit = () => {
    if (!send) return;
    send({ type: 'sit', seat: seatIndex, buyin });
    onClose();
  };

  const bbCount = bigBlind > 0 ? Math.round(buyin / bigBlind) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div
        className="bg-panel border border-gray-700/60 rounded-2xl p-7 w-80 shadow-2xl shadow-black/40 animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-display text-xl font-bold text-white mb-1 tracking-wide">Take Seat {seatIndex + 1}</h3>
        <p className="text-sm text-gray-500 mb-6">Choose your buy-in amount</p>

        {/* Slider */}
        <div className="mb-5">
          <input
            type="range"
            min={minBuyin}
            max={maxBuyin}
            step={bigBlind}
            value={buyin}
            onChange={(e) => setBuyin(Number(e.target.value))}
            className="w-full"
          />
          <div className="flex justify-between text-[10px] text-gray-600 mt-1 font-mono">
            <span>{formatIsk(minBuyin)}</span>
            <span>{formatIsk(maxBuyin)}</span>
          </div>
        </div>

        {/* Amount display */}
        <div className="text-center mb-6">
          <div className="text-2xl font-bold text-gold font-mono">{formatIsk(buyin)}</div>
          <div className="text-xs text-gray-500 font-mono">{bbCount} BB</div>
          {balance !== null && (
            <div className={`text-xs mt-1.5 font-mono ${insufficientBalance ? 'text-red-400' : 'text-gray-600'}`}>
              Balance: {formatIsk(balance)}
              {insufficientBalance && ' \u2014 insufficient'}
            </div>
          )}
        </div>

        {/* Quick buttons */}
        <div className="flex gap-2 mb-6">
          {[0.25, 0.5, 0.75, 1].map((frac) => {
            const raw = bigBlind > 0 ? Math.round((minBuyin + (maxBuyin - minBuyin) * frac) / bigBlind) * bigBlind : minBuyin + (maxBuyin - minBuyin) * frac;
            const val = Math.max(minBuyin, Math.min(raw, maxBuyin));
            return (
              <button
                key={frac}
                onClick={() => setBuyin(val)}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                  buyin === val
                    ? 'bg-gold/15 border-gold/30 text-gold'
                    : 'bg-surface-raised hover:bg-gray-600 text-gray-400 border-gray-700/60'
                }`}
              >
                {Math.round(frac * 100)}%
              </button>
            );
          })}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-400 rounded-xl text-sm font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSit}
            disabled={insufficientBalance}
            className="flex-1 py-2.5 bg-emerald-700 hover:bg-emerald-600 text-white font-semibold rounded-xl text-sm transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-md"
          >
            Sit Down
          </button>
        </div>
      </div>
    </div>
  );
}
