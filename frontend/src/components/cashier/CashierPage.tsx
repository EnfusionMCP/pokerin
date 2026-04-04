import { useEffect } from 'react';
import { useWalletStore } from '../../stores/walletStore';
import { formatIsk } from '../../lib/isk';
import { DepositSection } from './DepositSection';
import { WithdrawForm } from './WithdrawForm';
import { TransactionHistory } from './TransactionHistory';

export function CashierPage() {
  const { balance, transactions, loading, fetchBalance, fetchTransactions } = useWalletStore();

  useEffect(() => {
    fetchBalance();
    fetchTransactions();
    const interval = setInterval(fetchBalance, 30_000);
    return () => clearInterval(interval);
  }, [fetchBalance, fetchTransactions]);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h2 className="font-display text-3xl font-bold text-white mb-7 tracking-wide">Deposit & Withdraw</h2>

      {/* Balance display */}
      <div className="bg-panel/80 rounded-xl border border-gray-800/60 p-6 mb-7 shadow-lg shadow-black/20">
        <p className="text-xs text-gray-500 mb-1 uppercase tracking-wider font-medium">Your Balance</p>
        {balance !== null ? (
          <p className="text-3xl font-bold text-gold font-mono tracking-tight">{formatIsk(balance)}</p>
        ) : (
          <div className="h-9 w-48 bg-gray-800 rounded animate-pulse mt-1" />
        )}
      </div>

      {/* Deposit + Withdraw side by side */}
      <div className="grid md:grid-cols-2 gap-6 mb-7">
        <DepositSection />
        {balance !== null && <WithdrawForm balance={balance} />}
      </div>

      {/* Transaction history */}
      <TransactionHistory transactions={transactions} loading={loading} />
    </div>
  );
}
