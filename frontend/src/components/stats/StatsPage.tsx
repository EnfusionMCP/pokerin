import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { formatIsk, formatIskCompact } from '../../lib/isk';
import { useWalletStore } from '../../stores/walletStore';
import type { TransactionItem, HandSummary } from '../../types/api';

const TYPE_LABELS: Record<string, string> = {
  deposit: 'Deposit', withdrawal: 'Withdrawal', buyin: 'Buy-in', cashout: 'Cash-out',
  rake: 'Table Fee', win: 'Win', loss: 'Loss', refund: 'Refund', admin_credit: 'Adjustment',
};

export function StatsPage() {
  const { balance, fetchBalance } = useWalletStore();
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [hands, setHands] = useState<HandSummary[]>([]);
  const [tab, setTab] = useState<'summary' | 'transactions' | 'hands'>('summary');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBalance();
    Promise.all([api.getTransactions(200).then(setTransactions), api.getHands(100).then(setHands)]).finally(() => setLoading(false));
  }, [fetchBalance]);

  const totalDeposited = transactions.filter((t) => t.type === 'deposit' || t.type === 'admin_credit').reduce((sum, t) => sum + Math.max(0, t.amount), 0);
  const totalWithdrawn = transactions.filter((t) => t.type === 'withdrawal').reduce((sum, t) => sum + Math.abs(t.amount), 0);
  const currentBalance = balance ?? 0;
  const netPL = currentBalance + totalWithdrawn - totalDeposited;

  const tabs = [
    { key: 'summary' as const, label: 'Summary' },
    { key: 'transactions' as const, label: 'All Transactions' },
    { key: 'hands' as const, label: 'Hand History' },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h2 className="text-2xl font-extrabold text-white mb-7">Statistics</h2>

      <div className="flex gap-1 mb-6">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${
              tab === t.key ? 'bg-surface text-green border border-green/20' : 'text-text-muted hover:text-text hover:bg-surface-light/50'
            }`}
          >{t.label}</button>
        ))}
      </div>

      {tab === 'summary' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Total Deposited" value={formatIsk(totalDeposited)} color="text-green" />
            <StatCard label="Total Withdrawn" value={formatIsk(totalWithdrawn)} color="text-red" />
            <StatCard label="Current Balance" value={formatIsk(currentBalance)} color="text-green" />
            <StatCard label="Net P/L" value={`${netPL >= 0 ? '+' : ''}${formatIsk(netPL)}`} color={netPL >= 0 ? 'text-green' : 'text-red'} />
          </div>
          <div className="bg-surface rounded-lg border border-surface-light/50 p-6">
            <h3 className="text-xs font-bold text-text-muted mb-4 uppercase tracking-wider">Game Activity</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              <div><div className="text-text-muted text-xs uppercase tracking-wider mb-0.5 font-semibold">Hands</div><div className="text-white font-extrabold text-lg">{hands.length}</div></div>
              <div><div className="text-text-muted text-xs uppercase tracking-wider mb-0.5 font-semibold">Buy-ins</div><div className="text-white font-extrabold text-lg">{transactions.filter((t) => t.type === 'buyin').length}</div></div>
              <div><div className="text-text-muted text-xs uppercase tracking-wider mb-0.5 font-semibold">Cash-outs</div><div className="text-white font-extrabold text-lg">{transactions.filter((t) => t.type === 'cashout').length}</div></div>
            </div>
          </div>
        </div>
      )}

      {tab === 'transactions' && (
        <div className="bg-surface rounded-lg border border-surface-light/50 p-5">
          {loading ? <div className="text-text-muted text-sm">Loading...</div> : transactions.length === 0 ? <div className="text-text-muted text-sm">No transactions yet</div> : (
            <div className="max-h-[60vh] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-surface">
                  <tr className="text-text-muted text-left border-b border-surface-light/50">
                    <th className="pb-2 font-semibold text-xs uppercase tracking-wider">Date</th>
                    <th className="pb-2 font-semibold text-xs uppercase tracking-wider">Type</th>
                    <th className="pb-2 font-semibold text-xs uppercase tracking-wider">Ref</th>
                    <th className="pb-2 font-semibold text-xs uppercase tracking-wider text-right">Amount</th>
                    <th className="pb-2 font-semibold text-xs uppercase tracking-wider text-right">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="border-b border-surface-light/30">
                      <td className="py-2 text-text-muted text-xs">{new Date(tx.created_at).toLocaleString()}</td>
                      <td className="py-2 text-text font-semibold">{TYPE_LABELS[tx.type] ?? tx.type}</td>
                      <td className="py-2 text-text-muted text-xs truncate max-w-[120px]">{tx.reference_id ?? '\u2014'}</td>
                      <td className={`py-2 text-right font-bold ${tx.amount >= 0 ? 'text-green' : 'text-red'}`}>{tx.amount >= 0 ? '+' : ''}{formatIskCompact(tx.amount)}</td>
                      <td className="py-2 text-right text-text-muted text-xs">{formatIskCompact(tx.balance_after)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'hands' && (
        <div className="bg-surface rounded-lg border border-surface-light/50 p-5">
          {loading ? <div className="text-text-muted text-sm">Loading...</div> : hands.length === 0 ? <div className="text-text-muted text-sm">No hands yet</div> : (
            <div className="max-h-[60vh] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-surface">
                  <tr className="text-text-muted text-left border-b border-surface-light/50">
                    <th className="pb-2 font-semibold text-xs uppercase tracking-wider">Hand #</th>
                    <th className="pb-2 font-semibold text-xs uppercase tracking-wider">Table</th>
                    <th className="pb-2 font-semibold text-xs uppercase tracking-wider">Board</th>
                    <th className="pb-2 font-semibold text-xs uppercase tracking-wider text-right">Pot</th>
                    <th className="pb-2 font-semibold text-xs uppercase tracking-wider text-right">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {hands.map((h) => (
                    <tr key={h.id} className="border-b border-surface-light/30">
                      <td className="py-2 text-text font-semibold">#{h.hand_number}</td>
                      <td className="py-2 text-text-muted text-xs">{h.table_id}</td>
                      <td className="py-2 text-text-muted text-xs">{h.community_cards ?? '\u2014'}</td>
                      <td className="py-2 text-right text-green font-bold text-xs">{formatIskCompact(h.pot_total)}</td>
                      <td className="py-2 text-right text-text-muted text-xs">{new Date(h.started_at).toLocaleString()}</td>
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
    <div className="bg-surface rounded-lg border border-surface-light/50 p-5">
      <div className="text-[10px] text-text-muted uppercase tracking-widest mb-1.5 font-bold">{label}</div>
      <div className={`text-lg md:text-xl font-extrabold ${color}`}>{value}</div>
    </div>
  );
}
