import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import { LoginPage } from './components/auth/LoginPage';
import { PageShell } from './components/layout/PageShell';
import { CashierPage } from './components/cashier/CashierPage';
import { TablePage } from './components/table/TablePage';
import { AdminPage } from './components/admin/AdminPage';
import { StatsPage } from './components/stats/StatsPage';
import { AboutPage } from './components/about/AboutPage';

function AuthGuard({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (!isAuthenticated) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export function AppRouter() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/login" element={<Navigate to="/" replace />} />
        <Route path="/lobby" element={<Navigate to="/" replace />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/table/:tableId" element={<TablePage />} />
        <Route element={<AuthGuard><PageShell /></AuthGuard>}>
          <Route path="/cashier" element={<CashierPage />} />
          <Route path="/stats" element={<StatsPage />} />
          <Route path="/admin" element={<AdminPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}
