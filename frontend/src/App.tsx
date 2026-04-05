import { useEffect, useRef } from 'react';
import { AppRouter } from './router';
import { ToastContainer } from './components/ui/ToastContainer';
import { useAuthStore } from './stores/authStore';
import { toast } from './stores/toastStore';

function useTokenExpiryCheck() {
  const token = useAuthStore((s) => s.token);
  const warned = useRef(false);
  useEffect(() => {
    if (!token) return;
    warned.current = false;
    const check = () => {
      try {
        const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
        const remaining = (payload.exp * 1000) - Date.now();
        if (remaining <= 0) {
          // Token expired — clear auth and redirect
          useAuthStore.getState().logout();
          window.location.href = '/auth/login';
        } else if (remaining < 3600_000 && !warned.current) {
          warned.current = true;
          toast.info('Session expiring soon — finish your hand and re-login');
        }
      } catch { /* malformed token, ignore */ }
    };
    const id = setInterval(check, 60_000);
    return () => clearInterval(id);
  }, [token]);
}

function usePageTracking() {
  const pinged = useRef(false);
  useEffect(() => {
    if (pinged.current) return;
    pinged.current = true;
    fetch('/api/ping', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: window.location.hash || '/' }),
    }).catch(() => {});
  }, []);
}

export default function App() {
  useTokenExpiryCheck();
  usePageTracking();
  return (
    <>
      <AppRouter />
      <ToastContainer />
    </>
  );
}
