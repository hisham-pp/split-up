export interface SimplifiedTransaction {
  fromMemberId: string;
  toMemberId: string;
  amountCents: number;
}

export interface MemberBalanceInfo {
  memberId: string;
  netBalanceCents: number; // Positive = gets money back, Negative = owes money
}

/**
 * Debt Simplification Algorithm (Greedy Max-Debtor to Max-Creditor algorithm).
 * Calculates minimal number of payments required to settle all debts in a group.
 * 
 * @param balances Record of memberId -> net balance in minor units (integer paise/cents)
 * @returns Array of SimplifiedTransaction objects
 */
export function simplifyDebts(
  balances: Record<string, number>
): SimplifiedTransaction[] {
  // Separate into debtors (negative balance) and creditors (positive balance)
  const debtors: { memberId: string; amount: number }[] = [];
  const creditors: { memberId: string; amount: number }[] = [];

  Object.entries(balances).forEach(([memberId, netBalance]) => {
    if (netBalance < 0) {
      debtors.push({ memberId, amount: Math.abs(netBalance) });
    } else if (netBalance > 0) {
      creditors.push({ memberId, amount: netBalance });
    }
  });

  const transactions: SimplifiedTransaction[] = [];

  // Sort descending by amount
  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  let i = 0; // debtor index
  let j = 0; // creditor index

  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];

    const settleAmount = Math.min(debtor.amount, creditor.amount);

    if (settleAmount > 0) {
      transactions.push({
        fromMemberId: debtor.memberId,
        toMemberId: creditor.memberId,
        amountCents: settleAmount,
      });

      debtor.amount -= settleAmount;
      creditor.amount -= settleAmount;
    }

    if (debtor.amount === 0) {
      i++;
    }
    if (creditor.amount === 0) {
      j++;
    }
  }

  return transactions;
}
