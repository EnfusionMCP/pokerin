import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';

function NavLink({ to, children }: { to: string; children: React.ReactNode }) {
  const { pathname } = useLocation();
  const active = pathname === to || pathname.startsWith(to + '/');
  return (
    <Link
      to={to}
      className={`text-sm font-semibold transition-colors px-3 py-1.5 rounded-md ${
        active ? 'text-white bg-surface-light' : 'text-text-muted hover:text-text'
      }`}
    >
      {children}
    </Link>
  );
}

export function Header() {
  const { characterName, portraitUrl, isAdmin, logout } = useAuthStore();

  return (
    <header className="flex items-center justify-between px-4 md:px-6 h-[60px] bg-surface border-b border-surface-light/50">
      <Link to="/lobby" className="text-xl font-extrabold text-white tracking-tight hover:text-green transition-colors">
        pokerin.space
      </Link>

      <nav className="flex items-center gap-1">
        <NavLink to="/lobby">Tables</NavLink>
        <NavLink to="/cashier">Cashier</NavLink>
        <NavLink to="/stats">Stats</NavLink>
        <NavLink to="/about">About</NavLink>
        {isAdmin && <NavLink to="/admin">Admin</NavLink>}

        <div className="flex items-center gap-2.5 ml-4 pl-4 border-l border-surface-light/50">
          {portraitUrl && (
            <img
              src={portraitUrl}
              alt={characterName ?? ''}
              className="w-8 h-8 rounded-full border-2 border-surface-light"
            />
          )}
          <span className="text-sm text-text hidden sm:inline font-semibold">{characterName}</span>
          <button
            onClick={logout}
            className="text-xs text-text-muted hover:text-red transition-colors font-semibold"
          >
            Logout
          </button>
        </div>
      </nav>
    </header>
  );
}
