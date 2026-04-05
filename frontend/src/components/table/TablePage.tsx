import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { useWebSocket } from '../../hooks/useWebSocket';
import { useSpectatorPolling } from '../../hooks/useSpectatorPolling';
import { useTableStore } from '../../stores/tableStore';
import { formatIskCompact } from '../../lib/isk';
import { PokerTable } from './PokerTable';
import { ChatPanel } from './ChatPanel';
import { SideMenu } from './SideMenu';
import { TableToggles } from './TableToggles';
import { BottomToolbar } from './BottomToolbar';

export function TablePage() {
  const { tableId } = useParams<{ tableId: string }>();
  const navigate = useNavigate();
  const isAuth = useAuthStore((s) => s.isAuthenticated);

  // Auth: WebSocket, Spectator: REST polling. One is always a no-op.
  useWebSocket(isAuth ? (tableId ?? '') : '');
  useSpectatorPolling(isAuth ? '' : (tableId ?? ''));

  const connected = useTableStore((s) => s.connected);
  const tableName = useTableStore((s) => s.tableName);
  const lastError = useTableStore((s) => s.lastError);
  const blinds = useTableStore((s) => s.blinds);
  const handNum = useTableStore((s) => s.handNum);

  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (lastError === 'Table not found') {
      navigate('/', { replace: true });
    }
  }, [lastError, navigate, isAuth]);

  if (!tableId) return null;

  if (!connected && !tableName) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-base gap-3">
        <div className="w-8 h-8 border-2 border-green border-t-transparent rounded-full animate-spin" />
        <div className="text-text-muted text-sm font-semibold">
          {isAuth ? 'Connecting to table...' : 'Loading table...'}
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-base flex flex-col relative">
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
        <div className="flex items-center gap-3">
          {handNum > 0 && (
            <span className="text-xs text-text-muted font-semibold">#{handNum}</span>
          )}
          {!isAuth && (
            <button
              onClick={() => { window.location.href = '/auth/login'; }}
              className="flex items-center gap-2 px-3 py-1.5 bg-green text-black text-xs font-bold rounded-lg hover:brightness-110 transition-all cursor-pointer"
            >
              Login to Play
            </button>
          )}
        </div>
      </div>

      {/* Table area */}
      <div className="flex-1 flex items-center justify-center p-4">
        <PokerTable spectator={!isAuth} />
      </div>

      {/* Overlays — only for authenticated users */}
      {isAuth && (
        <>
          <ChatPanel />
          <TableToggles />
        </>
      )}
      <BottomToolbar />
      <SideMenu isOpen={menuOpen} onClose={() => setMenuOpen(false)} spectator={!isAuth} />

      {/* Disconnected overlay — only for authenticated (spectator polling handles its own state) */}
      {isAuth && !connected && tableName && (
        <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center z-50 gap-3">
          <div className="text-white text-lg font-bold">Connection Lost</div>
          <div className="text-text-muted text-sm">Attempting to reconnect...</div>
          <div className="w-6 h-6 border-2 border-green border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}
