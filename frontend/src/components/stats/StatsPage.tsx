import { useEffect, useState, useCallback } from 'react';
import { api } from '../../lib/api';
import { formatIsk, formatIskCompact } from '../../lib/isk';
import { reproduceShuffle, verifySeedHash } from '../../lib/provablyFair';
import { useWalletStore } from '../../stores/walletStore';
import type { TransactionItem, HandSummary, HandDetail } from '../../types/api';

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
    <div className="max-w-4xl mx-auto px-5 md:px-8 py-8">
      <h2 className="text-2xl font-extrabold text-white mb-7">Statistics</h2>

      {/* Tabs */}
      <div className="flex gap-1 mb-6">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${
              tab === t.key
                ? 'bg-surface/80 text-green border border-green/20'
                : 'text-text-muted hover:text-text hover:bg-surface-light/30'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'summary' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="Total Deposited" value={formatIsk(totalDeposited)} color="text-green" />
            <StatCard label="Total Withdrawn" value={formatIsk(totalWithdrawn)} color="text-red" />
            <StatCard label="Current Balance" value={formatIsk(currentBalance)} color="text-green" />
            <StatCard
              label="Net P/L"
              value={`${netPL >= 0 ? '+' : ''}${formatIsk(netPL)}`}
              color={netPL >= 0 ? 'text-green' : 'text-red'}
            />
          </div>
          <div className="bg-surface/60 rounded-xl border border-surface-light/25 p-6">
            <h3 className="text-[10px] font-bold text-text-muted mb-4 uppercase tracking-widest">
              Game Activity
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              <div>
                <div className="text-text-muted text-[10px] uppercase tracking-widest mb-0.5 font-bold">
                  Hands
                </div>
                <div className="text-white font-extrabold text-lg">{hands.length}</div>
              </div>
              <div>
                <div className="text-text-muted text-[10px] uppercase tracking-widest mb-0.5 font-bold">
                  Buy-ins
                </div>
                <div className="text-white font-extrabold text-lg">
                  {transactions.filter((t) => t.type === 'buyin').length}
                </div>
              </div>
              <div>
                <div className="text-text-muted text-[10px] uppercase tracking-widest mb-0.5 font-bold">
                  Cash-outs
                </div>
                <div className="text-white font-extrabold text-lg">
                  {transactions.filter((t) => t.type === 'cashout').length}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'transactions' && (
        <div className="bg-surface/60 rounded-xl border border-surface-light/25 p-5">
          {loading ? (
            <div className="text-text-muted text-sm py-8 text-center">Loading...</div>
          ) : transactions.length === 0 ? (
            <div className="text-text-muted text-sm py-8 text-center">No transactions yet</div>
          ) : (
            <div className="max-h-[60vh] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-surface/90">
                  <tr className="text-text-muted text-left border-b border-surface-light/30">
                    <th className="pb-2.5 font-semibold text-[11px] uppercase tracking-wider">Date</th>
                    <th className="pb-2.5 font-semibold text-[11px] uppercase tracking-wider">Type</th>
                    <th className="pb-2.5 font-semibold text-[11px] uppercase tracking-wider">Ref</th>
                    <th className="pb-2.5 font-semibold text-[11px] uppercase tracking-wider text-right">Amount</th>
                    <th className="pb-2.5 font-semibold text-[11px] uppercase tracking-wider text-right">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="border-b border-surface-light/15">
                      <td className="py-2.5 text-text-muted text-xs">{new Date(tx.created_at).toLocaleString()}</td>
                      <td className="py-2.5 text-text font-semibold">{TYPE_LABELS[tx.type] ?? tx.type}</td>
                      <td className="py-2.5 text-text-muted text-xs truncate max-w-[120px]">{tx.reference_id ?? '\u2014'}</td>
                      <td className={`py-2.5 text-right font-bold ${tx.amount >= 0 ? 'text-green' : 'text-red'}`}>
                        {tx.amount >= 0 ? '+' : ''}{formatIskCompact(tx.amount)}
                      </td>
                      <td className="py-2.5 text-right text-text-muted text-xs">{formatIskCompact(tx.balance_after)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'hands' && (
        <HandHistoryTab hands={hands} loading={loading} />
      )}
    </div>
  );
}

function HandHistoryTab({ hands, loading }: { hands: HandSummary[]; loading: boolean }) {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<HandDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [verification, setVerification] = useState<{
    hashMatch: boolean;
    deck: string[];
  } | null>(null);
  const [verifying, setVerifying] = useState(false);

  const toggleExpand = useCallback(async (id: number) => {
    if (expandedId === id) {
      setExpandedId(null);
      setDetail(null);
      setVerification(null);
      return;
    }
    setExpandedId(id);
    setDetail(null);
    setVerification(null);
    setDetailLoading(true);
    try {
      const d = await api.getHandDetail(id);
      setDetail(d);
    } catch {
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  }, [expandedId]);

  const runVerify = useCallback(async () => {
    if (!detail) return;
    setVerifying(true);
    try {
      const [hashMatch, deck] = await Promise.all([
        verifySeedHash(detail.server_seed, detail.server_seed_hash),
        reproduceShuffle(detail.server_seed, detail.table_id, detail.hand_number),
      ]);
      setVerification({ hashMatch, deck });
    } catch {
      setVerification(null);
    } finally {
      setVerifying(false);
    }
  }, [detail]);

  // Parse community cards string (e.g. "Ah Kd 3c 7s 2d") into array
  const parseCommunity = (cc: string | null): string[] => {
    if (!cc) return [];
    // Handle both space-separated and concatenated formats
    if (cc.includes(' ')) return cc.split(' ');
    const cards: string[] = [];
    for (let i = 0; i < cc.length; i += 2) cards.push(cc.substring(i, i + 2));
    return cards;
  };

  if (loading) return <div className="bg-surface/60 rounded-xl border border-surface-light/25 p-5"><div className="text-text-muted text-sm py-8 text-center">Loading...</div></div>;
  if (hands.length === 0) return <div className="bg-surface/60 rounded-xl border border-surface-light/25 p-5"><div className="text-text-muted text-sm py-8 text-center">No hands yet</div></div>;

  return (
    <div className="bg-surface/60 rounded-xl border border-surface-light/25 p-5">
      <div className="max-h-[70vh] overflow-y-auto">
        {/* Header */}
        <div className="grid grid-cols-[3.5rem_5rem_1fr_4.5rem_7.5rem] gap-x-4 pb-2.5 border-b border-surface-light/30 text-text-muted text-[11px] uppercase tracking-wider font-semibold">
          <span>Hand #</span>
          <span>Table</span>
          <span>Board</span>
          <span className="text-right">Pot</span>
          <span className="text-right">Date</span>
        </div>

        {/* Rows */}
        {hands.map((h) => {
          const isOpen = expandedId === h.id;
          return (
            <div key={h.id}>
              <div
                onClick={() => toggleExpand(h.id)}
                className={`grid grid-cols-[3.5rem_5rem_1fr_4.5rem_7.5rem] gap-x-4 items-center py-2.5 border-b border-surface-light/15 cursor-pointer transition-colors text-sm ${isOpen ? 'bg-surface-light/20' : 'hover:bg-surface-light/10'}`}
              >
                <span className="text-text font-semibold">#{h.hand_number}</span>
                <span className="text-text-muted text-xs">{h.table_id}</span>
                <span className="text-text-muted text-xs truncate">{h.community_cards ?? '\u2014'}</span>
                <span className="text-right text-green font-bold text-xs">{formatIskCompact(h.pot_total)}</span>
                <span className="text-right text-text-muted text-xs">{new Date(h.started_at).toLocaleString()}</span>
              </div>

              {isOpen && (
                <div className="bg-base/50 border-b border-surface-light/15 px-4 py-4">
                  {detailLoading ? (
                    <div className="text-text-muted text-xs">Loading hand details...</div>
                  ) : !detail ? (
                    <div className="text-red text-xs">Failed to load hand details</div>
                  ) : (
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                        <div className="min-w-0">
                          <span className="text-text-muted">Seed Hash: </span>
                          <code className="text-text break-all font-mono text-[10px]">{detail.server_seed_hash}</code>
                        </div>
                        <div className="min-w-0">
                          <span className="text-text-muted">Server Seed: </span>
                          <code className="text-text break-all font-mono text-[10px]">{detail.server_seed}</code>
                        </div>
                      </div>

                      {!verification ? (
                        <button
                          onClick={(e) => { e.stopPropagation(); runVerify(); }}
                          disabled={verifying}
                          className="px-4 py-1.5 bg-green/10 border border-green/25 rounded-lg text-green text-xs font-bold hover:bg-green/20 transition-all cursor-pointer disabled:opacity-50"
                        >
                          {verifying ? 'Verifying...' : 'Verify Fairness'}
                        </button>
                      ) : (
                        <div className="space-y-3">
                          <div className="flex items-center gap-4 text-xs">
                            <span className={`font-bold ${verification.hashMatch ? 'text-green' : 'text-red'}`}>
                              {verification.hashMatch ? '\u2713' : '\u2717'} Hash Match
                            </span>
                            <span className="text-text-muted">
                              SHA-256(seed) {verification.hashMatch ? 'matches' : 'does not match'} committed hash
                            </span>
                          </div>

                          <div>
                            <div className="text-text-muted text-[10px] uppercase tracking-widest mb-1.5 font-bold">
                              Reproduced Deck Order
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {verification.deck.map((card, idx) => {
                                const community = parseCommunity(detail.community_cards);
                                const holeCards = detail.players
                                  .filter((p) => p.hole_cards)
                                  .flatMap((p) => {
                                    const hc = p.hole_cards!;
                                    if (hc.includes(' ')) return hc.split(' ');
                                    const cards: string[] = [];
                                    for (let i = 0; i < hc.length; i += 2) cards.push(hc.substring(i, i + 2));
                                    return cards;
                                  });
                                const isComm = community.includes(card);
                                const isHole = holeCards.includes(card);
                                return (
                                  <span
                                    key={idx}
                                    className={`px-1 py-0.5 rounded text-[10px] font-mono font-bold ${
                                      isComm
                                        ? 'bg-blue/20 text-blue border border-blue/30'
                                        : isHole
                                          ? 'bg-green/20 text-green border border-green/30'
                                          : 'bg-surface-light/20 text-text-muted'
                                    }`}
                                    title={isComm ? 'Community card' : isHole ? 'Hole card' : ''}
                                  >
                                    {card}
                                  </span>
                                );
                              })}
                            </div>
                            <div className="flex gap-4 mt-2 text-[10px] text-text-muted">
                              <span><span className="inline-block w-2 h-2 rounded-sm bg-green/20 border border-green/30 mr-1" />Hole cards</span>
                              <span><span className="inline-block w-2 h-2 rounded-sm bg-blue/20 border border-blue/30 mr-1" />Community</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-surface/60 rounded-xl border border-surface-light/25 p-5">
      <div className="text-[10px] text-text-muted uppercase tracking-widest mb-1.5 font-bold">{label}</div>
      <div className={`text-lg md:text-xl font-extrabold ${color}`}>{value}</div>
    </div>
  );
}
