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
      className="border-b border-surface-light/30 hover:bg-surface-light/30 cursor-pointer transition-colors group"
      onClick={() => navigate(`/table/${table.table_id}`)}
    >
      <td className="py-3 px-4">
        <span className="text-white font-semibold text-sm group-hover:text-green transition-colors">{table.name}</span>
      </td>
      <td className="py-3 px-4 text-text text-sm font-semibold">
        {formatBlinds(table.small_blind, table.big_blind)}
      </td>
      <td className="py-3 px-4 text-text-muted text-sm hidden md:table-cell">
        {formatIskShort(table.min_buyin)} - {formatIskShort(table.max_buyin)}
      </td>
      <td className="py-3 px-4">
        <div className="flex items-center gap-2">
          <div className="flex gap-0.5">
            {Array.from({ length: table.max_seats }, (_, i) => (
              <div
                key={i}
                className={`w-1.5 h-1.5 rounded-full ${
                  i < table.player_count
                    ? isFull ? 'bg-red' : 'bg-green'
                    : 'bg-surface-light'
                }`}
              />
            ))}
          </div>
          <span className={`text-xs font-bold ${isFull ? 'text-red' : hasPlayers ? 'text-green' : 'text-text-muted'}`}>
            {table.player_count}/{table.max_seats}
          </span>
        </div>
      </td>
      <td className="py-3 px-4 text-right">
        <button
          className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${
            isFull
              ? 'bg-surface-light text-text-muted cursor-not-allowed'
              : 'bg-green hover:brightness-110 text-black'
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
