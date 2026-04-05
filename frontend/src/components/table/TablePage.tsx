import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useWebSocket } from '../../hooks/useWebSocket';
import { useTableStore } from '../../stores/tableStore';
import { formatIskCompact } from '../../lib/isk';
import { PokerTable } from './PokerTable';
import { ChatPanel } from './ChatPanel';
import { SideMenu } from './SideMenu';
import { TableToggles } from './TableToggles';
import { BottomToolbar } from './BottomToolbar';

export function TablePage() {
  const { tableId } = useParams<{ tableId: string }>();
  useWebSocket(tableId ?? '');
  const navigate = useNavigate();

  const connected = useTableStore((s) => s.connected);
  const tableName = useTableStore((s) => s.tableName);
  const lastError = useTableStore((s) => s.lastError);
  const blinds = useTableStore((s) => s.blinds);
  const handNum = useTableStore((s) => s.handNum);

  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (lastError === 'Table not found') {
      navigate('/lobby', { replace: true });
    }
  }, [lastError, navigate]);

  if (!tableId) return null;

  if (!connected && !tableName) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-60px)] bg-base gap-3">
        <div className="w-8 h-8 border-2 border-green border-t-transparent rounded-full animate-spin" />
        <div className="text-text-muted text-sm font-semibold">Connecting to table...</div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-60px)] bg-base flex flex-col relative">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-surface border-b border-surface-light/50">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMenuOpen(true)}
            className="text-text-muted hover:text-text transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <span className="text-sm text-white font-bold">{tableName}</span>
          {blinds.big > 0 && (
            <span className="text-xs text-text-muted font-semibold">
              NL {formatIskCompact(blinds.small)}/{formatIskCompact(blinds.big)}
            </span>
          )}
        </div>
        {handNum > 0 && (
          <span className="text-xs text-text-muted font-semibold">#{handNum}</span>
        )}
      </div>

      {/* Table area */}
      <div className="flex-1 flex items-center justify-center p-4">
        <PokerTable />
      </div>

      {/* Overlays */}
      <ChatPanel />
      <TableToggles />
      <BottomToolbar />
      <SideMenu isOpen={menuOpen} onClose={() => setMenuOpen(false)} />

      {/* Disconnected overlay */}
      {!connected && tableName && (
        <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center z-50 gap-3">
          <div className="text-white text-lg font-bold">Connection Lost</div>
          <div className="text-text-muted text-sm">Attempting to reconnect...</div>
          <div className="w-6 h-6 border-2 border-green border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}
