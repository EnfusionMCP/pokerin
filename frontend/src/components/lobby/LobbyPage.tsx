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
      {/* Balance bar */}
      <div className="flex items-center justify-between mb-7">
        <h2 className="font-display text-3xl font-bold text-white tracking-wide">Tables</h2>
        {balance !== null && (
          <div className="text-sm text-gray-400">
            Balance: <span className="text-gold font-mono font-bold">{formatIsk(balance)}</span>
          </div>
        )}
      </div>

      {/* Table list */}
      <div className="bg-panel/80 rounded-xl border border-gray-800/60 overflow-hidden shadow-xl shadow-black/20">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-700/60 text-gray-500 text-left">
              <th className="py-3.5 px-3 md:px-5 font-medium text-xs uppercase tracking-wider">Table</th>
              <th className="py-3.5 px-3 md:px-5 font-medium text-xs uppercase tracking-wider">Blinds</th>
              <th className="py-3.5 px-3 md:px-5 font-medium text-xs uppercase tracking-wider hidden md:table-cell">Buy-in</th>
              <th className="py-3.5 px-3 md:px-5 font-medium text-xs uppercase tracking-wider">Players</th>
              <th className="py-3.5 px-3 md:px-5 font-medium text-right"></th>
            </tr>
          </thead>
          <tbody>
            {tables.map((t) => (
              <TableRow key={t.table_id} table={t} />
            ))}
            {loading && tables.length === 0 && (
              [...Array(5)].map((_, i) => (
                <tr key={i} className="border-b border-gray-800/40">
                  <td className="py-3.5 px-5"><div className="h-4 w-28 bg-gray-800 rounded animate-pulse" /></td>
                  <td className="py-3.5 px-5"><div className="h-4 w-24 bg-gray-800 rounded animate-pulse" /></td>
                  <td className="py-3.5 px-5 hidden md:table-cell"><div className="h-4 w-32 bg-gray-800 rounded animate-pulse" /></td>
                  <td className="py-3.5 px-5"><div className="h-4 w-10 bg-gray-800 rounded animate-pulse" /></td>
                  <td className="py-3.5 px-5 text-right"><div className="h-8 w-16 bg-gray-800 rounded animate-pulse ml-auto" /></td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {!loading && tables.length === 0 && !error && (
          <div className="py-16 text-center text-gray-600">No tables available</div>
        )}
        {error && (
          <div className="py-16 text-center text-red-400/80">Failed to load tables. Retrying...</div>
        )}
      </div>
    </div>
  );
}
