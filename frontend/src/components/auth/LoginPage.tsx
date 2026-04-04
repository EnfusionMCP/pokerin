import { Link } from 'react-router-dom';

export function LoginPage() {
  const handleLogin = () => {
    window.location.href = '/auth/login';
  };

  return (
    <div className="flex flex-col items-center min-h-screen bg-surface relative overflow-hidden">
      {/* Atmospheric background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse 80% 50% at 50% 40%, rgba(13, 92, 46, 0.12) 0%, transparent 70%),
            radial-gradient(ellipse 60% 40% at 30% 60%, rgba(201, 168, 76, 0.04) 0%, transparent 60%),
            radial-gradient(ellipse 60% 40% at 70% 60%, rgba(201, 168, 76, 0.04) 0%, transparent 60%)
          `,
        }}
      />

      {/* Subtle grid lines */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(201, 168, 76, 0.5) 1px, transparent 1px),
            linear-gradient(90deg, rgba(201, 168, 76, 0.5) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
        }}
      />

      <div className="flex flex-col items-center justify-center flex-1 w-full relative z-10">
        <div className="text-center mb-14">
          <h1
            className="font-display text-6xl md:text-7xl font-bold text-gold tracking-wider mb-3"
            style={{ textShadow: '0 0 40px rgba(201, 168, 76, 0.25), 0 2px 8px rgba(0,0,0,0.5)' }}
          >
            pokerin.space
          </h1>
          <p className="text-gray-500 text-lg tracking-wide font-light">Texas Hold'em for EVE Online</p>
        </div>

        <button
          onClick={handleLogin}
          className="group flex items-center gap-3.5 px-8 py-4 bg-panel-light/80 hover:bg-panel-light border border-gray-700/80 hover:border-gold/40 rounded-xl transition-all cursor-pointer shadow-lg shadow-black/30 hover:shadow-gold/5"
        >
          <img
            src="https://images.evetech.net/alliances/1/logo?size=64"
            alt="EVE"
            className="w-8 h-8 opacity-80 group-hover:opacity-100 transition-opacity"
          />
          <span className="text-lg text-gray-200 group-hover:text-white font-medium transition-colors">Login with EVE Online</span>
        </button>

        <p className="mt-10 text-sm text-gray-600 tracking-wide">
          A game of skill. Your ISK, your cards, your decisions.
        </p>
      </div>

      {/* How It Works */}
      <div className="w-full max-w-3xl px-4 pb-14 relative z-10">
        <h2 className="font-display text-xl font-semibold text-gray-400 text-center mb-7 tracking-wide uppercase">How It Works</h2>
        <div className="grid md:grid-cols-3 gap-5">
          {[
            { step: '01', title: 'Deposit', text: <>Send ISK to <span className="text-gray-200 font-medium">POKER IN SPACE</span> in-game. Your character is matched automatically by ID, and your balance updates within a few minutes.</> },
            { step: '02', title: 'Play', text: 'Sit at any table, buy in, and play Texas Hold\'em against other real players. Five stake levels from micro to whale. Standard No-Limit rules.' },
            { step: '03', title: 'Withdraw', text: 'Request a withdrawal from your balance at any time. ISK is sent to your character in-game. All balances are held in full reserve \u2014 every ISK on the site is backed 1:1.' },
          ].map((item) => (
            <div key={item.step} className="bg-panel/60 border border-gray-800/80 rounded-xl p-5 text-center hover:border-gray-700 transition-colors group">
              <div className="font-mono text-[10px] text-gold/40 tracking-widest mb-2">{item.step}</div>
              <div className="font-display text-lg font-semibold text-gold mb-2.5 tracking-wide">{item.title}</div>
              <p className="text-gray-500 text-sm leading-relaxed">{item.text}</p>
            </div>
          ))}
        </div>
      </div>

      <Link to="/about" className="mb-10 text-xs text-gray-600 hover:text-gold transition-colors tracking-wide relative z-10">
        About pokerin.space
      </Link>
    </div>
  );
}
