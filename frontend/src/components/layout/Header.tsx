import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';

function NavLink({ to, children }: { to: string; children: React.ReactNode }) {
  const { pathname } = useLocation();
  const active = pathname === to || pathname.startsWith(to + '/');
  return (
    <Link
      to={to}
      className={`text-base font-semibold transition-colors px-3 py-1.5 rounded-md ${
        active ? 'text-white bg-surface-light/60' : 'text-text-muted hover:text-text'
      }`}
    >
      {children}
    </Link>
  );
}

export function Header() {
  const { characterName, portraitUrl, isAdmin, logout } = useAuthStore();

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between px-5 md:px-8 h-16 bg-base/80 backdrop-blur-md border-b border-white/[0.06]">
      <Link to="/" className="text-xl font-extrabold text-white tracking-tight hover:text-green transition-colors">
        pokerin<span className="text-green">.</span>space
      </Link>

      <nav className="flex items-center gap-1">
        <NavLink to="/">Tables</NavLink>
        <NavLink to="/cashier">Cashier</NavLink>
        <NavLink to="/stats">Stats</NavLink>
        <NavLink to="/fair">Fair</NavLink>
        <NavLink to="/about">About</NavLink>
        {isAdmin && <NavLink to="/admin">Admin</NavLink>}

        <div className="flex items-center gap-3 ml-3 pl-3 border-l border-surface-light/30">
          {portraitUrl && (
            <img
              src={portraitUrl}
              alt={characterName ?? ''}
              className="w-8 h-8 rounded-full border border-surface-light"
            />
          )}
          <span className="text-sm text-text hidden sm:inline font-semibold">{characterName}</span>
          <button
            onClick={logout}
            className="text-sm text-text-muted hover:text-red transition-colors font-semibold"
          >
            Logout
          </button>
        </div>
      </nav>
    </header>
  );
}
