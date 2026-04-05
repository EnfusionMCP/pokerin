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
      <h2 className="text-2xl font-extrabold text-white mb-7">Deposit & Withdraw</h2>

      <div className="bg-surface rounded-lg border border-surface-light/50 p-6 mb-6">
        <p className="text-xs text-text-muted mb-1 uppercase tracking-wider font-bold">Your Balance</p>
        {balance !== null ? (
          <p className="text-3xl font-extrabold text-green">{formatIsk(balance)}</p>
        ) : (
          <div className="h-9 w-48 bg-surface-light rounded animate-pulse mt-1" />
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-6">
        <DepositSection />
        {balance !== null && <WithdrawForm balance={balance} />}
      </div>

      <TransactionHistory transactions={transactions} loading={loading} />
    </div>
  );
}
