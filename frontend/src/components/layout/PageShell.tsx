import { Outlet } from 'react-router-dom';
import { Header } from './Header';

export function PageShell() {
  return (
    <div className="flex flex-col min-h-screen bg-base">
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}
