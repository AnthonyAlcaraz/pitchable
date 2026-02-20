import { useTranslation } from 'react-i18next';

interface Transaction {
  id: string;
  amount: number;
  reason: string;
  balanceAfter: number;
  createdAt: string;
}

interface TransactionHistoryProps {
  transactions: Transaction[];
}

export function TransactionHistory({ transactions }: TransactionHistoryProps) {
  const { t } = useTranslation();

  const REASON_LABELS: Record<string, string> = {
    PURCHASE: t('billing.transaction_history.reason_PURCHASE'),
    DECK_GENERATION: t('billing.transaction_history.reason_DECK_GENERATION'),
    IMAGE_GENERATION: t('billing.transaction_history.reason_IMAGE_GENERATION'),
    SUBSCRIPTION_RENEWAL: t('billing.transaction_history.reason_SUBSCRIPTION_RENEWAL'),
    ADMIN_ADJUSTMENT: t('billing.transaction_history.reason_ADMIN_ADJUSTMENT'),
    REFUND: t('billing.transaction_history.reason_REFUND'),
  };

  if (transactions.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        {t('billing.transaction_history.no_transactions')}
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left">
            <th className="pb-2 font-medium text-muted-foreground">{t('billing.transaction_history.date')}</th>
            <th className="pb-2 font-medium text-muted-foreground">{t('billing.transaction_history.type')}</th>
            <th className="pb-2 text-right font-medium text-muted-foreground">{t('billing.transaction_history.amount')}</th>
            <th className="pb-2 text-right font-medium text-muted-foreground">{t('billing.transaction_history.balance')}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {transactions.map((tx) => (
            <tr key={tx.id}>
              <td className="py-2.5 text-foreground">
                {new Date(tx.createdAt).toLocaleDateString()}
              </td>
              <td className="py-2.5 text-foreground">
                {REASON_LABELS[tx.reason] ?? tx.reason}
              </td>
              <td
                className={`py-2.5 text-right font-medium ${
                  tx.amount > 0 ? 'text-green-600' : 'text-red-500'
                }`}
              >
                {tx.amount > 0 ? '+' : ''}
                {tx.amount}
              </td>
              <td className="py-2.5 text-right text-muted-foreground">
                {tx.balanceAfter}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
