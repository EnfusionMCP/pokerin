/** Pre-action buttons — Stake-style: Check/Fold, Check, Check/Call */

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
    { key: 'call_any', label: 'Check / Call' },
  ];

  return (
    <div className="fixed bottom-4 right-4 z-30 flex gap-1.5">
      {buttons.map((b) => (
        <button
          key={b.key}
          onClick={() => setPreAction(b.key)}
          className={`px-3.5 py-2 text-xs font-bold rounded-lg border transition-all ${
            preAction === b.key
              ? 'bg-green/15 border-green/40 text-green'
              : 'bg-surface border-surface-light text-text-muted hover:text-text hover:border-surface-lighter'
          }`}
        >
          {b.label}
        </button>
      ))}
    </div>
  );
}
