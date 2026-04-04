import type { TransactionItem } from '../../types/api';
import { formatIsk } from '../../lib/isk';

interface Props {
  transactions: TransactionItem[];
  loading: boolean;
}

const TYPE_LABELS: Record<string, string> = {
  deposit: 'Deposit',
  withdrawal: 'Withdrawal',
  buyin: 'Buy-in',
  cashout: 'Cash-out',
  rake: 'Table Fee',
  win: 'Win',
  loss: 'Loss',
  refund: 'Refund',
  admin_credit: 'Adjustment',
};

const CASHIER_TYPES = new Set(['deposit', 'withdrawal', 'refund', 'admin_credit']);

export function TransactionHistory({ transactions, loading }: Props) {
  const filtered = transactions.filter((tx) => CASHIER_TYPES.has(tx.type));

  return (
    <div className="bg-panel/80 rounded-xl border border-gray-800/60 p-6 shadow-lg shadow-black/20">
      <h3 className="font-display text-lg font-semibold text-white mb-4 tracking-wide">Transaction History</h3>

      {loading && filtered.length === 0 && (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex justify-between items-center">
              <div className="h-4 w-20 bg-gray-800 rounded animate-pulse" />
              <div className="h-4 w-16 bg-gray-800 rounded animate-pulse" />
              <div className="h-4 w-24 bg-gray-800 rounded animate-pulse" />
              <div className="h-4 w-24 bg-gray-800 rounded animate-pulse" />
            </div>
          ))}
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <p className="text-gray-600 text-sm">No transactions yet</p>
      )}

      {filtered.length > 0 && (
        <div className="max-h-80 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-panel">
              <tr className="text-gray-500 text-left border-b border-gray-700/60">
                <th className="pb-2.5 font-medium text-xs uppercase tracking-wider">Date</th>
                <th className="pb-2.5 font-medium text-xs uppercase tracking-wider">Type</th>
                <th className="pb-2.5 font-medium text-xs uppercase tracking-wider text-right">Amount</th>
                <th className="pb-2.5 font-medium text-xs uppercase tracking-wider text-right">Balance</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((tx) => (
                <tr key={tx.id} className="border-b border-gray-800/40">
                  <td className="py-2.5 text-gray-500 text-xs">
                    {new Date(tx.created_at).toLocaleDateString()}
                  </td>
                  <td className="py-2.5 text-gray-300 font-medium">
                    {TYPE_LABELS[tx.type] ?? tx.type}
                  </td>
                  <td className={`py-2.5 text-right font-mono font-medium ${tx.amount >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {tx.amount >= 0 ? '+' : ''}{formatIsk(tx.amount)}
                  </td>
                  <td className="py-2.5 text-right text-gray-500 font-mono text-xs">
                    {formatIsk(tx.balance_after)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
