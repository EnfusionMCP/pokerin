import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import type { TableInfo } from '../../types/api';
import { formatBlinds, formatIskShort } from '../../lib/isk';

export function LoginPage() {
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const tablesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const load = () =>
      fetch('/api/tables')
        .then(r => (r.ok ? r.json() : []))
        .then((d: TableInfo[]) => setTables(d))
        .catch(() => {});

    load().finally(() => setLoading(false));
    const id = setInterval(load, 15_000);
    return () => clearInterval(id);
  }, []);

  const totalPlayers = tables.reduce((s, t) => s + t.player_count, 0);
  const login = () => { window.location.href = '/auth/login'; };

  return (
    <div className="min-h-screen bg-base">
      {/* ── Fixed Nav ── */}
      <nav className="fixed top-0 inset-x-0 z-50 h-14 flex items-center justify-between px-5 md:px-8 bg-base/80 backdrop-blur-md border-b border-white/[0.06]">
        <span className="text-lg font-extrabold text-white tracking-tight">
          pokerin<span className="text-green">.</span>space
        </span>
        <div className="flex items-center gap-5">
          <Link
            to="/about"
            className="text-sm text-text-muted hover:text-text transition-colors font-semibold hidden sm:block"
          >
            About
          </Link>
          <button
            onClick={login}
            className="flex items-center gap-2 px-4 py-2 bg-green/10 border border-green/25 rounded-lg text-green text-sm font-bold hover:bg-green/20 transition-all cursor-pointer"
          >
            <img
              src="https://images.evetech.net/alliances/1/logo?size=64"
              alt=""
              className="w-5 h-5 opacity-70"
            />
            <span className="hidden sm:inline">Login with EVE</span>
            <span className="sm:hidden">Login</span>
          </button>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative pt-32 pb-16 px-5 md:px-8">
        {/* Subtle background glow */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[-200px] left-1/2 -translate-x-1/2 w-[900px] h-[700px] rounded-full bg-green/[0.03] blur-[120px]" />
        </div>

        <div className="relative max-w-3xl mx-auto text-center">
          <h1
            className="landing-reveal text-5xl md:text-7xl font-extrabold text-white tracking-tight mb-4"
            style={{ animationDelay: '0s' }}
          >
            pokerin<span className="text-green">.</span>space
          </h1>

          <p
            className="landing-reveal text-lg md:text-xl text-text font-medium mb-5"
            style={{ animationDelay: '0.08s' }}
          >
            Texas Hold'em for EVE Online
          </p>

          <p
            className="landing-reveal text-sm md:text-base text-text-muted max-w-lg mx-auto mb-10 leading-relaxed"
            style={{ animationDelay: '0.15s' }}
          >
            No-Limit Hold'em for real ISK against real capsuleers.
            Five stake levels from micro to whale. Provably fair, backed 1:1.
          </p>

          <div
            className="landing-reveal flex flex-col sm:flex-row items-center justify-center gap-3"
            style={{ animationDelay: '0.22s' }}
          >
            <button
              onClick={login}
              className="group flex items-center gap-3 px-7 py-3 bg-green text-black font-bold rounded-lg hover:brightness-110 transition-all shadow-lg shadow-green/15 cursor-pointer"
            >
              <img
                src="https://images.evetech.net/alliances/1/logo?size=64"
                alt=""
                className="w-5 h-5 opacity-70 group-hover:opacity-100 transition-opacity"
              />
              Login with EVE Online
            </button>
            <button
              onClick={() => tablesRef.current?.scrollIntoView({ behavior: 'smooth' })}
              className="px-5 py-3 border border-surface-light/60 text-text hover:text-white hover:border-surface-lighter rounded-lg font-semibold transition-all text-sm cursor-pointer"
            >
              View Tables
            </button>
          </div>

          {/* Live stats */}
          <div
            className="landing-reveal mt-10 flex items-center justify-center gap-6 text-sm"
            style={{ animationDelay: '0.3s' }}
          >
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green/75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-green" />
              </span>
              <span className="text-text-muted font-semibold">
                <span className="text-white">{totalPlayers}</span>{' '}
                {totalPlayers === 1 ? 'player' : 'players'} online
              </span>
            </div>
            <span className="text-text-muted font-semibold">
              <span className="text-white">{tables.length}</span> tables
            </span>
          </div>
        </div>
      </section>

      {/* ── Live Tables ── */}
      <section ref={tablesRef} className="px-5 md:px-8 pb-20">
        <div className="max-w-3xl mx-auto">
          <div
            className="landing-reveal flex items-center gap-2.5 mb-5"
            style={{ animationDelay: '0.35s' }}
          >
            <h2 className="text-xs font-bold text-text-muted uppercase tracking-widest">
              Live Tables
            </h2>
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green/60" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-green" />
            </span>
          </div>

          <div
            className="landing-reveal bg-surface/70 rounded-xl border border-surface-light/30 overflow-hidden"
            style={{ animationDelay: '0.4s' }}
          >
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-light/30 text-text-muted">
                  <th className="py-3 px-4 md:px-5 text-left font-semibold text-[11px] uppercase tracking-wider">
                    Table
                  </th>
                  <th className="py-3 px-4 md:px-5 text-left font-semibold text-[11px] uppercase tracking-wider">
                    Blinds
                  </th>
                  <th className="py-3 px-4 md:px-5 text-left font-semibold text-[11px] uppercase tracking-wider hidden md:table-cell">
                    Buy-in
                  </th>
                  <th className="py-3 px-4 md:px-5 text-left font-semibold text-[11px] uppercase tracking-wider">
                    Players
                  </th>
                  <th className="py-3 px-4 md:px-5" />
                </tr>
              </thead>
              <tbody>
                {tables.map((t) => {
                  const full = t.player_count >= t.max_seats;
                  const hasPlayers = t.player_count > 0;
                  return (
                    <tr
                      key={t.table_id}
                      className="border-b border-surface-light/15 last:border-0 hover:bg-surface-light/15 transition-colors"
                    >
                      <td className="py-3 px-4 md:px-5 text-white font-semibold">
                        {t.name}
                      </td>
                      <td className="py-3 px-4 md:px-5 text-text font-semibold">
                        {formatBlinds(t.small_blind, t.big_blind)}
                      </td>
                      <td className="py-3 px-4 md:px-5 text-text-muted hidden md:table-cell">
                        {formatIskShort(t.min_buyin)} &ndash; {formatIskShort(t.max_buyin)}
                      </td>
                      <td className="py-3 px-4 md:px-5">
                        <div className="flex items-center gap-2">
                          <div className="flex gap-[3px]">
                            {Array.from({ length: t.max_seats }, (_, i) => (
                              <div
                                key={i}
                                className={`w-1.5 h-1.5 rounded-full ${
                                  i < t.player_count
                                    ? full
                                      ? 'bg-red'
                                      : 'bg-green'
                                    : 'bg-surface-light'
                                }`}
                              />
                            ))}
                          </div>
                          <span
                            className={`text-xs font-bold ${
                              full
                                ? 'text-red'
                                : hasPlayers
                                  ? 'text-green'
                                  : 'text-text-muted'
                            }`}
                          >
                            {t.player_count}/{t.max_seats}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 md:px-5 text-right">
                        <button
                          onClick={login}
                          disabled={full}
                          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                            full
                              ? 'bg-surface-light/50 text-text-muted cursor-not-allowed'
                              : 'bg-green/10 border border-green/25 text-green hover:bg-green/20 cursor-pointer'
                          }`}
                        >
                          {full ? 'Full' : 'Play'}
                        </button>
                      </td>
                    </tr>
                  );
                })}

                {/* Skeleton loaders */}
                {loading &&
                  [...Array(5)].map((_, i) => (
                    <tr key={`skel-${i}`} className="border-b border-surface-light/15">
                      <td className="py-3 px-4 md:px-5">
                        <div className="h-4 w-24 bg-surface-light/50 rounded animate-pulse" />
                      </td>
                      <td className="py-3 px-4 md:px-5">
                        <div className="h-4 w-20 bg-surface-light/50 rounded animate-pulse" />
                      </td>
                      <td className="py-3 px-4 md:px-5 hidden md:table-cell">
                        <div className="h-4 w-28 bg-surface-light/50 rounded animate-pulse" />
                      </td>
                      <td className="py-3 px-4 md:px-5">
                        <div className="h-4 w-12 bg-surface-light/50 rounded animate-pulse" />
                      </td>
                      <td className="py-3 px-4 md:px-5">
                        <div className="h-7 w-14 bg-surface-light/50 rounded animate-pulse ml-auto" />
                      </td>
                    </tr>
                  ))}

                {/* Empty state */}
                {!loading && tables.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-text-muted">
                      No tables available right now
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── Trust Pillars ── */}
      <section className="px-5 md:px-8 pb-20">
        <div className="max-w-3xl mx-auto grid md:grid-cols-3 gap-4">
          {[
            {
              icon: (
                <svg className="w-5 h-5 text-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              ),
              title: 'Provably Fair',
              text: 'Cryptographic RNG with verifiable server seeds. Audit any hand after it completes.',
            },
            {
              icon: (
                <svg className="w-5 h-5 text-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              ),
              title: 'Full Reserve',
              text: 'Every ISK on the site is backed 1:1. Withdraw your balance any time, no restrictions.',
            },
            {
              icon: (
                <svg className="w-5 h-5 text-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                </svg>
              ),
              title: 'EVE SSO',
              text: "Login through CCP's official OAuth. No passwords stored, character verified automatically.",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="bg-surface/40 border border-surface-light/20 rounded-xl p-5"
            >
              <div className="w-9 h-9 rounded-lg bg-green/[0.08] flex items-center justify-center mb-3">
                {item.icon}
              </div>
              <h3 className="text-white font-bold text-sm mb-1.5">{item.title}</h3>
              <p className="text-text-muted text-[13px] leading-relaxed">{item.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="px-5 md:px-8 pb-24">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-xs font-bold text-text-muted text-center mb-8 uppercase tracking-widest">
            How It Works
          </h2>
          <div className="grid md:grid-cols-3 gap-8 md:gap-5">
            {[
              {
                n: '01',
                title: 'Deposit',
                text: (
                  <>
                    Send ISK to{' '}
                    <span className="text-white font-semibold">POKER IN SPACE</span> in-game.
                    Your character is matched by ID and your balance updates within minutes.
                  </>
                ),
              },
              {
                n: '02',
                title: 'Play',
                text: "Sit at any table, buy in, and play No-Limit Hold'em against real players.",
              },
              {
                n: '03',
                title: 'Withdraw',
                text: 'Request a withdrawal any time. ISK is sent directly to your character in-game.',
              },
            ].map((s) => (
              <div
                key={s.n}
                className="relative pl-5 border-l-2 border-surface-light/40"
              >
                <div className="absolute -left-[7px] top-0.5 w-3 h-3 rounded-full border-2 border-green bg-base" />
                <div className="text-[10px] text-green font-bold tracking-widest mb-0.5">
                  {s.n}
                </div>
                <div className="text-white font-bold text-sm mb-1">{s.title}</div>
                <p className="text-text-muted text-[13px] leading-relaxed">{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-surface-light/15 px-5 md:px-8 py-8">
        <div className="max-w-3xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <span className="text-sm font-bold text-text-muted">
              pokerin<span className="text-green">.</span>space
            </span>
            <Link
              to="/about"
              className="text-xs text-text-muted hover:text-green transition-colors font-semibold"
            >
              About
            </Link>
          </div>
          <p className="text-[11px] text-text-muted/50 text-center sm:text-right leading-relaxed">
            Not affiliated with or endorsed by CCP Games.
            <br className="sm:hidden" /> EVE Online is a trademark of CCP hf.
          </p>
        </div>
      </footer>
    </div>
  );
}
