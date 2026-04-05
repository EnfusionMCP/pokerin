import type { TransactionItem } from '../../types/api';
import { formatIsk } from '../../lib/isk';

interface Props { transactions: TransactionItem[]; loading: boolean; }

const TYPE_LABELS: Record<string, string> = {
  deposit: 'Deposit', withdrawal: 'Withdrawal', buyin: 'Buy-in', cashout: 'Cash-out',
  rake: 'Table Fee', win: 'Win', loss: 'Loss', refund: 'Refund', admin_credit: 'Adjustment',
};
const CASHIER_TYPES = new Set(['deposit', 'withdrawal', 'refund', 'admin_credit']);

export function TransactionHistory({ transactions, loading }: Props) {
  const filtered = transactions.filter((tx) => CASHIER_TYPES.has(tx.type));

  return (
    <div className="bg-surface rounded-lg border border-surface-light/50 p-6">
      <h3 className="text-base font-bold text-white mb-4">Transaction History</h3>
      {loading && filtered.length === 0 && (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex justify-between"><div className="h-4 w-20 bg-surface-light rounded animate-pulse" /><div className="h-4 w-24 bg-surface-light rounded animate-pulse" /></div>
          ))}
        </div>
      )}
      {!loading && filtered.length === 0 && <p className="text-text-muted text-sm">No transactions yet</p>}
      {filtered.length > 0 && (
        <div className="max-h-80 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-surface">
              <tr className="text-text-muted text-left border-b border-surface-light/50">
                <th className="pb-2 font-semibold text-xs uppercase tracking-wider">Date</th>
                <th className="pb-2 font-semibold text-xs uppercase tracking-wider">Type</th>
                <th className="pb-2 font-semibold text-xs uppercase tracking-wider text-right">Amount</th>
                <th className="pb-2 font-semibold text-xs uppercase tracking-wider text-right">Balance</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((tx) => (
                <tr key={tx.id} className="border-b border-surface-light/30">
                  <td className="py-2 text-text-muted text-xs">{new Date(tx.created_at).toLocaleDateString()}</td>
                  <td className="py-2 text-text font-semibold">{TYPE_LABELS[tx.type] ?? tx.type}</td>
                  <td className={`py-2 text-right font-bold ${tx.amount >= 0 ? 'text-green' : 'text-red'}`}>
                    {tx.amount >= 0 ? '+' : ''}{formatIsk(tx.amount)}
                  </td>
                  <td className="py-2 text-right text-text-muted text-xs">{formatIsk(tx.balance_after)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
