import { describe, it, expect } from 'vitest';
import {
  calculateExpenseSplits,
  computeGroupBalances,
  toMinorUnits,
  toMajorUnits,
} from './financialEngine';
import { simplifyDebts } from './debtSimplifier';

describe('Financial Engine Unit Tests', () => {
  it('converts major and minor currency units accurately', () => {
    expect(toMinorUnits(100.5)).toBe(10050);
    expect(toMajorUnits(10050)).toBe(100.5);
    expect(toMinorUnits(4500)).toBe(450000);
  });

  describe('calculateExpenseSplits', () => {
    it('splits expense equally among 4 members with exact division', () => {
      const result = calculateExpenseSplits({
        totalAmountCents: 4400, // 44.00
        payers: [{ memberId: 'm1', amountCents: 4400 }],
        splitMode: 'Equal',
        splitBetweenIds: ['m1', 'm2', 'm3', 'm4'],
      });

      expect(result.splits).toHaveLength(4);
      expect(result.splits.map((s) => s.amountCents)).toEqual([1100, 1100, 1100, 1100]);
      const sum = result.splits.reduce((acc, s) => acc + s.amountCents, 0);
      expect(sum).toBe(4400);
    });

    it('splits expense equally among 3 members with remainder handling (10000 paise)', () => {
      const result = calculateExpenseSplits({
        totalAmountCents: 10000,
        payers: [{ memberId: 'm1', amountCents: 10000 }],
        splitMode: 'Equal',
        splitBetweenIds: ['m1', 'm2', 'm3'],
      });

      expect(result.splits.map((s) => s.amountCents)).toEqual([3334, 3333, 3333]);
      const sum = result.splits.reduce((acc, s) => acc + s.amountCents, 0);
      expect(sum).toBe(10000);
    });

    it('handles Unequal split mode correctly', () => {
      const result = calculateExpenseSplits({
        totalAmountCents: 5000,
        payers: [{ memberId: 'm1', amountCents: 5000 }],
        splitMode: 'Unequal',
        splitBetweenIds: ['m1', 'm2'],
        exactSplits: { m1: 2000, m2: 3000 },
      });

      expect(result.splits.find((s) => s.memberId === 'm1')?.amountCents).toBe(2000);
      expect(result.splits.find((s) => s.memberId === 'm2')?.amountCents).toBe(3000);
    });

    it('throws error if Unequal split total does not equal expense total', () => {
      expect(() =>
        calculateExpenseSplits({
          totalAmountCents: 5000,
          payers: [{ memberId: 'm1', amountCents: 5000 }],
          splitMode: 'Unequal',
          splitBetweenIds: ['m1', 'm2'],
          exactSplits: { m1: 2000, m2: 2500 },
        })
      ).toThrow();
    });

    it('handles Percentage split mode correctly', () => {
      const result = calculateExpenseSplits({
        totalAmountCents: 10000,
        payers: [{ memberId: 'm1', amountCents: 10000 }],
        splitMode: 'Percentage',
        splitBetweenIds: ['m1', 'm2'],
        percentages: { m1: 60, m2: 40 },
      });

      expect(result.splits.find((s) => s.memberId === 'm1')?.amountCents).toBe(6000);
      expect(result.splits.find((s) => s.memberId === 'm2')?.amountCents).toBe(4000);
    });

    it('handles Shares split mode correctly', () => {
      const result = calculateExpenseSplits({
        totalAmountCents: 3000,
        payers: [{ memberId: 'm1', amountCents: 3000 }],
        splitMode: 'Shares',
        splitBetweenIds: ['m1', 'm2', 'm3'],
        shares: { m1: 1, m2: 2, m3: 3 }, // Total 6 shares
      });

      expect(result.splits.find((s) => s.memberId === 'm1')?.amountCents).toBe(500);
      expect(result.splits.find((s) => s.memberId === 'm2')?.amountCents).toBe(1000);
      expect(result.splits.find((s) => s.memberId === 'm3')?.amountCents).toBe(1500);
    });

    it('supports Multiple Payers', () => {
      const result = calculateExpenseSplits({
        totalAmountCents: 10000,
        payers: [
          { memberId: 'm1', amountCents: 6000 },
          { memberId: 'm2', amountCents: 4000 },
        ],
        splitMode: 'Equal',
        splitBetweenIds: ['m1', 'm2'],
      });

      expect(result.payers).toHaveLength(2);
      expect(result.splits.map((s) => s.amountCents)).toEqual([5000, 5000]);
    });
  });

  describe('computeGroupBalances', () => {
    it('computes balances correctly for Goa Trip scenario', () => {
      // Hisham (m1) pays 450000 paise (4500 INR) for 4 people: Hisham, Alex (m2), John (m3), Sarah (m4)
      const expenses = [
        {
          payers: [{ memberId: 'm1', amountCents: 450000 }],
          splits: [
            { memberId: 'm1', amountCents: 112500 },
            { memberId: 'm2', amountCents: 112500 },
            { memberId: 'm3', amountCents: 112500 },
            { memberId: 'm4', amountCents: 112500 },
          ],
        },
      ];

      const balances = computeGroupBalances(['m1', 'm2', 'm3', 'm4'], expenses, []);

      expect(balances['m1'].netBalance).toBe(337500); // Is owed 3375 INR
      expect(balances['m2'].netBalance).toBe(-112500); // Owes 1125 INR
      expect(balances['m3'].netBalance).toBe(-112500); // Owes 1125 INR
      expect(balances['m4'].netBalance).toBe(-112500); // Owes 1125 INR
    });
  });

  describe('Debt Simplification Algorithm', () => {
    it('simplifies debts for Goa Trip scenario correctly', () => {
      const balances = {
        m1: 337500, // Hisham gets back 3375
        m2: -112500, // Alex owes 1125
        m3: -112500, // John owes 1125
        m4: -112500, // Sarah owes 1125
      };

      const transactions = simplifyDebts(balances);

      expect(transactions).toHaveLength(3);
      transactions.forEach((tx) => {
        expect(tx.toMemberId).toBe('m1');
        expect(tx.amountCents).toBe(112500);
      });
    });

    it('simplifies circular group debts efficiently', () => {
      // A owes B 100, B owes C 100 -> A pays C 100
      const balances = {
        A: -10000,
        B: 0,
        C: 10000,
      };

      const transactions = simplifyDebts(balances);

      expect(transactions).toHaveLength(1);
      expect(transactions[0]).toEqual({
        fromMemberId: 'A',
        toMemberId: 'C',
        amountCents: 10000,
      });
    });
  });
});
