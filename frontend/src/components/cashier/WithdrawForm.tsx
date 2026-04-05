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
    <div className="bg-surface/60 rounded-xl border border-surface-light/25 p-6">
      <h3 className="text-sm font-bold text-white mb-4">Withdraw ISK</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-[10px] text-text-muted block mb-1.5 uppercase tracking-widest font-bold">
            Amount (ISK)
          </label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="1,000,000"
            className="w-full bg-base border border-surface-light/30 rounded-lg px-4 py-3 text-white placeholder-text-muted/40 focus:outline-none focus:border-green/40 transition-colors font-semibold"
          />
          <p className="text-xs text-text-muted mt-1.5 font-semibold">
            Available: {formatIsk(balance)}
          </p>
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3 bg-green hover:brightness-110 text-black font-bold rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {submitting ? 'Submitting...' : 'Request Withdrawal'}
        </button>
        {status && (
          <p
            className={`text-sm font-semibold ${
              status.type === 'success' ? 'text-green' : 'text-red'
            }`}
          >
            {status.message}
          </p>
        )}
        <p className="text-xs text-text-muted">
          Withdrawals are processed manually. ISK sent within 24 hours.
        </p>
      </form>
    </div>
  );
}
