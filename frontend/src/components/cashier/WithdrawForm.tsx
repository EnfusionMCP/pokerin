import { useState } from 'react';
import { useWalletStore } from '../../stores/walletStore';
import { formatIsk } from '../../lib/isk';

interface Props {
  balance: number;
}

export function WithdrawForm({ balance }: Props) {
  const [amount, setAmount] = useState('');
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const withdraw = useWalletStore((s) => s.withdraw);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const iskAmount = parseFloat(amount);
    if (isNaN(iskAmount) || iskAmount <= 0) {
      setStatus({ type: 'error', message: 'Enter a valid amount' });
      return;
    }

    const cents = Math.round(iskAmount * 100);
    if (cents > balance) {
      setStatus({ type: 'error', message: 'Insufficient balance' });
      return;
    }

    setSubmitting(true);
    const result = await withdraw(cents);
    setStatus({ type: result.success ? 'success' : 'error', message: result.message });
    if (result.success) setAmount('');
    setSubmitting(false);
  };

  return (
    <div className="bg-panel/80 rounded-xl border border-gray-800/60 p-6 shadow-lg shadow-black/20">
      <h3 className="font-display text-lg font-semibold text-white mb-4 tracking-wide">Withdraw ISK</h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-xs text-gray-500 block mb-1.5 uppercase tracking-wider font-medium">Amount (ISK)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="1,000,000"
            className="w-full bg-surface border border-gray-700/60 rounded-lg px-4 py-3 text-white font-mono placeholder-gray-700 focus:outline-none focus:border-gold/50 transition-colors"
          />
          <p className="text-xs text-gray-600 mt-1.5 font-mono">
            Available: {formatIsk(balance)}
          </p>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3 bg-gold hover:bg-gold-light text-black font-semibold rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-md"
        >
          {submitting ? 'Submitting...' : 'Request Withdrawal'}
        </button>

        {status && (
          <p className={`text-sm font-medium ${status.type === 'success' ? 'text-emerald-400' : 'text-red-400'}`}>
            {status.message}
          </p>
        )}

        <p className="text-xs text-gray-600">
          Withdrawals are processed manually. You'll receive ISK in-game within 24 hours.
        </p>
      </form>
    </div>
  );
}
