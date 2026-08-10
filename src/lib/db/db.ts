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
 * Initializes default sample seed data in Dexie if the local database is completely empty.
 * This guarantees the user immediately has the "Goa Trip" group with Hisham, Alex, John, Sarah ready to use offline!
 */
export async function seedInitialLocalData() {
  const groupCount = await db.groups.count();
  if (groupCount > 0) return; // Already initialized

  const now = new Date().toISOString();

  // Create default current user profile
  const currentUser: LocalProfile = {
    id: 'usr_hisham',
    email: 'hisham@example.com',
    fullName: 'Hisham',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
    updatedAt: now,
  };

  const sampleMembersList = [
    currentUser,
    {
      id: 'usr_alex',
      email: 'alex@example.com',
      fullName: 'Alex',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
      updatedAt: now,
    },
    {
      id: 'usr_john',
      email: 'john@example.com',
      fullName: 'John',
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80',
      updatedAt: now,
    },
    {
      id: 'usr_sarah',
      email: 'sarah@example.com',
      fullName: 'Sarah',
      avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=150&q=80',
      updatedAt: now,
    },
  ];

  await db.profiles.bulkPut(sampleMembersList);

  // Group 1: Goa Trip
  const goaGroup: LocalGroup = {
    id: 'grp_goa',
    name: 'Goa Trip',
    category: 'Travel',
    coverImage: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=600&q=80',
    createdBy: currentUser.id,
    createdAt: now,
    updatedAt: now,
  };

  await db.groups.put(goaGroup);

  const goaMembers: LocalGroupMember[] = [
    { id: 'mb_1', groupId: goaGroup.id, userId: currentUser.id, memberName: 'Hisham', memberEmail: currentUser.email, memberAvatar: currentUser.avatarUrl, role: 'owner', joinedAt: now },
    { id: 'mb_2', groupId: goaGroup.id, userId: sampleMembersList[1].id, memberName: 'Alex', memberEmail: sampleMembersList[1].email, memberAvatar: sampleMembersList[1].avatarUrl, role: 'member', joinedAt: now },
    { id: 'mb_3', groupId: goaGroup.id, userId: sampleMembersList[2].id, memberName: 'John', memberEmail: sampleMembersList[2].email, memberAvatar: sampleMembersList[2].avatarUrl, role: 'member', joinedAt: now },
    { id: 'mb_4', groupId: goaGroup.id, userId: sampleMembersList[3].id, memberName: 'Sarah', memberEmail: sampleMembersList[3].email, memberAvatar: sampleMembersList[3].avatarUrl, role: 'member', joinedAt: now },
  ];

  await db.groupMembers.bulkPut(goaMembers);

  // Initial Expense 1: ₹4,500 Hotel paid by Hisham split equally between Hisham, Alex, John, Sarah
  const hotelExp: LocalExpense = {
    id: 'exp_hotel',
    groupId: goaGroup.id,
    title: 'Beach Resort Hotel',
    amountCents: 450000, // ₹4,500.00 = 450000 paise
    category: 'Housing',
    splitMode: 'Equal',
    date: new Date(Date.now() - 86400000).toISOString(),
    notes: 'Booked 2 deluxe ocean view rooms',
    createdBy: currentUser.id,
    createdAt: now,
    updatedAt: now,
  };

  await db.expenses.put(hotelExp);

  await db.expensePayers.put({
    id: 'pay_1',
    expenseId: hotelExp.id,
    memberId: goaMembers[0].id,
    amountCents: 450000,
  });

  const hotelSplits: LocalExpenseSplit[] = goaMembers.map((m, idx) => ({
    id: `split_${idx + 1}`,
    expenseId: hotelExp.id,
    memberId: m.id,
    amountCents: 112500, // ₹1,125.00 each
  }));

  await db.expenseSplits.bulkPut(hotelSplits);

  // Group 2: Apartment 4B
  const aptGroup: LocalGroup = {
    id: 'grp_apt',
    name: 'Apartment 4B',
    category: 'Housing',
    coverImage: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=600&q=80',
    createdBy: currentUser.id,
    createdAt: now,
    updatedAt: now,
  };
  await db.groups.put(aptGroup);

  const aptMembers: LocalGroupMember[] = [
    { id: 'mb_apt_1', groupId: aptGroup.id, userId: currentUser.id, memberName: 'Hisham', memberEmail: currentUser.email, memberAvatar: currentUser.avatarUrl, role: 'owner', joinedAt: now },
    { id: 'mb_apt_2', groupId: aptGroup.id, userId: sampleMembersList[1].id, memberName: 'Alex', memberEmail: sampleMembersList[1].email, memberAvatar: sampleMembersList[1].avatarUrl, role: 'member', joinedAt: now },
  ];
  await db.groupMembers.bulkPut(aptMembers);
}
