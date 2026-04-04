/** Side menu — slide-out panel with table actions */

import { useNavigate } from 'react-router-dom';
import { useTableStore } from '../../stores/tableStore';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function SideMenu({ isOpen, onClose }: Props) {
  const navigate = useNavigate();
  const send = useTableStore((s) => s.send);
  const mySeat = useTableStore((s) => s.mySeat);

  if (!isOpen) return null;

  const handleStandUp = () => {
    send?.({ type: 'stand' });
    onClose();
  };

  const handleLeave = () => {
    onClose();
    navigate('/lobby');
  };

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 z-40 animate-fade-in"
        onClick={onClose}
      />

      <div className="fixed left-0 top-0 h-full w-52 bg-panel/95 backdrop-blur-md border-r border-gray-700/60 z-50 animate-slide-in-left shadow-2xl">
        <div className="flex justify-end px-3 py-3">
          <button onClick={onClose} className="text-gray-600 hover:text-gray-300 text-lg transition-colors">
            &#x2715;
          </button>
        </div>

        <nav className="flex flex-col">
          {mySeat >= 0 && (
            <button
              onClick={handleStandUp}
              className="flex items-center gap-3 px-5 py-3 text-sm text-gray-400 hover:bg-panel-light hover:text-white transition-colors text-left font-medium"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              Stand Up
            </button>
          )}

          <button
            onClick={handleLeave}
            className="flex items-center gap-3 px-5 py-3 text-sm text-gray-400 hover:bg-panel-light hover:text-white transition-colors text-left font-medium"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            Back to Lobby
          </button>
        </nav>
      </div>
    </>
  );
}
