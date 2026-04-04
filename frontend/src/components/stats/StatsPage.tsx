/** Statistics page — profit/loss tracking, full transaction history, hand history */

import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { formatIsk, formatIskCompact } from '../../lib/isk';
import { useWalletStore } from '../../stores/walletStore';
import type { TransactionItem, HandSummary } from '../../types/api';

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

export function StatsPage() {
  const { balance, fetchBalance } = useWalletStore();
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [hands, setHands] = useState<HandSummary[]>([]);
  const [tab, setTab] = useState<'summary' | 'transactions' | 'hands'>('summary');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBalance();
    Promise.all([
      api.getTransactions(200).then(setTransactions),
      api.getHands(100).then(setHands),
    ]).finally(() => setLoading(false));
  }, [fetchBalance]);

  const totalDeposited = transactions
    .filter((t) => t.type === 'deposit' || t.type === 'admin_credit')
    .reduce((sum, t) => sum + Math.max(0, t.amount), 0);

  const totalWithdrawn = transactions
    .filter((t) => t.type === 'withdrawal')
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  const currentBalance = balance ?? 0;
  const netPL = currentBalance + totalWithdrawn - totalDeposited;

  const tabs = [
    { key: 'summary' as const, label: 'Summary' },
    { key: 'transactions' as const, label: 'All Transactions' },
    { key: 'hands' as const, label: 'Hand History' },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h2 className="font-display text-3xl font-bold text-white mb-7 tracking-wide">Statistics</h2>

      {/* Tab bar */}
      <div className="flex gap-1 mb-7">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
              tab === t.key
                ? 'bg-panel text-gold border border-gold/20 shadow-sm'
                : 'text-gray-500 hover:text-gray-300 hover:bg-panel-light/50'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'summary' && (
        <div className="space-y-6">
          {/* P/L Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Total Deposited" value={formatIsk(totalDeposited)} color="text-emerald-400" />
            <StatCard label="Total Withdrawn" value={formatIsk(totalWithdrawn)} color="text-red-400" />
            <StatCard label="Current Balance" value={formatIsk(currentBalance)} color="text-gold" />
            <StatCard
              label="Net Profit/Loss"
              value={`${netPL >= 0 ? '+' : ''}${formatIsk(netPL)}`}
              color={netPL >= 0 ? 'text-emerald-400' : 'text-red-400'}
            />
          </div>

          {/* Quick stats */}
          <div className="bg-panel/80 rounded-xl border border-gray-800/60 p-6 shadow-lg shadow-black/20">
            <h3 className="text-xs font-medium text-gray-500 mb-4 uppercase tracking-wider">Game Activity</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6 text-sm">
              <div>
                <div className="text-gray-600 text-xs uppercase tracking-wider mb-0.5">Hands Played</div>
                <div className="text-white font-bold font-mono text-lg">{hands.length}</div>
              </div>
              <div>
                <div className="text-gray-600 text-xs uppercase tracking-wider mb-0.5">Buy-ins</div>
                <div className="text-white font-bold font-mono text-lg">
                  {transactions.filter((t) => t.type === 'buyin').length}
                </div>
              </div>
              <div>
                <div className="text-gray-600 text-xs uppercase tracking-wider mb-0.5">Cash-outs</div>
                <div className="text-white font-bold font-mono text-lg">
                  {transactions.filter((t) => t.type === 'cashout').length}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'transactions' && (
        <div className="bg-panel/80 rounded-xl border border-gray-800/60 p-6 shadow-lg shadow-black/20">
          <h3 className="text-xs font-medium text-gray-500 mb-4 uppercase tracking-wider">All Transactions</h3>
          {loading ? (
            <div className="text-gray-700 text-sm">Loading...</div>
          ) : transactions.length === 0 ? (
            <div className="text-gray-600 text-sm">No transactions yet</div>
          ) : (
            <div className="max-h-[60vh] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-panel">
                  <tr className="text-gray-500 text-left border-b border-gray-700/60">
                    <th className="pb-2.5 font-medium text-xs uppercase tracking-wider">Date</th>
                    <th className="pb-2.5 font-medium text-xs uppercase tracking-wider">Type</th>
                    <th className="pb-2.5 font-medium text-xs uppercase tracking-wider">Reference</th>
                    <th className="pb-2.5 font-medium text-xs uppercase tracking-wider text-right">Amount</th>
                    <th className="pb-2.5 font-medium text-xs uppercase tracking-wider text-right">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="border-b border-gray-800/30">
                      <td className="py-2.5 text-gray-500 text-xs">
                        {new Date(tx.created_at).toLocaleString()}
                      </td>
                      <td className="py-2.5 text-gray-300 font-medium">
                        {TYPE_LABELS[tx.type] ?? tx.type}
                      </td>
                      <td className="py-2.5 text-gray-700 text-xs font-mono truncate max-w-[120px]">
                        {tx.reference_id ?? '\u2014'}
                      </td>
                      <td className={`py-2.5 text-right font-mono font-medium ${tx.amount >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {tx.amount >= 0 ? '+' : ''}{formatIskCompact(tx.amount)}
                      </td>
                      <td className="py-2.5 text-right text-gray-500 font-mono text-xs">
                        {formatIskCompact(tx.balance_after)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'hands' && (
        <div className="bg-panel/80 rounded-xl border border-gray-800/60 p-6 shadow-lg shadow-black/20">
          <h3 className="text-xs font-medium text-gray-500 mb-4 uppercase tracking-wider">Recent Hands</h3>
          {loading ? (
            <div className="text-gray-700 text-sm">Loading...</div>
          ) : hands.length === 0 ? (
            <div className="text-gray-600 text-sm">No hands played yet</div>
          ) : (
            <div className="max-h-[60vh] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-panel">
                  <tr className="text-gray-500 text-left border-b border-gray-700/60">
                    <th className="pb-2.5 font-medium text-xs uppercase tracking-wider">Hand #</th>
                    <th className="pb-2.5 font-medium text-xs uppercase tracking-wider">Table</th>
                    <th className="pb-2.5 font-medium text-xs uppercase tracking-wider">Board</th>
                    <th className="pb-2.5 font-medium text-xs uppercase tracking-wider text-right">Pot</th>
                    <th className="pb-2.5 font-medium text-xs uppercase tracking-wider text-right">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {hands.map((h) => (
                    <tr key={h.id} className="border-b border-gray-800/30">
                      <td className="py-2.5 text-gray-300 font-mono">#{h.hand_number}</td>
                      <td className="py-2.5 text-gray-500 text-xs">{h.table_id}</td>
                      <td className="py-2.5 text-gray-500 text-xs font-mono">
                        {h.community_cards ?? '\u2014'}
                      </td>
                      <td className="py-2.5 text-right text-gold font-mono font-medium text-xs">
                        {formatIskCompact(h.pot_total)}
                      </td>
                      <td className="py-2.5 text-right text-gray-600 text-xs">
                        {new Date(h.started_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-panel/80 rounded-xl border border-gray-800/60 p-5 shadow-lg shadow-black/20">
      <div className="text-[10px] text-gray-500 uppercase tracking-widest mb-1.5 font-medium">{label}</div>
      <div className={`text-lg md:text-xl font-bold font-mono ${color}`}>{value}</div>
    </div>
  );
}
