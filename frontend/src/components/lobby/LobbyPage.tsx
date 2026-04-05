import { useEffect } from 'react';
import { useLobbyStore } from '../../stores/lobbyStore';
import { useWalletStore } from '../../stores/walletStore';
import { formatIsk } from '../../lib/isk';
import { TableRow } from './TableRow';

export function LobbyPage() {
  const { tables, loading, error, fetchTables } = useLobbyStore();
  const { balance, fetchBalance } = useWalletStore();

  useEffect(() => {
    fetchTables();
    fetchBalance();
    const interval = setInterval(fetchTables, 10_000);
    return () => clearInterval(interval);
  }, [fetchTables, fetchBalance]);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-extrabold text-white">Tables</h2>
        {balance !== null && (
          <div className="text-sm text-text-muted font-semibold">
            Balance: <span className="text-green">{formatIsk(balance)}</span>
          </div>
        )}
      </div>

      <div className="bg-surface rounded-lg border border-surface-light/50 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-surface-light/50 text-text-muted text-left">
              <th className="py-3 px-4 font-semibold text-xs uppercase tracking-wider">Table</th>
              <th className="py-3 px-4 font-semibold text-xs uppercase tracking-wider">Blinds</th>
              <th className="py-3 px-4 font-semibold text-xs uppercase tracking-wider hidden md:table-cell">Buy-in</th>
              <th className="py-3 px-4 font-semibold text-xs uppercase tracking-wider">Players</th>
              <th className="py-3 px-4 font-semibold text-right"></th>
            </tr>
          </thead>
          <tbody>
            {tables.map((t) => (
              <TableRow key={t.table_id} table={t} />
            ))}
            {loading && tables.length === 0 && (
              [...Array(5)].map((_, i) => (
                <tr key={i} className="border-b border-surface-light/30">
                  <td className="py-3 px-4"><div className="h-4 w-28 bg-surface-light rounded animate-pulse" /></td>
                  <td className="py-3 px-4"><div className="h-4 w-24 bg-surface-light rounded animate-pulse" /></td>
                  <td className="py-3 px-4 hidden md:table-cell"><div className="h-4 w-32 bg-surface-light rounded animate-pulse" /></td>
                  <td className="py-3 px-4"><div className="h-4 w-10 bg-surface-light rounded animate-pulse" /></td>
                  <td className="py-3 px-4 text-right"><div className="h-8 w-16 bg-surface-light rounded animate-pulse ml-auto" /></td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {!loading && tables.length === 0 && !error && (
          <div className="py-16 text-center text-text-muted">No tables available</div>
        )}
        {error && (
          <div className="py-16 text-center text-red">Failed to load tables. Retrying...</div>
        )}
      </div>
    </div>
  );
}
