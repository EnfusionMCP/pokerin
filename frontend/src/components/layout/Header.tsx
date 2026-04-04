import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';

function NavLink({ to, children }: { to: string; children: React.ReactNode }) {
  const { pathname } = useLocation();
  const active = pathname === to || pathname.startsWith(to + '/');
  return (
    <Link
      to={to}
      className={`relative text-xs md:text-sm font-medium tracking-wide transition-colors py-1 ${
        active ? 'text-gold' : 'text-gray-400 hover:text-gray-200'
      }`}
    >
      {children}
      {active && (
        <span className="absolute -bottom-[11px] left-0 right-0 h-[2px] bg-gold rounded-full" />
      )}
    </Link>
  );
}

export function Header() {
  const { characterName, portraitUrl, isAdmin, logout } = useAuthStore();

  return (
    <header className="relative">
      {/* Gold accent line */}
      <div className="h-[2px] bg-gradient-to-r from-transparent via-gold/60 to-transparent" />

      <div className="flex items-center justify-between px-4 md:px-6 py-2.5 md:py-3 bg-panel/95 backdrop-blur-sm border-b border-gray-800/80">
        <Link to="/lobby" className="font-display text-xl md:text-2xl font-bold text-gold tracking-wider hover:text-gold-light transition-colors">
          pokerin.space
        </Link>

        <nav className="flex items-center gap-3 md:gap-5">
          <NavLink to="/lobby">Tables</NavLink>
          <NavLink to="/cashier">Cashier</NavLink>
          <NavLink to="/stats">Stats</NavLink>
          <NavLink to="/about">About</NavLink>
          {isAdmin && (
            <NavLink to="/admin">Admin</NavLink>
          )}

          <div className="flex items-center gap-2.5 md:gap-3 ml-2 md:ml-4 pl-3 md:pl-4 border-l border-gray-700/60">
            {portraitUrl && (
              <img
                src={portraitUrl}
                alt={characterName ?? ''}
                className="w-7 h-7 md:w-8 md:h-8 rounded-full border-2 border-gray-700 hover:border-gold/50 transition-colors"
              />
            )}
            <span className="text-xs md:text-sm text-gray-300 hidden sm:inline font-medium">{characterName}</span>
            <button
              onClick={logout}
              className="text-[11px] text-gray-600 hover:text-red-400 transition-colors font-medium uppercase tracking-wide"
            >
              Logout
            </button>
          </div>
        </nav>
      </div>
    </header>
  );
}
