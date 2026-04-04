import { useNavigate } from 'react-router-dom';
import type { TableInfo } from '../../types/api';
import { formatBlinds, formatIskShort } from '../../lib/isk';

interface Props {
  table: TableInfo;
}

export function TableRow({ table }: Props) {
  const navigate = useNavigate();

  const seatsFree = table.max_seats - table.player_count;
  const isFull = seatsFree <= 0;
  const hasPlayers = table.player_count > 0;

  return (
    <tr
      className="border-b border-gray-800/40 hover:bg-panel-light/50 cursor-pointer transition-colors group"
      onClick={() => navigate(`/table/${table.table_id}`)}
    >
      <td className="py-3.5 px-3 md:px-5">
        <span className="text-white font-medium text-sm group-hover:text-gold transition-colors">{table.name}</span>
      </td>
      <td className="py-3.5 px-3 md:px-5 text-gray-300 text-sm font-mono">
        {formatBlinds(table.small_blind, table.big_blind)}
      </td>
      <td className="py-3.5 px-3 md:px-5 text-gray-500 text-sm font-mono hidden md:table-cell">
        {formatIskShort(table.min_buyin)} - {formatIskShort(table.max_buyin)}
      </td>
      <td className="py-3.5 px-3 md:px-5">
        <div className="flex items-center gap-2">
          {/* Player dots */}
          <div className="flex gap-0.5">
            {Array.from({ length: table.max_seats }, (_, i) => (
              <div
                key={i}
                className={`w-1.5 h-1.5 rounded-full ${
                  i < table.player_count
                    ? isFull ? 'bg-red-400' : 'bg-emerald-400'
                    : 'bg-gray-700'
                }`}
              />
            ))}
          </div>
          <span className={`text-xs font-mono ${isFull ? 'text-red-400' : hasPlayers ? 'text-emerald-400' : 'text-gray-600'}`}>
            {table.player_count}/{table.max_seats}
          </span>
        </div>
      </td>
      <td className="py-3.5 px-3 md:px-5 text-right">
        <button
          className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${
            isFull
              ? 'bg-gray-800 text-gray-600 cursor-not-allowed'
              : 'bg-emerald-700/80 hover:bg-emerald-600 text-white shadow-sm'
          }`}
          disabled={isFull}
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/table/${table.table_id}`);
          }}
        >
          {isFull ? 'Full' : 'Join'}
        </button>
      </td>
    </tr>
  );
}
