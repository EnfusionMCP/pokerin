import { useToastStore, type ToastType } from '../../stores/toastStore';

const ICONS: Record<ToastType, string> = { success: '\u2713', error: '\u2717', info: '\u24D8' };
const COLORS: Record<ToastType, string> = {
  success: 'border-green/50 bg-green/10',
  error: 'border-red/50 bg-red/10',
  info: 'border-blue/50 bg-blue/10',
};

export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);
  const remove = useToastStore((s) => s.remove);
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-16 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div key={t.id} className={`pointer-events-auto flex items-center gap-2.5 px-4 py-3 rounded-lg border text-sm text-white shadow-xl animate-slide-in ${COLORS[t.type]}`}>
          <span className="text-base">{ICONS[t.type]}</span>
          <span className="flex-1 font-semibold">{t.message}</span>
          <button onClick={() => remove(t.id)} className="text-white/40 hover:text-white ml-2 text-xs">&#x2715;</button>
        </div>
      ))}
    </div>
  );
}
