import { Link } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';

export function AboutPage() {
  const isAuth = useAuthStore((s) => s.isAuthenticated);

  return (
    <div className="min-h-screen bg-base">
      {/* Nav — only for unauthenticated (auth users have the PageShell header) */}
      {!isAuth && (
        <nav className="sticky top-0 z-40 flex items-center justify-between px-5 md:px-8 h-14 bg-base/80 backdrop-blur-md border-b border-white/[0.06]">
          <Link to="/login" className="text-lg font-extrabold text-white tracking-tight hover:text-green transition-colors">
            pokerin<span className="text-green">.</span>space
          </Link>
          <div className="flex items-center gap-5">
            <Link to="/login" className="text-sm text-text-muted hover:text-text transition-colors font-semibold">
              Home
            </Link>
            <button
              onClick={() => { window.location.href = '/auth/login'; }}
              className="flex items-center gap-2 px-4 py-2 bg-green/10 border border-green/25 rounded-lg text-green text-sm font-bold hover:bg-green/20 transition-all cursor-pointer"
            >
              Login with EVE
            </button>
          </div>
        </nav>
      )}

      <div className="max-w-3xl mx-auto px-5 md:px-8 py-10">
        <h1 className="text-3xl font-extrabold text-white mb-10">
          About pokerin<span className="text-green">.</span>space
        </h1>

        <Section title="The Problem with the HyperNet">
          <p>
            The HyperNet Relay is, by any honest definition, a lottery. You pay a fraction of an item's value for a random chance to win it. The math favors the creator by design, and the house — CCP, via ISK sinks and HyperCores — always gets paid. The player almost never comes out ahead over time.
          </p>
          <p>
            But the deeper issue isn't the math. It's that the HyperNet exploits a specific psychological drive — the desire to test yourself, to risk something for a reward, to feel the tension of an uncertain outcome — and then resolves it with zero player agency. There's no decision-making. No reading your opponent. No moment where your experience or judgment changes the outcome. You click, you wait, you lose.
          </p>
          <p>
            EVE players deserve better than that. If you're going to put ISK on the line, it should be because you think you're smarter than the person across the table — not because a random number generator decided you aren't lucky enough.
          </p>
        </Section>

        <Section title="A Game of Skill">
          <p>
            The distinction between skill and chance isn't a gray area. Courts, regulators, and mathematicians settled it decades ago. In a game of chance, randomness determines the outcome. In a game of skill, the players' decisions do. Poker is the latter.
          </p>
          <p>
            Yes, cards are dealt randomly. But over any meaningful sample of hands, the better player wins. You can't study roulette strategy and start consistently beating the wheel. But you absolutely can study poker and start consistently beating your opponents. Poker isn't about the cards — it's about incomplete information, risk assessment, position, bet sizing, and reading people — skills every EVE player already exercises every time they undock.
          </p>
        </Section>

        <Section title="Learning from EVE's Casino History">
          <p>
            Nearly a decade ago, player-run gambling services like IWantISK, EVE-Bet, and others were shut down by CCP in October 2016. Those operations failed for specific reasons worth understanding — and worth distinguishing from what we're doing here.
          </p>
          <p>
            The old casinos were pure games of chance — literal slot machines and roulette wheels reskinned with EVE theming. They operated as black boxes, processing trillions of ISK daily with zero oversight. Players had no way to verify that odds were fair, that outcomes weren't manipulated, or that operators weren't funneling casino profits into in-game power plays. Some were. IWantISK's operators were permanently banned for large-scale RMT, and the casino's wealth had been used to personally bankroll a war that reshaped the political map of nullsec. The context suggests CCP's primary concern wasn't the concept of ISK competition itself — it was an unregulated financial system that was destabilizing their game.
          </p>
          <p>
            pokerin.space is built differently. Poker is player-versus-player — the house doesn't play against you, doesn't set odds against you, and can't manipulate outcomes. Every hand is dealt with a cryptographically secure RNG, and every pot is auditable.
          </p>
        </Section>

        <Section title="The Terms of Service Question">
          <p>
            CCP's policy specifically prohibits <span className="text-white font-semibold">"games of chance"</span> operated by players. A game of chance is one where randomness determines the outcome. Poker — where the players' decisions are the primary determinant of who wins — is categorically different.
          </p>
          <p>
            We acknowledge that CCP's enforcement in 2016 was broad — every third-party service was shut down regardless of whether it involved skill or chance.
          </p>
          <p>
            EVE Executive Producer Andie Norgren explained the reasoning at the time: <span className="text-white italic">"If it's meaningless for somebody else to fight a battle in EVE because there's someone out there who has unassailable wealth, then that becomes a problem for the whole game."</span> That concern was legitimate — and it has nothing to do with pokerin.space. A poker table where players compete against each other for modest stakes doesn't generate unassailable wealth. The house takes a small percentage of each pot — the same model every poker room in the world uses — and the rest goes to whoever played best. Nobody is bankrolling a coalition war with poker rake.
          </p>
          <p>
            We think this is different enough to be worth a conversation rather than a blanket prohibition. If CCP determines otherwise, we will comply immediately and fully. We have no interest in operating in defiance of the people who built the game we love.
          </p>
        </Section>

        {/* CCP message */}
        <div className="mb-10 border border-green/20 rounded-xl p-6 bg-green/[0.03]">
          <h2 className="text-xl font-bold text-green mb-4">A Direct Message to CCP Games</h2>
          <p className="text-text leading-relaxed mb-3">
            It's been a decade since the casino ban. The HyperNet Relay proved that EVE players want to compete for ISK outside of combat — and that CCP is comfortable with that concept when the implementation is controlled and accountable. We're offering a version of that competition that is player-versus-player, verifiable, and based on skill rather than luck.
          </p>
          <p className="text-text leading-relaxed mb-3">With that in mind, we're making this offer in good faith:</p>
          <ul className="list-disc list-inside text-text leading-relaxed mb-3 space-y-2 pl-2">
            <li><span className="text-white font-semibold">Full server access.</span> We will grant CCP permanent root access to the server that runs pokerin.space, including all databases, application code, configuration, and logs.</li>
            <li><span className="text-white font-semibold">Complete auditability.</span> Every mechanic — card shuffling, pot calculation, fee collection, player authentication — is available for your engineers to inspect at any time.</li>
            <li><span className="text-white font-semibold">Compliance on your terms.</span> If you want us to change the fee structure, add deposit limits, restrict access, implement additional verification, or modify any aspect of how this service operates — tell us and we'll do it.</li>
            <li><span className="text-white font-semibold">Immediate shutdown on request.</span> If after reviewing everything you determine this service shouldn't exist, we will shut it down, refund all player balances in full, and respect your decision.</li>
          </ul>
          <p className="text-text leading-relaxed">
            This isn't an end-run around your rules. We'd rather build this with your blessing than without it.
          </p>
        </div>

        <p className="text-center text-text-muted text-sm mb-6">See you at the table.</p>

        <div className="text-center text-text-muted/40 text-xs mb-4 leading-relaxed">
          pokerin.space is a player-run service and is not affiliated with or endorsed by CCP Games.
          <br />
          EVE Online and all related trademarks are property of CCP hf.
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="text-xl font-bold text-white mb-4">{title}</h2>
      <div className="space-y-3 text-text leading-relaxed text-[15px]">{children}</div>
    </section>
  );
}
