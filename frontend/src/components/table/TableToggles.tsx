/** Left-side toggles — Sit Out, Fold to Any Bet */

import { useTableStore } from '../../stores/tableStore';

export function TableToggles() {
  const mySeat = useTableStore((s) => s.mySeat);
  const sitOutNext = useTableStore((s) => s.sitOutNext);
  const foldToAnyBet = useTableStore((s) => s.foldToAnyBet);

  if (mySeat < 0) return null;

  const handleSitOut = () => {
    const next = !sitOutNext;
    useTableStore.setState({
      sitOutNext: next,
      ...(next ? { preAction: 'check_fold' as const } : {}),
    });
  };

  const handleFoldToAny = () => {
    const next = !foldToAnyBet;
    useTableStore.setState({
      foldToAnyBet: next,
      ...(next ? { preAction: 'check_fold' as const } : {}),
    });
  };

  return (
    <div className="fixed left-3 bottom-24 z-20 flex flex-col gap-2">
      <label className="flex items-center gap-2 text-[10px] text-gray-600 hover:text-gray-400 cursor-pointer transition-colors">
        <input
          type="checkbox"
          checked={sitOutNext}
          onChange={handleSitOut}
          className="w-3 h-3 rounded"
        />
        Sit Out Next Hand
      </label>
      <label className="flex items-center gap-2 text-[10px] text-gray-600 hover:text-gray-400 cursor-pointer transition-colors">
        <input
          type="checkbox"
          checked={foldToAnyBet}
          onChange={handleFoldToAny}
          className="w-3 h-3 rounded"
        />
        Fold to Any Bet
      </label>
    </div>
  );
}
