import { useState, useEffect } from 'react';
import { useTableStore } from '../../stores/tableStore';
import { useAuthStore } from '../../stores/authStore';
import { api } from '../../lib/api';
import { formatIsk } from '../../lib/isk';

interface Props { seatIndex: number; minBuyin: number; maxBuyin: number; bigBlind: number; onClose: () => void; }

export function SitDialog({ seatIndex, minBuyin, maxBuyin, bigBlind, onClose }: Props) {
  const defaultBuyin = bigBlind > 0 ? Math.min(Math.max(bigBlind * 60, minBuyin), maxBuyin) : maxBuyin;
  const [buyin, setBuyin] = useState(defaultBuyin);
  const [balance, setBalance] = useState<number | null>(null);
  const send = useTableStore((s) => s.send);
  const isAuth = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    if (isAuth) api.getBalance().then((b) => setBalance(b.balance)).catch(() => {});
  }, [isAuth]);

  const insufficientBalance = balance !== null && buyin > balance;
  const handleSit = () => { if (!send) return; send({ type: 'sit', seat: seatIndex, buyin }); onClose(); };
  const bbCount = bigBlind > 0 ? Math.round(buyin / bigBlind) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 animate-fade-in" onClick={onClose}>
      <div className="bg-surface border border-surface-light rounded-lg p-7 w-80 shadow-2xl animate-slide-up" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-extrabold text-white mb-1">Take Seat {seatIndex + 1}</h3>
        <p className="text-sm text-text-muted mb-5 font-medium">Choose your buy-in amount</p>

        <div className="mb-4">
          <input type="range" min={minBuyin} max={maxBuyin} step={bigBlind} value={buyin} onChange={(e) => setBuyin(Number(e.target.value))} className="w-full" />
          <div className="flex justify-between text-[10px] text-text-muted mt-1 font-semibold">
            <span>{formatIsk(minBuyin)}</span><span>{formatIsk(maxBuyin)}</span>
          </div>
        </div>

        <div className="text-center mb-5">
          <div className="text-2xl font-extrabold text-green">{formatIsk(buyin)}</div>
          <div className="text-xs text-text-muted font-semibold">{bbCount} BB</div>
          {balance !== null && (
            <div className={`text-xs mt-1 font-semibold ${insufficientBalance ? 'text-red' : 'text-text-muted'}`}>
              Balance: {formatIsk(balance)}{insufficientBalance && ' \u2014 insufficient'}
            </div>
          )}
        </div>

        <div className="flex gap-2 mb-5">
          {[0.25, 0.5, 0.75, 1].map((frac) => {
            const raw = bigBlind > 0 ? Math.round((minBuyin + (maxBuyin - minBuyin) * frac) / bigBlind) * bigBlind : minBuyin + (maxBuyin - minBuyin) * frac;
            const val = Math.max(minBuyin, Math.min(raw, maxBuyin));
            return (
              <button key={frac} onClick={() => setBuyin(val)}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg border transition-all ${
                  buyin === val ? 'bg-green/15 border-green/30 text-green' : 'bg-surface-light hover:bg-surface-lighter text-text border-surface-lighter/50'
                }`}
              >{Math.round(frac * 100)}%</button>
            );
          })}
        </div>

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 bg-surface-light hover:bg-surface-lighter text-text rounded-lg text-sm font-bold transition-colors">Cancel</button>
          <button onClick={handleSit} disabled={insufficientBalance} className="flex-1 py-2.5 bg-green hover:brightness-110 text-black font-bold rounded-lg text-sm transition-all disabled:opacity-30 disabled:cursor-not-allowed">Sit Down</button>
        </div>
      </div>
    </div>
  );
}
