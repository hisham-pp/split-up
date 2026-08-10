import Dexie, { Table } from 'dexie';

export interface LocalProfile {
  id: string;
  email: string;
  fullName: string;
  avatarUrl?: string;
  updatedAt: string;
}

export interface LocalGroup {
  id: string;
  name: string;
  category: string;
  coverImage?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface LocalGroupMember {
  id: string;
  groupId: string;
  userId?: string | null;
  memberName: string;
  memberEmail?: string | null;
  memberAvatar?: string | null;
  role: 'owner' | 'admin' | 'member';
  joinedAt: string;
}

export interface LocalExpense {
  id: string;
  groupId: string;
  title: string;
  amountCents: number; // integer minor units
  category: 'Food' | 'Travel' | 'Housing' | 'Entertainment' | 'Shopping' | 'Utilities' | 'Other';
  splitMode: 'Equal' | 'Unequal' | 'Percentage' | 'Shares';
  date: string;
  notes?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface LocalExpensePayer {
  id: string;
  expenseId: string;
  memberId: string;
  amountCents: number;
}

export interface LocalExpenseSplit {
  id: string;
  expenseId: string;
  memberId: string;
  amountCents: number;
  percentage?: number;
  shares?: number;
}

export interface LocalSettlement {
  id: string;
  groupId: string;
  payerMemberId: string;
  payeeMemberId: string;
  amountCents: number;
  date: string;
  notes?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export type QueueOperation =
  | 'CREATE_GROUP'
  | 'UPDATE_GROUP'
  | 'DELETE_GROUP'
  | 'ADD_MEMBER'
  | 'REMOVE_MEMBER'
  | 'CREATE_EXPENSE'
  | 'UPDATE_EXPENSE'
  | 'DELETE_EXPENSE'
  | 'CREATE_SETTLEMENT'
  | 'UNDO_SETTLEMENT';

export interface SyncQueueItem {
  id: string;
  operation: QueueOperation;
  payload: any;
  timestamp: number;
  status: 'pending' | 'processing' | 'failed';
  retries: number;
  errorMessage?: string;
}

export class SplitUpDatabase extends Dexie {
  profiles!: Table<LocalProfile>;
  groups!: Table<LocalGroup>;
  groupMembers!: Table<LocalGroupMember>;
  expenses!: Table<LocalExpense>;
  expensePayers!: Table<LocalExpensePayer>;
  expenseSplits!: Table<LocalExpenseSplit>;
  settlements!: Table<LocalSettlement>;
  syncQueue!: Table<SyncQueueItem>;

  constructor() {
    super('SplitUpDatabase');
    this.version(1).stores({
      profiles: 'id, email',
      groups: 'id, name, createdBy, updatedAt, deletedAt',
      groupMembers: 'id, groupId, userId, [groupId+userId]',
      expenses: 'id, groupId, category, date, updatedAt, deletedAt',
      expensePayers: 'id, expenseId, memberId, [expenseId+memberId]',
      expenseSplits: 'id, expenseId, memberId, [expenseId+memberId]',
      settlements: 'id, groupId, payerMemberId, payeeMemberId, date, deletedAt',
      syncQueue: 'id, operation, timestamp, status',
    });
  }
}

export const db = new SplitUpDatabase();

/**
 * Clean production initialization.
 * Purges legacy mock/demo sample data from local database if present.
 */
export async function seedInitialLocalData() {
  // Purge legacy sample fake data if present
  const fakeGroup = await db.groups.get('grp_goa');
  if (fakeGroup) {
    await db.groups.bulkDelete(['grp_goa', 'grp_apt']);
    await db.expenses.delete('exp_hotel');
    await db.expensePayers.delete('pay_1');
    await db.expenseSplits.bulkDelete(['split_1', 'split_2', 'split_3', 'split_4']);
    await db.groupMembers.bulkDelete(['mb_1', 'mb_2', 'mb_3', 'mb_4', 'mb_apt_1', 'mb_apt_2']);
    await db.profiles.bulkDelete(['usr_hisham', 'usr_alex', 'usr_john', 'usr_sarah']);
  }
}
