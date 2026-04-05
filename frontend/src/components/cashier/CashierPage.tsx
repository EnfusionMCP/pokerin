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
    <div className="max-w-4xl mx-auto px-5 md:px-8 py-8">
      <h2 className="text-2xl font-extrabold text-white mb-7">Cashier</h2>

      {/* Balance card */}
      <div className="bg-surface/60 rounded-xl border border-surface-light/25 p-6 mb-6">
        <p className="text-[10px] text-text-muted mb-1 uppercase tracking-widest font-bold">
          Your Balance
        </p>
        {balance !== null ? (
          <p className="text-3xl font-extrabold text-green">{formatIsk(balance)}</p>
        ) : (
          <div className="h-9 w-48 bg-surface-light/40 rounded animate-pulse mt-1" />
        )}
      </div>

      {/* Deposit / Withdraw */}
      <div className="grid md:grid-cols-2 gap-4 mb-6">
        <DepositSection />
        {balance !== null && <WithdrawForm balance={balance} />}
      </div>

      <TransactionHistory transactions={transactions} loading={loading} />
    </div>
  );
}
