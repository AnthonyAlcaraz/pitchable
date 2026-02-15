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

const REASON_LABELS: Record<string, string> = {
  PURCHASE: 'Credit Purchase',
  DECK_GENERATION: 'Deck Generation',
  IMAGE_GENERATION: 'Image Generation',
  SUBSCRIPTION_RENEWAL: 'Monthly Allocation',
  ADMIN_ADJUSTMENT: 'Admin Adjustment',
  REFUND: 'Refund',
};

export function TransactionHistory({ transactions }: TransactionHistoryProps) {
  if (transactions.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No transactions yet
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left">
            <th className="pb-2 font-medium text-muted-foreground">Date</th>
            <th className="pb-2 font-medium text-muted-foreground">Type</th>
            <th className="pb-2 text-right font-medium text-muted-foreground">Amount</th>
            <th className="pb-2 text-right font-medium text-muted-foreground">Balance</th>
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
