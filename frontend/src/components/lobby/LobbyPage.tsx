import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLobbyStore } from '../../stores/lobbyStore';
import { useWalletStore } from '../../stores/walletStore';
import { formatIsk, formatBlinds, formatIskShort } from '../../lib/isk';
import type { TableInfo } from '../../types/api';

const STAKE_ACCENT: Record<string, string> = {
  micro: 'bg-blue',
  low: 'bg-green',
  mid: 'bg-orange',
  high: 'bg-red',
  whale: 'bg-[#a855f7]',
};

function getAccent(tableId: string): string {
  const prefix = tableId.split('-')[0];
  return STAKE_ACCENT[prefix] ?? 'bg-green';
}

function TableCard({ table }: { table: TableInfo }) {
  const navigate = useNavigate();
  const full = table.player_count >= table.max_seats;
  const hasPlayers = table.player_count > 0;
  const accent = getAccent(table.table_id);

  return (
    <div
      className="bg-surface/60 border border-surface-light/25 rounded-xl overflow-hidden hover:bg-surface/90 hover:border-surface-light/40 transition-all cursor-pointer group"
      onClick={() => navigate(`/table/${table.table_id}`)}
    >
      <div className={`h-1 ${accent}`} />
      <div className="p-5 md:p-6">
        {/* Name + player count */}
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-white font-bold text-lg group-hover:text-green transition-colors">
            {table.name}
          </h3>
          <span
            className={`text-sm font-bold ${
              full ? 'text-red' : hasPlayers ? 'text-green' : 'text-text-muted'
            }`}
          >
            {table.player_count}/{table.max_seats}
          </span>
        </div>

        {/* Blinds */}
        <div className="text-text font-semibold text-sm mb-4">
          No-Limit {formatBlinds(table.small_blind, table.big_blind)}
        </div>

        {/* Seat meter — horizontal bar segments */}
        <div className="flex gap-1 mb-4">
          {Array.from({ length: table.max_seats }, (_, i) => (
            <div
              key={i}
              className={`flex-1 h-1.5 rounded-full transition-colors ${
                i < table.player_count
                  ? full
                    ? 'bg-red'
                    : 'bg-green'
                  : 'bg-surface-light/40'
              }`}
            />
          ))}
        </div>

        {/* Buy-in + action */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-text-muted font-semibold">
            {formatIskShort(table.min_buyin)} &ndash; {formatIskShort(table.max_buyin)}
          </span>
          <button
            disabled={full}
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/table/${table.table_id}`);
            }}
            className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${
              full
                ? 'bg-surface-light/50 text-text-muted cursor-not-allowed'
                : 'bg-green hover:brightness-110 text-black'
            }`}
          >
            {full ? 'Full' : 'Join'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function LobbyPage() {
  const { tables, loading, error, fetchTables } = useLobbyStore();
  const { balance, fetchBalance } = useWalletStore();

  useEffect(() => {
    fetchTables();
    fetchBalance();
    const interval = setInterval(fetchTables, 10_000);
    return () => clearInterval(interval);
  }, [fetchTables, fetchBalance]);

  const totalPlayers = tables.reduce((s, t) => s + t.player_count, 0);

  return (
    <div className="max-w-4xl mx-auto px-5 md:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-extrabold text-white mb-1">Tables</h2>
          <div className="flex items-center gap-2 text-sm text-text-muted font-semibold">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green/75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-green" />
            </span>
            {totalPlayers} {totalPlayers === 1 ? 'player' : 'players'} online
          </div>
        </div>
        {balance !== null && (
          <div className="text-right">
            <div className="text-[10px] text-text-muted uppercase tracking-widest font-bold mb-0.5">
              Balance
            </div>
            <div className="text-xl font-extrabold text-green">{formatIsk(balance)}</div>
          </div>
        )}
      </div>

      {/* Table cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {tables.map((t) => (
          <TableCard key={t.table_id} table={t} />
        ))}
      </div>

      {/* Loading skeleton */}
      {loading && tables.length === 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-surface/60 border border-surface-light/25 rounded-xl overflow-hidden">
              <div className="h-1 bg-surface-light/30" />
              <div className="p-5 md:p-6 space-y-4">
                <div className="h-5 w-32 bg-surface-light/40 rounded animate-pulse" />
                <div className="h-4 w-24 bg-surface-light/40 rounded animate-pulse" />
                <div className="flex gap-1">
                  {[...Array(9)].map((_, j) => (
                    <div key={j} className="flex-1 h-1.5 bg-surface-light/30 rounded-full" />
                  ))}
                </div>
                <div className="flex justify-between">
                  <div className="h-4 w-28 bg-surface-light/40 rounded animate-pulse" />
                  <div className="h-8 w-16 bg-surface-light/40 rounded-lg animate-pulse" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && tables.length === 0 && !error && (
        <div className="text-center py-16 text-text-muted">No tables available</div>
      )}
      {error && (
        <div className="text-center py-16 text-red">Failed to load tables. Retrying...</div>
      )}
    </div>
  );
}
