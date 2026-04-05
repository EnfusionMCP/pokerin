import { useState } from 'react';

export function DepositSection() {
  const [copied, setCopied] = useState(false);
  const corpName = 'POKER IN SPACE';

  const handleCopy = () => {
    navigator.clipboard.writeText(corpName).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="bg-surface/60 rounded-xl border border-surface-light/25 p-6">
      <h3 className="text-sm font-bold text-white mb-4">Deposit ISK</h3>
      <div
        className="bg-base rounded-xl p-4 mb-4 border border-surface-light/30 text-center cursor-pointer hover:border-green/30 transition-all group"
        onClick={handleCopy}
      >
        <p className="text-[10px] text-text-muted mb-1 uppercase tracking-widest font-bold">
          Send ISK to:
        </p>
        <p className="text-xl font-extrabold text-white">{corpName}</p>
        <p
          className={`text-[10px] mt-1.5 font-semibold transition-colors ${
            copied ? 'text-green' : 'text-text-muted group-hover:text-green/60'
          }`}
        >
          {copied ? 'Copied!' : 'Click to copy'}
        </p>
      </div>
      <p className="text-[13px] text-text-muted leading-relaxed">
        Send any amount of ISK to{' '}
        <span className="text-text font-semibold">{corpName}</span> in-game.
        Balance updates within ~5 minutes to 1 hour.
      </p>
    </div>
  );
}
