import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { reproduceShuffle } from '../../lib/provablyFair';

export function ProvablyFairPage() {
  const isAuth = useAuthStore((s) => s.isAuthenticated);

  return (
    <div className="min-h-screen bg-base">
      <nav className="sticky top-0 z-40 flex items-center justify-between px-5 md:px-8 h-14 bg-base/80 backdrop-blur-md border-b border-white/[0.06]">
        <Link to="/" className="text-lg font-extrabold text-white tracking-tight hover:text-green transition-colors">
          pokerin<span className="text-green">.</span>space
        </Link>
        <div className="flex items-center gap-5">
          <Link to="/" className="text-sm text-text-muted hover:text-text transition-colors font-semibold">
            Home
          </Link>
          {!isAuth && (
            <button
              onClick={() => { window.location.href = '/auth/login'; }}
              className="flex items-center gap-2 px-4 py-2 bg-green/10 border border-green/25 rounded-lg text-green text-sm font-bold hover:bg-green/20 transition-all cursor-pointer"
            >
              Login with EVE
            </button>
          )}
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-5 md:px-8 py-10">
        <h1 className="text-3xl font-extrabold text-white mb-3">
          Provably Fair
        </h1>
        <p className="text-text-muted text-sm mb-10">
          Every hand dealt on pokerin.space is cryptographically verifiable. Nobody — not even us — can manipulate the deck.
        </p>

        {/* How it works */}
        <section className="mb-10">
          <h2 className="text-xl font-bold text-white mb-4">How It Works</h2>
          <div className="space-y-6">
            <Step number={1} title="Before the hand">
              The server generates a random 32-byte <Mono>server_seed</Mono> and computes its SHA-256 hash.
              This hash is committed to all players <span className="text-white font-semibold">before any cards are dealt</span>.
              The seed itself stays hidden — if players could see it, they'd know the deck order.
            </Step>
            <Step number={2} title="Shuffling the deck">
              The deck is shuffled using <Mono>HMAC-SHA256</Mono> with the server seed as the key.
              For each position in the 52-card deck, the algorithm computes:
              <code className="block bg-base/80 rounded-lg px-4 py-3 mt-3 text-[13px] font-mono text-text border border-surface-light/20 leading-relaxed">
                HMAC-SHA256(server_seed, "{'{table_id}:{hand_number}:{counter}'}")
              </code>
              <span className="text-text-muted text-sm block mt-2">
                The first 4 bytes of each HMAC output determine the swap index. This is a Fisher-Yates shuffle — uniform, unbiased, deterministic.
              </span>
            </Step>
            <Step number={3} title="After the hand">
              The server reveals the actual <Mono>server_seed</Mono>. You can now:
              <ul className="list-disc list-inside mt-2 space-y-1 text-text text-[15px]">
                <li>Hash the seed yourself and confirm it matches the pre-committed hash</li>
                <li>Re-run the shuffle algorithm and verify the exact deck order</li>
                <li>Confirm that the cards you were dealt match the reproduced deck</li>
              </ul>
            </Step>
          </div>
        </section>

        {/* Why this matters */}
        <section className="mb-10">
          <h2 className="text-xl font-bold text-white mb-4">Why This Matters</h2>
          <div className="space-y-3 text-text leading-relaxed text-[15px]">
            <p>
              The commit-then-reveal pattern makes cheating mathematically impossible. The hash locks in the deck
              before the hand starts. If the server tried to change the seed after seeing player actions, the hash
              wouldn't match — and every player can check.
            </p>
            <p>
              The seed is never reused. Each hand gets its own seed, its own hash commitment, and its own
              independently verifiable shuffle. There is no house edge on the cards themselves — the only revenue
              is a small rake taken from each pot, visible in your hand history.
            </p>
          </div>
        </section>

        {/* Verification tool */}
        <section className="mb-10">
          <h2 className="text-xl font-bold text-white mb-6">Verify a Hand</h2>
          <p className="text-text-muted text-sm mb-4">
            Paste the values from any completed hand to independently verify the shuffle. You can find these
            in your hand history under Stats.
          </p>
          <VerifyTool />
        </section>

        {/* Algorithm reference */}
        <section className="mb-10">
          <h2 className="text-xl font-bold text-white mb-4">Algorithm Reference</h2>
          <div className="bg-surface/60 rounded-xl border border-surface-light/25 p-5">
            <pre className="text-[12px] font-mono text-text leading-relaxed whitespace-pre-wrap overflow-x-auto">{`# Python pseudocode — this is the actual algorithm

import hmac, hashlib

def shuffle(server_seed: bytes, table_id: str, hand_number: int):
    cards = standard_52_card_deck()  # c,d,h,s × 2..A
    counter = 0

    for i in range(51, 0, -1):  # Fisher-Yates with rejection sampling
        limit = (0x100000000 // (i + 1)) * (i + 1)
        while True:
            msg = f"{table_id}:{hand_number}:{counter}"
            h = hmac.new(server_seed, msg.encode(), hashlib.sha256).digest()
            counter += 1
            v = int.from_bytes(h[:4], 'big')
            if v < limit:
                j = v % (i + 1)
                break
        cards[i], cards[j] = cards[j], cards[i]

    return cards

# Verification:
# 1. SHA-256(hex(server_seed)) must equal the committed hash
# 2. Re-running this function must produce the dealt cards`}</pre>
          </div>
        </section>

        <div className="text-center text-text-muted/40 text-xs mb-4 leading-relaxed">
          All verification runs entirely in your browser. Nothing is sent to our server.
        </div>
      </div>
    </div>
  );
}

function Step({ number, title, children }: { number: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-4">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green/10 border border-green/25 flex items-center justify-center text-green text-sm font-extrabold">
        {number}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-white font-bold text-[15px] mb-1">{title}</h3>
        <div className="text-text text-[15px] leading-relaxed">{children}</div>
      </div>
    </div>
  );
}

function Mono({ children }: { children: React.ReactNode }) {
  return <code className="text-green font-mono text-[13px] bg-green/5 px-1.5 py-0.5 rounded">{children}</code>;
}

function VerifyTool() {
  const [serverSeed, setServerSeed] = useState('');
  const [seedHash, setSeedHash] = useState('');
  const [tableId, setTableId] = useState('');
  const [handNumber, setHandNumber] = useState('');
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<{
    hashMatch: boolean;
    computedHash: string;
    deck: string[];
  } | null>(null);

  const canRun = serverSeed.length >= 32 && tableId.trim() !== '' && handNumber.trim() !== '';

  async function verify() {
    setRunning(true);
    setResult(null);
    try {
      const hn = parseInt(handNumber, 10);
      if (isNaN(hn)) throw new Error('Invalid hand number');

      const deck = await reproduceShuffle(serverSeed.trim(), tableId.trim(), hn);

      // Compute SHA-256 of the seed to compare against provided hash
      const seedBytes = new TextEncoder().encode(serverSeed.trim());
      const hashBuffer = await crypto.subtle.digest('SHA-256', seedBytes);
      const computedHash = Array.from(new Uint8Array(hashBuffer), (b) => b.toString(16).padStart(2, '0')).join('');

      const hashMatch = seedHash.trim() !== '' && computedHash === seedHash.trim().toLowerCase();

      setResult({ hashMatch, computedHash, deck });
    } catch {
      setResult(null);
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="bg-surface/60 rounded-xl border border-surface-light/25 p-5 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Server Seed (hex)" value={serverSeed} onChange={setServerSeed} placeholder="5fd79dcf44cace0cba9b140b..." mono />
        <Field label="Committed Hash (optional)" value={seedHash} onChange={setSeedHash} placeholder="ac46fd96dfd859d436cf3b21..." mono />
        <Field label="Table ID" value={tableId} onChange={setTableId} placeholder="micro-1" />
        <Field label="Hand Number" value={handNumber} onChange={setHandNumber} placeholder="42" />
      </div>

      <button
        onClick={verify}
        disabled={!canRun || running}
        className="px-5 py-2 bg-green/10 border border-green/25 rounded-lg text-green text-sm font-bold hover:bg-green/20 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {running ? 'Verifying...' : 'Verify'}
      </button>

      {result && (
        <div className="space-y-4 pt-2">
          {/* Hash verification */}
          <div className="space-y-2">
            <div className="text-text-muted text-[10px] uppercase tracking-widest font-bold">Hash Verification</div>
            <div className="text-xs space-y-1">
              <div>
                <span className="text-text-muted">Computed: </span>
                <code className="text-text font-mono text-[11px] break-all">{result.computedHash}</code>
              </div>
              {seedHash.trim() && (
                <div className="flex items-center gap-2 mt-1">
                  <span className={`font-bold text-sm ${result.hashMatch ? 'text-green' : 'text-red'}`}>
                    {result.hashMatch ? '\u2713' : '\u2717'}
                  </span>
                  <span className={`text-xs font-semibold ${result.hashMatch ? 'text-green' : 'text-red'}`}>
                    {result.hashMatch ? 'Hash matches the committed value' : 'Hash does NOT match — the seed may have been altered'}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Deck */}
          <div>
            <div className="text-text-muted text-[10px] uppercase tracking-widest mb-2 font-bold">
              Reproduced Deck Order (first card dealt first)
            </div>
            <div className="flex flex-wrap gap-1">
              {result.deck.map((card, idx) => {
                const suit = card[card.length - 1];
                const isRed = suit === 'h' || suit === 'd';
                return (
                  <span
                    key={idx}
                    className={`px-1.5 py-0.5 rounded text-[11px] font-mono font-bold border ${
                      isRed
                        ? 'bg-red/10 text-red border-red/20'
                        : 'bg-surface-light/20 text-text border-surface-light/30'
                    }`}
                  >
                    {card}
                  </span>
                );
              })}
            </div>
            <div className="flex gap-4 mt-2 text-[10px] text-text-muted">
              <span>Cards are dealt from position 0 onward: hole cards first, then burn+flop, burn+turn, burn+river.</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  mono,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  mono?: boolean;
}) {
  return (
    <div>
      <label className="block text-text-muted text-[10px] uppercase tracking-widest font-bold mb-1.5">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full px-3 py-2 bg-base/80 border border-surface-light/30 rounded-lg text-text text-sm placeholder:text-text-muted/40 focus:outline-none focus:border-green/40 transition-colors ${mono ? 'font-mono text-[12px]' : ''}`}
      />
    </div>
  );
}
