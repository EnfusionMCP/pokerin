import { useNavigate } from 'react-router-dom';
import { useTableStore } from '../../stores/tableStore';

interface Props { isOpen: boolean; onClose: () => void; spectator?: boolean; }

export function SideMenu({ isOpen, onClose, spectator = false }: Props) {
  const navigate = useNavigate();
  const send = useTableStore((s) => s.send);
  const mySeat = useTableStore((s) => s.mySeat);
  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40 animate-fade-in" onClick={onClose} />
      <div className="fixed left-0 top-0 h-full w-52 bg-surface border-r border-surface-light z-50 animate-slide-in-left shadow-2xl">
        <div className="flex justify-end px-3 py-3">
          <button onClick={onClose} className="text-text-muted hover:text-text text-lg">&#x2715;</button>
        </div>
        <nav className="flex flex-col">
          {!spectator && mySeat >= 0 && (
            <button onClick={() => { send?.({ type: 'stand' }); onClose(); }}
              className="flex items-center gap-3 px-5 py-3 text-sm text-text hover:bg-surface-light hover:text-white transition-colors text-left font-semibold">
              Stand Up
            </button>
          )}
          <button onClick={() => { onClose(); navigate(spectator ? '/login' : '/lobby'); }}
            className="flex items-center gap-3 px-5 py-3 text-sm text-text hover:bg-surface-light hover:text-white transition-colors text-left font-semibold">
            {spectator ? 'Back to Home' : 'Back to Lobby'}
          </button>
          {spectator && (
            <button onClick={() => { window.location.href = '/auth/login'; }}
              className="flex items-center gap-3 px-5 py-3 text-sm text-green hover:bg-surface-light transition-colors text-left font-bold">
              Login with EVE
            </button>
          )}
        </nav>
      </div>
    </>
  );
}
