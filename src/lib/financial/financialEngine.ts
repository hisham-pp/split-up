import { z } from 'zod';

export type SplitMode = 'Equal' | 'Unequal' | 'Percentage' | 'Shares';

export interface PayerShare {
  memberId: string;
  amountCents: number; // Integer minor units (e.g. ₹100.50 -> 10050)
}

export interface SplitShare {
  memberId: string;
  amountCents: number; // Integer minor units assigned to this member
  percentage?: number; // For Percentage mode
  shares?: number; // For Shares mode
}

export interface ExpenseCalculationInput {
  totalAmountCents: number;
  payers: PayerShare[];
  splitMode: SplitMode;
  splitBetweenIds: string[];
  exactSplits?: Record<string, number>; // memberId -> amountCents
  percentages?: Record<string, number>; // memberId -> percentage (0-100)
  shares?: Record<string, number>; // memberId -> numeric shares
}

export interface CalculatedExpenseResult {
  totalAmountCents: number;
  payers: PayerShare[];
  splits: SplitShare[];
}

/**
 * Converts major unit currency float (e.g. 100.50) to integer minor units (10050).
 */
export function toMinorUnits(amount: number): number {
  return Math.round(amount * 100);
}

/**
 * Converts integer minor units (e.g. 10050) to major unit number (100.50).
 */
export function toMajorUnits(cents: number): number {
  return cents / 100;
}

/**
 * Calculates member expense split allocations based on split mode.
 * Guarantees that sum(splits.amountCents) === totalAmountCents.
 */
export function calculateExpenseSplits(input: ExpenseCalculationInput): CalculatedExpenseResult {
  const { totalAmountCents, payers, splitMode, splitBetweenIds, exactSplits, percentages, shares } = input;

  if (splitBetweenIds.length === 0) {
    throw new Error('At least one member must be selected to split the expense.');
  }

  // Validate payers sum equals totalAmountCents
  const totalPaid = payers.reduce((sum, p) => sum + p.amountCents, 0);
  if (totalPaid !== totalAmountCents) {
    throw new Error(`Total paid (${toMajorUnits(totalPaid)}) does not equal total expense amount (${toMajorUnits(totalAmountCents)})`);
  }

  const resultSplits: SplitShare[] = [];

  if (splitMode === 'Equal') {
    const count = splitBetweenIds.length;
    const baseShare = Math.floor(totalAmountCents / count);
    const remainder = totalAmountCents % count;

    splitBetweenIds.forEach((id, idx) => {
      // Distribute 1 minor unit remainder to first N members
      const extra = idx < remainder ? 1 : 0;
      resultSplits.push({
        memberId: id,
        amountCents: baseShare + extra,
      });
    });
  } else if (splitMode === 'Unequal') {
    if (!exactSplits) {
      throw new Error('Exact splits map is required for Unequal split mode');
    }
    let totalExact = 0;
    splitBetweenIds.forEach((id) => {
      const amt = Math.round(exactSplits[id] || 0);
      totalExact += amt;
      resultSplits.push({
        memberId: id,
        amountCents: amt,
      });
    });

    if (totalExact !== totalAmountCents) {
      throw new Error(
        `Sum of exact splits (${toMajorUnits(totalExact)}) must equal expense total (${toMajorUnits(totalAmountCents)})`
      );
    }
  } else if (splitMode === 'Percentage') {
    if (!percentages) {
      throw new Error('Percentages map is required for Percentage split mode');
    }
    let totalPct = 0;
    splitBetweenIds.forEach((id) => {
      totalPct += percentages[id] || 0;
    });

    if (Math.abs(totalPct - 100) > 0.01) {
      throw new Error(`Total percentage must equal 100% (currently ${totalPct}%)`);
    }

    let allocatedCents = 0;
    const tempAllocations: { id: string; rawCents: number; pct: number }[] = [];

    splitBetweenIds.forEach((id) => {
      const pct = percentages[id] || 0;
      const rawCents = (totalAmountCents * pct) / 100;
      const floorCents = Math.floor(rawCents);
      allocatedCents += floorCents;
      tempAllocations.push({ id, rawCents: floorCents, pct });
    });

    let remainder = totalAmountCents - allocatedCents;
    // Distribute remainder paise by highest percentage
    tempAllocations.sort((a, b) => b.pct - a.pct);
    tempAllocations.forEach((item, idx) => {
      const extra = idx < remainder ? 1 : 0;
      resultSplits.push({
        memberId: item.id,
        amountCents: item.rawCents + extra,
        percentage: item.pct,
      });
    });
  } else if (splitMode === 'Shares') {
    if (!shares) {
      throw new Error('Shares map is required for Shares split mode');
    }

    let totalShares = 0;
    splitBetweenIds.forEach((id) => {
      totalShares += shares[id] || 0;
    });

    if (totalShares <= 0) {
      throw new Error('Total shares must be greater than zero');
    }

    let allocatedCents = 0;
    const tempAllocations: { id: string; rawCents: number; sh: number }[] = [];

    splitBetweenIds.forEach((id) => {
      const sh = shares[id] || 0;
      const rawCents = Math.floor((totalAmountCents * sh) / totalShares);
      allocatedCents += rawCents;
      tempAllocations.push({ id, rawCents, sh });
    });

    let remainder = totalAmountCents - allocatedCents;
    tempAllocations.sort((a, b) => b.sh - a.sh);
    tempAllocations.forEach((item, idx) => {
      const extra = idx < remainder ? 1 : 0;
      resultSplits.push({
        memberId: item.id,
        amountCents: item.rawCents + extra,
        shares: item.sh,
      });
    });
  }

  return {
    totalAmountCents,
    payers,
    splits: resultSplits,
  };
}

/**
 * Computes net balances for all members in a group.
 * positive balance = member is owed money (creditor)
 * negative balance = member owes money (debtor)
 * balance = Total Paid - Total Owed
 */
export function computeGroupBalances(
  memberIds: string[],
  expenses: { payers: PayerShare[]; splits: SplitShare[] }[],
  settlements: { payerMemberId: string; payeeMemberId: string; amountCents: number }[]
): Record<string, { totalPaid: number; totalOwed: number; netBalance: number }> {
  const balances: Record<string, { totalPaid: number; totalOwed: number; netBalance: number }> = {};

  memberIds.forEach((id) => {
    balances[id] = { totalPaid: 0, totalOwed: 0, netBalance: 0 };
  });

  // Account for expenses
  expenses.forEach((expense) => {
    expense.payers.forEach((payer) => {
      if (balances[payer.memberId]) {
        balances[payer.memberId].totalPaid += payer.amountCents;
      }
    });

    expense.splits.forEach((split) => {
      if (balances[split.memberId]) {
        balances[split.memberId].totalOwed += split.amountCents;
      }
    });
  });

  // Account for settlements (payer Member pays payee Member)
  settlements.forEach((settlement) => {
    if (balances[settlement.payerMemberId]) {
      // Payer settled/paid money -> counts towards paid
      balances[settlement.payerMemberId].totalPaid += settlement.amountCents;
    }
    if (balances[settlement.payeeMemberId]) {
      // Payee received money -> counts towards owed offset
      balances[settlement.payeeMemberId].totalOwed += settlement.amountCents;
    }
  });

  // Compute net balance
  memberIds.forEach((id) => {
    balances[id].netBalance = balances[id].totalPaid - balances[id].totalOwed;
  });

  return balances;
}

// Zod Validation Schemas
export const ExpenseFormSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100, 'Title is too long'),
  amount: z.number().positive('Amount must be greater than zero'),
  category: z.enum(['Food', 'Travel', 'Housing', 'Entertainment', 'Shopping', 'Utilities', 'Other']),
  date: z.string().min(1, 'Date is required'),
  splitMode: z.enum(['Equal', 'Unequal', 'Percentage', 'Shares']),
  notes: z.string().optional(),
});
