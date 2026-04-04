/** Toast notifications — top-right, auto-dismiss */

import { useToastStore, type ToastType } from '../../stores/toastStore';

const ICONS: Record<ToastType, string> = {
  success: '\u2713',
  error: '\u2717',
  info: '\u24D8',
};

const COLORS: Record<ToastType, string> = {
  success: 'border-emerald-500/50 bg-emerald-900/80',
  error: 'border-red-500/50 bg-red-900/80',
  info: 'border-blue-500/50 bg-blue-900/80',
};

export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);
  const remove = useToastStore((s) => s.remove);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-16 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto flex items-center gap-2.5 px-4 py-3 rounded-xl border text-sm text-white shadow-xl shadow-black/20 backdrop-blur-md animate-slide-in ${COLORS[t.type]}`}
        >
          <span className="text-base">{ICONS[t.type]}</span>
          <span className="flex-1 font-medium">{t.message}</span>
          <button
            onClick={() => remove(t.id)}
            className="text-white/40 hover:text-white ml-2 text-xs transition-colors"
          >
            &#x2715;
          </button>
        </div>
      ))}
    </div>
  );
}
