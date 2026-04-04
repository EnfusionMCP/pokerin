/** Pre-action buttons — Check/Fold, Check, Call Any toggles before your turn */

import { useTableStore } from '../../stores/tableStore';

type PreAction = 'check_fold' | 'check' | 'call_any';

export function PreActionBar() {
  const mySeat = useTableStore((s) => s.mySeat);
  const actionOn = useTableStore((s) => s.actionOn);
  const phase = useTableStore((s) => s.phase);
  const preAction = useTableStore((s) => s.preAction);
  const prompt = useTableStore((s) => s.prompt);

  if (mySeat < 0 || actionOn === mySeat || phase !== 'betting' || prompt !== null) return null;

  const setPreAction = (action: PreAction | null) => {
    const current = useTableStore.getState().preAction;
    useTableStore.setState({ preAction: current === action ? null : action });
  };

  const buttons: { key: PreAction; label: string }[] = [
    { key: 'check_fold', label: 'Check / Fold' },
    { key: 'check', label: 'Check' },
    { key: 'call_any', label: 'Check / Call Any' },
  ];

  return (
    <div className="fixed bottom-4 right-4 z-30 flex gap-1.5">
      {buttons.map((b) => (
        <button
          key={b.key}
          onClick={() => setPreAction(b.key)}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all backdrop-blur-sm ${
            preAction === b.key
              ? 'bg-gold/15 border-gold/30 text-gold shadow-sm'
              : 'bg-panel/80 border-gray-700/60 text-gray-500 hover:text-gray-300 hover:border-gray-600'
          }`}
        >
          {b.label}
        </button>
      ))}
    </div>
  );
}
