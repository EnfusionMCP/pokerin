/** Admin dashboard — overview, users, withdrawals, hands, deposits */

import { useState, useEffect, useCallback, Fragment } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { api } from '../../lib/api';
import { formatIsk, formatIskCompact } from '../../lib/isk';
import { Card } from '../table/Card';
import type {
  AdminUser, AdminWithdrawal, AdminHandSummary, AdminHandDetail, AdminDeposit,
} from '../../types/api';

type Tab = 'overview' | 'users' | 'withdrawals' | 'hands' | 'deposits' | 'traffic';

export function AdminPage() {
  const isAdmin = useAuthStore((s) => s.isAdmin);
  const [tab, setTab] = useState<Tab>('overview');

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-52px)] bg-surface">
        <div className="text-red-400 text-lg">Access denied</div>
      </div>
    );
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'users', label: 'Users' },
    { key: 'withdrawals', label: 'Withdrawals' },
    { key: 'hands', label: 'Hands' },
    { key: 'deposits', label: 'Deposits' },
    { key: 'traffic', label: 'Traffic' },
  ];

  return (
    <div className="min-h-[calc(100vh-52px)] bg-surface">
      {/* Tab bar */}
      <div className="flex gap-1 px-4 pt-3 pb-0 bg-panel border-b border-gray-800">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              tab === t.key
                ? 'bg-surface text-gold border-t border-x border-gray-700'
                : 'text-gray-400 hover:text-white hover:bg-panel-light'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="p-4 max-w-6xl mx-auto">
        {tab === 'overview' && <OverviewTab />}
        {tab === 'users' && <UsersTab />}
        {tab === 'withdrawals' && <WithdrawalsTab />}
        {tab === 'hands' && <HandsTab />}
        {tab === 'deposits' && <DepositsTab />}
        {tab === 'traffic' && <TrafficTab />}
      </div>
    </div>
  );
}

// ─── Overview ───────────────────────────────────────────────

function OverviewTab() {
  const [rake, setRake] = useState<number | null>(null);
  const [pendingCount, setPendingCount] = useState<number | null>(null);

  useEffect(() => {
    api.admin.getRake().then((r) => setRake(r.total_rake));
    api.admin.getWithdrawals().then((w) => setPendingCount(w.length));
  }, []);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <StatCard
        label="Total Rake Earned"
        value={rake !== null ? formatIsk(rake) : '...'}
        color="text-gold"
      />
      <StatCard
        label="Pending Withdrawals"
        value={pendingCount !== null ? String(pendingCount) : '...'}
        color={pendingCount && pendingCount > 0 ? 'text-amber-400' : 'text-gray-300'}
      />
      <StatCard
        label="Status"
        value="Online"
        color="text-green-400"
      />
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-panel rounded-xl border border-gray-800 p-5">
      <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">{label}</div>
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
    </div>
  );
}

// ─── Users ──────────────────────────────────────────────────

function UsersTab() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [search, setSearch] = useState('');
  const [creditModal, setCreditModal] = useState<{ userId: number; name: string; balance: number } | null>(null);
  const [creditAmount, setCreditAmount] = useState('');

  const load = useCallback(() => {
    api.admin.getUsers().then(setUsers);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = users.filter((u) =>
    u.character_name.toLowerCase().includes(search.toLowerCase())
  );

  const handleBan = async (id: number) => {
    const reason = prompt('Ban reason (optional):');
    if (reason === null) return; // cancelled
    await api.admin.banUser(id, reason);
    load();
  };

  const handleUnban = async (id: number) => {
    await api.admin.unbanUser(id);
    load();
  };

  const handleCredit = async () => {
    if (!creditModal) return;
    const amount = parseInt(creditAmount);
    if (!amount || isNaN(amount)) return;
    await api.admin.creditUser(creditModal.userId, amount * 100);
    setCreditModal(null);
    setCreditAmount('');
    load();
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Delete user "${name}"? This cannot be undone. User must have zero balance.`)) return;
    await api.admin.deleteUser(id);
    load();
  };

  return (
    <>
      <input
        type="text"
        placeholder="Search by name..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full md:w-72 mb-4 bg-panel-light border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 outline-none focus:border-gold/50"
      />

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b border-gray-800">
              <th className="pb-2 pr-4">Name</th>
              <th className="pb-2 pr-4">Balance</th>
              <th className="pb-2 pr-4">Status</th>
              <th className="pb-2 pr-4">Created</th>
              <th className="pb-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => (
              <tr key={u.id} className="border-b border-gray-800/50 hover:bg-panel-light/30">
                <td className="py-2 pr-4">
                  <span className="text-gray-200">{u.character_name}</span>
                  {u.is_bot && <span className="ml-1 text-[9px] bg-blue-500/20 text-blue-400 px-1 rounded">BOT</span>}
                  {u.is_admin && <span className="ml-1 text-[9px] bg-amber-500/20 text-amber-400 px-1 rounded">ADMIN</span>}
                </td>
                <td className="py-2 pr-4 text-gold font-mono text-xs">
                  {formatIskCompact(u.balance)}
                </td>
                <td className="py-2 pr-4">
                  {u.is_banned
                    ? <span className="text-red-400 text-xs">Banned</span>
                    : <span className="text-green-400 text-xs">Active</span>
                  }
                </td>
                <td className="py-2 pr-4 text-gray-500 text-xs">
                  {u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}
                </td>
                <td className="py-2 flex gap-1">
                  {u.is_banned ? (
                    <button onClick={() => handleUnban(u.id)} className="px-2 py-0.5 text-[10px] bg-green-700 hover:bg-green-600 text-white rounded transition-colors">
                      Unban
                    </button>
                  ) : (
                    <button onClick={() => handleBan(u.id)} className="px-2 py-0.5 text-[10px] bg-red-700 hover:bg-red-600 text-white rounded transition-colors">
                      Ban
                    </button>
                  )}
                  <button
                    onClick={() => setCreditModal({ userId: u.id, name: u.character_name, balance: u.balance })}
                    className="px-2 py-0.5 text-[10px] bg-panel-light hover:bg-gray-600 text-gray-300 rounded transition-colors"
                  >
                    Edit Balance
                  </button>
                  {!u.is_admin && (
                    <button
                      onClick={() => handleDelete(u.id, u.character_name)}
                      className="px-2 py-0.5 text-[10px] bg-gray-800 hover:bg-red-800 text-gray-500 hover:text-white rounded transition-colors"
                    >
                      Delete
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit Balance modal */}
      {creditModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center animate-fade-in">
          <div className="bg-panel border border-gray-700 rounded-xl p-5 w-80 animate-slide-up">
            <h3 className="text-sm font-medium text-gray-300 mb-1">Edit Balance: {creditModal.name}</h3>
            <div className="text-xs text-gray-500 mb-3">
              Current: <span className="text-gold">{formatIsk(creditModal.balance)}</span>
            </div>
            <input
              type="number"
              placeholder="Amount in ISK (negative to debit)"
              value={creditAmount}
              onChange={(e) => setCreditAmount(e.target.value)}
              className="w-full bg-panel-light border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 outline-none focus:border-gold/50 mb-1"
            />
            <div className="text-[10px] text-gray-600 mb-3">
              Positive = add ISK, negative = remove ISK
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => { setCreditModal(null); setCreditAmount(''); }} className="px-3 py-1.5 text-xs text-gray-400 hover:text-white">
                Cancel
              </button>
              <button onClick={handleCredit} className="px-3 py-1.5 text-xs bg-gold text-black rounded-lg font-medium">
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Withdrawals ────────────────────────────────────────────

function WithdrawalsTab() {
  const [withdrawals, setWithdrawals] = useState<AdminWithdrawal[]>([]);

  const load = useCallback(() => {
    api.admin.getWithdrawals().then(setWithdrawals);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleComplete = async (id: number) => {
    await api.admin.completeWithdrawal(id);
    load();
  };

  const handleReject = async (id: number) => {
    const reason = prompt('Rejection reason (optional):') ?? '';
    await api.admin.rejectWithdrawal(id, reason);
    load();
  };

  if (withdrawals.length === 0) {
    return <div className="text-gray-500 text-sm">No pending withdrawals</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-gray-500 border-b border-gray-800">
            <th className="pb-2 pr-4">Player</th>
            <th className="pb-2 pr-4">Amount</th>
            <th className="pb-2 pr-4">Requested</th>
            <th className="pb-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {withdrawals.map((w) => (
            <tr key={w.id} className="border-b border-gray-800/50">
              <td className="py-2 pr-4 text-gray-200">{w.character_name}</td>
              <td className="py-2 pr-4 text-gold font-mono text-xs">{formatIsk(w.amount)}</td>
              <td className="py-2 pr-4 text-gray-500 text-xs">
                {w.created_at ? new Date(w.created_at).toLocaleString() : '—'}
              </td>
              <td className="py-2 flex gap-1">
                <button onClick={() => handleComplete(w.id)} className="px-2 py-0.5 text-[10px] bg-green-700 hover:bg-green-600 text-white rounded transition-colors">
                  Complete
                </button>
                <button onClick={() => handleReject(w.id)} className="px-2 py-0.5 text-[10px] bg-red-700 hover:bg-red-600 text-white rounded transition-colors">
                  Reject
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Hands ──────────────────────────────────────────────────

function HandsTab() {
  const [hands, setHands] = useState<AdminHandSummary[]>([]);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [detail, setDetail] = useState<AdminHandDetail | null>(null);
  const [tableFilter, setTableFilter] = useState('');

  useEffect(() => {
    const filters: { table_id?: string; limit?: number } = { limit: 100 };
    if (tableFilter) filters.table_id = tableFilter;
    api.admin.getHands(filters).then(setHands);
  }, [tableFilter]);

  const toggleExpand = async (id: number) => {
    if (expanded === id) {
      setExpanded(null);
      setDetail(null);
      return;
    }
    setExpanded(id);
    const d = await api.admin.getHandDetail(id);
    setDetail(d);
  };

  return (
    <>
      <div className="flex gap-2 mb-4">
        <select
          value={tableFilter}
          onChange={(e) => setTableFilter(e.target.value)}
          className="bg-panel-light border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 outline-none"
        >
          <option value="">All Tables</option>
          <option value="micro-1">Micro Stakes</option>
          <option value="small-1">Small Stakes</option>
          <option value="medium-1">Medium Stakes</option>
          <option value="high-1">High Stakes</option>
          <option value="whale-1">Whale Stakes</option>
        </select>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b border-gray-800">
              <th className="pb-2 pr-4">Hand #</th>
              <th className="pb-2 pr-4">Table</th>
              <th className="pb-2 pr-4">Pot</th>
              <th className="pb-2 pr-4">Rake</th>
              <th className="pb-2 pr-4">Players</th>
              <th className="pb-2 pr-4">Date</th>
            </tr>
          </thead>
          <tbody>
            {hands.map((h) => (
              <Fragment key={h.id}>
                <tr
                  onClick={() => toggleExpand(h.id)}
                  className="border-b border-gray-800/50 hover:bg-panel-light/30 cursor-pointer"
                >
                  <td className="py-2 pr-4 text-gray-300">#{h.hand_number}</td>
                  <td className="py-2 pr-4 text-gray-400 text-xs">{h.table_id}</td>
                  <td className="py-2 pr-4 text-gold font-mono text-xs">{formatIskCompact(h.pot_total)}</td>
                  <td className="py-2 pr-4 text-amber-400 font-mono text-xs">{formatIskCompact(h.rake_taken)}</td>
                  <td className="py-2 pr-4 text-gray-400">{h.player_count}</td>
                  <td className="py-2 pr-4 text-gray-500 text-xs">
                    {new Date(h.started_at).toLocaleString()}
                  </td>
                </tr>

                {/* Expanded detail */}
                {expanded === h.id && detail && detail.id === h.id && (
                  <tr key={`detail-${h.id}`}>
                    <td colSpan={6} className="py-3 px-4 bg-panel-light/20">
                      <HandDetailView detail={detail} />
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {hands.length === 0 && (
        <div className="text-gray-500 text-sm mt-4">No hands found</div>
      )}
    </>
  );
}

function HandDetailView({ detail }: { detail: AdminHandDetail }) {
  const communityCards = detail.community_cards?.split(' ').filter(Boolean) ?? [];

  // Group actions by street
  const streets = ['preflop', 'flop', 'turn', 'river'];
  const actionsByStreet: Record<string, typeof detail.actions> = {};
  for (const s of streets) {
    const acts = detail.actions.filter((a) => a.street === s);
    if (acts.length > 0) actionsByStreet[s] = acts;
  }

  return (
    <div className="space-y-4">
      {/* Community cards */}
      {communityCards.length > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Board:</span>
          <div className="flex gap-1">
            {communityCards.map((c, i) => (
              <Card key={i} card={c} size="sm" />
            ))}
          </div>
        </div>
      )}

      {/* Players */}
      <div>
        <div className="text-xs text-gray-500 mb-1">Players:</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
          {detail.players.map((p) => {
            const cards = p.hole_cards?.split(' ').filter(Boolean) ?? [];
            return (
              <div
                key={p.user_id}
                className={`flex items-center gap-2 px-2 py-1 rounded text-xs ${
                  p.is_winner ? 'bg-green-900/20 border border-green-800/30' : 'bg-panel-light/30'
                }`}
              >
                <span className="text-gray-400 w-5">S{p.seat}</span>
                <span className="text-gray-200 w-28 truncate">{p.character_name}</span>
                {cards.length >= 2 && (
                  <div className="flex gap-0.5">
                    {cards.map((c, i) => <Card key={i} card={c} size="sm" />)}
                  </div>
                )}
                <span className={`ml-auto font-mono ${p.net_won >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {p.net_won >= 0 ? '+' : ''}{formatIskCompact(p.net_won)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Actions */}
      <div>
        <div className="text-xs text-gray-500 mb-1">Actions:</div>
        {Object.entries(actionsByStreet).map(([street, actions]) => (
          <div key={street} className="mb-2">
            <div className="text-[10px] text-gray-600 uppercase tracking-wide mb-0.5">{street}</div>
            <div className="flex flex-wrap gap-1">
              {actions.map((a, i) => (
                <span key={i} className="text-[10px] bg-panel-light px-1.5 py-0.5 rounded text-gray-300">
                  <span className="text-gray-500">{a.character_name}</span>{' '}
                  <span className="text-white">{a.action}</span>
                  {a.amount > 0 && <span className="text-gold"> {formatIskCompact(a.amount)}</span>}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Seed info */}
      <div className="text-[9px] text-gray-600 font-mono">
        Seed: {detail.server_seed_hash}
      </div>
    </div>
  );
}

// ─── Deposits ───────────────────────────────────────────────

function DepositsTab() {
  const [deposits, setDeposits] = useState<AdminDeposit[]>([]);

  useEffect(() => {
    api.admin.getDeposits().then(setDeposits);
  }, []);

  if (deposits.length === 0) {
    return <div className="text-gray-500 text-sm">No deposits found</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-gray-500 border-b border-gray-800">
            <th className="pb-2 pr-4">Player</th>
            <th className="pb-2 pr-4">Amount</th>
            <th className="pb-2 pr-4">Balance After</th>
            <th className="pb-2 pr-4">Date</th>
          </tr>
        </thead>
        <tbody>
          {deposits.map((d) => (
            <tr key={d.id} className="border-b border-gray-800/50">
              <td className="py-2 pr-4 text-gray-200">{d.character_name}</td>
              <td className="py-2 pr-4 text-green-400 font-mono text-xs">{formatIsk(d.amount)}</td>
              <td className="py-2 pr-4 text-gold font-mono text-xs">{formatIsk(d.balance_after)}</td>
              <td className="py-2 pr-4 text-gray-500 text-xs">
                {d.created_at ? new Date(d.created_at).toLocaleString() : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface AnalyticsData {
  total_views: number;
  total_unique: number;
  today_views: number;
  today_unique: number;
  daily: { date: string; views: number; unique: number }[];
}

function TrafficTab() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const token = useAuthStore((s) => s.token);

  useEffect(() => {
    if (!token) return;
    fetch('/api/admin/analytics', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(setData)
      .catch(() => {});
  }, [token]);

  if (!data) return <div className="text-text-muted text-sm">Loading...</div>;

  const maxViews = Math.max(...data.daily.map(d => d.views), 1);

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-surface rounded-lg border border-surface-light/50 p-4">
          <div className="text-[10px] text-text-muted uppercase tracking-widest font-bold mb-1">Total Views</div>
          <div className="text-2xl font-extrabold text-white">{data.total_views.toLocaleString()}</div>
        </div>
        <div className="bg-surface rounded-lg border border-surface-light/50 p-4">
          <div className="text-[10px] text-text-muted uppercase tracking-widest font-bold mb-1">Unique Visitors</div>
          <div className="text-2xl font-extrabold text-green">{data.total_unique.toLocaleString()}</div>
        </div>
        <div className="bg-surface rounded-lg border border-surface-light/50 p-4">
          <div className="text-[10px] text-text-muted uppercase tracking-widest font-bold mb-1">Today Views</div>
          <div className="text-2xl font-extrabold text-white">{data.today_views.toLocaleString()}</div>
        </div>
        <div className="bg-surface rounded-lg border border-surface-light/50 p-4">
          <div className="text-[10px] text-text-muted uppercase tracking-widest font-bold mb-1">Today Unique</div>
          <div className="text-2xl font-extrabold text-green">{data.today_unique.toLocaleString()}</div>
        </div>
      </div>

      {/* Daily chart — simple bar chart */}
      <div className="bg-surface rounded-lg border border-surface-light/50 p-5">
        <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-4">Last 7 Days</h3>
        {data.daily.length === 0 ? (
          <div className="text-text-muted text-sm">No data yet</div>
        ) : (
          <div className="flex items-end gap-2 h-32">
            {data.daily.map((d) => (
              <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                <div className="text-[10px] text-green font-bold">{d.unique}</div>
                <div
                  className="w-full bg-green/30 rounded-t-sm relative"
                  style={{ height: `${Math.max(4, (d.views / maxViews) * 100)}%` }}
                >
                  <div
                    className="absolute bottom-0 left-0 right-0 bg-green rounded-t-sm"
                    style={{ height: `${Math.max(4, (d.unique / maxViews) * 100)}%` }}
                  />
                </div>
                <div className="text-[9px] text-text-muted font-semibold">
                  {new Date(d.date + 'T00:00:00').toLocaleDateString('en', { weekday: 'short' })}
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="flex gap-4 mt-3 text-[10px] text-text-muted font-semibold">
          <div className="flex items-center gap-1"><div className="w-2 h-2 bg-green rounded-sm" /> Unique</div>
          <div className="flex items-center gap-1"><div className="w-2 h-2 bg-green/30 rounded-sm" /> Total Views</div>
        </div>
      </div>
    </div>
  );
}
