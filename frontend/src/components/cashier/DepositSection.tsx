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
    <div className="bg-panel/80 rounded-xl border border-gray-800/60 p-6 shadow-lg shadow-black/20">
      <h3 className="font-display text-lg font-semibold text-white mb-4 tracking-wide">Deposit ISK</h3>

      <div
        className="bg-surface rounded-xl p-4 mb-4 border border-gray-700/60 text-center cursor-pointer hover:border-gold/30 transition-all group"
        onClick={handleCopy}
        title="Click to copy"
      >
        <p className="text-[10px] text-gray-500 mb-1 uppercase tracking-widest">Send ISK to:</p>
        <p className="text-xl font-bold text-white font-display tracking-wide">{corpName}</p>
        <p className={`text-[10px] mt-1.5 transition-colors ${copied ? 'text-gold' : 'text-gray-600 group-hover:text-gold/60'}`}>
          {copied ? 'Copied!' : 'Click to copy'}
        </p>
      </div>

      <p className="text-sm text-gray-500 leading-relaxed">Send any amount of ISK to <span className="text-gray-300 font-medium">{corpName}</span> in-game. Balance will change whenever ESI registers your deposit, this typically takes between ~5 minutes to 1 hour.</p>
    </div>
  );
}
