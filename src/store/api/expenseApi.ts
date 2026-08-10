import { createApi, fakeBaseQuery } from '@reduxjs/toolkit/query/react';

export interface Member {
  id: string;
  name: string;
  avatar: string;
  email: string;
  isCurrentUser?: boolean;
}

export interface Expense {
  id: string;
  groupId: string;
  groupName: string;
  title: string;
  amount: number;
  paidBy: Member;
  date: string;
  category: 'Food' | 'Travel' | 'Housing' | 'Entertainment' | 'Shopping' | 'Utilities' | 'Other';
  splitMode: 'Equal' | 'Unequal' | 'Percentage' | 'Shares';
  splitBetween: Member[];
  notes?: string;
}

export interface Group {
  id: string;
  name: string;
  category: string;
  coverImage: string;
  members: Member[];
  userNetBalance: number; // positive = user gets back, negative = user owes
  totalSpend: number;
}

export interface ActivityItem {
  id: string;
  type: 'expense_added' | 'settlement' | 'group_created' | 'expense_deleted';
  title: string;
  description: string;
  amount?: number;
  timestamp: string;
  user: string;
  groupId?: string;
}

const CURRENT_USER: Member = {
  id: 'usr_1',
  name: 'Hisham',
  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
  email: 'hisham@example.com',
  isCurrentUser: true,
};

const SAMPLE_MEMBERS: Member[] = [
  CURRENT_USER,
  {
    id: 'usr_2',
    name: 'Alex',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
    email: 'alex@example.com',
  },
  {
    id: 'usr_3',
    name: 'Sarah',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80',
    email: 'sarah@example.com',
  },
  {
    id: 'usr_4',
    name: 'Priya',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=150&q=80',
    email: 'priya@example.com',
  },
  {
    id: 'usr_5',
    name: 'Rohan',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80',
    email: 'rohan@example.com',
  },
];

let initialGroups: Group[] = [
  {
    id: 'grp_1',
    name: 'Goa Trip',
    category: 'Travel',
    coverImage: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=600&q=80',
    members: [SAMPLE_MEMBERS[0], SAMPLE_MEMBERS[1], SAMPLE_MEMBERS[2]],
    userNetBalance: 2300,
    totalSpend: 14500,
  },
  {
    id: 'grp_2',
    name: 'Apartment 4B',
    category: 'Housing',
    coverImage: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=600&q=80',
    members: [SAMPLE_MEMBERS[0], SAMPLE_MEMBERS[3], SAMPLE_MEMBERS[4]],
    userNetBalance: -450,
    totalSpend: 28400,
  },
  {
    id: 'grp_3',
    name: 'Friday Drinks',
    category: 'Entertainment',
    coverImage: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=600&q=80',
    members: [SAMPLE_MEMBERS[0], SAMPLE_MEMBERS[1], SAMPLE_MEMBERS[3]],
    userNetBalance: 0,
    totalSpend: 4200,
  },
  {
    id: 'grp_4',
    name: 'Weekend Camping',
    category: 'Travel',
    coverImage: 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?auto=format&fit=crop&w=600&q=80',
    members: [SAMPLE_MEMBERS[0], SAMPLE_MEMBERS[1], SAMPLE_MEMBERS[2], SAMPLE_MEMBERS[4]],
    userNetBalance: 1200,
    totalSpend: 9600,
  },
];

let initialExpenses: Expense[] = [
  {
    id: 'exp_1',
    groupId: 'grp_1',
    groupName: 'Goa Trip',
    title: "Seafood Dinner at Britto's",
    amount: 4500,
    paidBy: SAMPLE_MEMBERS[0], // Hisham
    date: '2026-08-09T20:30:00Z',
    category: 'Food',
    splitMode: 'Equal',
    splitBetween: [SAMPLE_MEMBERS[0], SAMPLE_MEMBERS[1], SAMPLE_MEMBERS[2]],
  },
  {
    id: 'exp_2',
    groupId: 'grp_1',
    groupName: 'Goa Trip',
    title: 'Scooter Rental & Fuel',
    amount: 1800,
    paidBy: SAMPLE_MEMBERS[1], // Alex
    date: '2026-08-09T14:15:00Z',
    category: 'Travel',
    splitMode: 'Equal',
    splitBetween: [SAMPLE_MEMBERS[0], SAMPLE_MEMBERS[1], SAMPLE_MEMBERS[2]],
  },
  {
    id: 'exp_3',
    groupId: 'grp_2',
    groupName: 'Apartment 4B',
    title: 'Electricity Bill Aug',
    amount: 2700,
    paidBy: SAMPLE_MEMBERS[3], // Priya
    date: '2026-08-08T11:00:00Z',
    category: 'Utilities',
    splitMode: 'Equal',
    splitBetween: [SAMPLE_MEMBERS[0], SAMPLE_MEMBERS[3], SAMPLE_MEMBERS[4]],
  },
  {
    id: 'exp_4',
    groupId: 'grp_2',
    groupName: 'Apartment 4B',
    title: 'Groceries & Milk',
    amount: 1350,
    paidBy: SAMPLE_MEMBERS[0], // Hisham
    date: '2026-08-07T18:45:00Z',
    category: 'Food',
    splitMode: 'Equal',
    splitBetween: [SAMPLE_MEMBERS[0], SAMPLE_MEMBERS[3], SAMPLE_MEMBERS[4]],
  },
  {
    id: 'exp_5',
    groupId: 'grp_3',
    groupName: 'Friday Drinks',
    title: 'Cocktails & Snacks',
    amount: 2100,
    paidBy: SAMPLE_MEMBERS[1], // Alex
    date: '2026-08-05T22:10:00Z',
    category: 'Entertainment',
    splitMode: 'Equal',
    splitBetween: [SAMPLE_MEMBERS[0], SAMPLE_MEMBERS[1], SAMPLE_MEMBERS[3]],
  },
];

let initialActivities: ActivityItem[] = [
  {
    id: 'act_1',
    type: 'expense_added',
    title: "Dinner at Britto's added",
    description: 'Hisham paid ₹4,500 in Goa Trip',
    amount: 4500,
    timestamp: '2 hours ago',
    user: 'Hisham',
    groupId: 'grp_1',
  },
  {
    id: 'act_2',
    type: 'expense_added',
    title: 'Scooter Rental added',
    description: 'Alex paid ₹1,800 in Goa Trip',
    amount: 1800,
    timestamp: 'Yesterday',
    user: 'Alex',
    groupId: 'grp_1',
  },
  {
    id: 'act_3',
    type: 'settlement',
    title: 'Priya settled with Hisham',
    description: 'Priya paid ₹900 via UPI',
    amount: 900,
    timestamp: '3 days ago',
    user: 'Priya',
    groupId: 'grp_2',
  },
];

export const expenseApi = createApi({
  reducerPath: 'expenseApi',
  baseQuery: fakeBaseQuery(),
  tagTypes: ['Expenses', 'Groups', 'Activity'],
  endpoints: (builder) => ({
    getGroups: builder.query<Group[], void>({
      queryFn: async () => {
        return { data: initialGroups };
      },
      providesTags: ['Groups'],
    }),
    getExpenses: builder.query<Expense[], string | undefined>({
      queryFn: async (groupId) => {
        if (groupId) {
          return { data: initialExpenses.filter((e) => e.groupId === groupId) };
        }
        return { data: initialExpenses };
      },
      providesTags: ['Expenses'],
    }),
    getActivity: builder.query<ActivityItem[], void>({
      queryFn: async () => {
        return { data: initialActivities };
      },
      providesTags: ['Activity'],
    }),
    addExpense: builder.mutation<Expense, Partial<Expense>>({
      queryFn: async (newExp) => {
        const group = initialGroups.find((g) => g.id === newExp.groupId);
        const created: Expense = {
          id: `exp_${Date.now()}`,
          groupId: newExp.groupId || 'grp_1',
          groupName: group ? group.name : 'Goa Trip',
          title: newExp.title || 'Untitled Expense',
          amount: Number(newExp.amount) || 0,
          paidBy: newExp.paidBy || CURRENT_USER,
          date: new Date().toISOString(),
          category: newExp.category || 'Food',
          splitMode: newExp.splitMode || 'Equal',
          splitBetween: newExp.splitBetween || [CURRENT_USER],
          notes: newExp.notes,
        };

        initialExpenses = [created, ...initialExpenses];

        // Add activity
        const newAct: ActivityItem = {
          id: `act_${Date.now()}`,
          type: 'expense_added',
          title: `${created.title} added`,
          description: `${created.paidBy.name} paid ₹${created.amount.toLocaleString('en-IN')} in ${created.groupName}`,
          amount: created.amount,
          timestamp: 'Just now',
          user: created.paidBy.name,
          groupId: created.groupId,
        };
        initialActivities = [newAct, ...initialActivities];

        // Update group net balance if paid by current user
        if (group) {
          if (created.paidBy.isCurrentUser) {
            const share = created.amount / (created.splitBetween.length || 1);
            group.userNetBalance += created.amount - share;
          } else if (created.splitBetween.some((m) => m.isCurrentUser)) {
            const share = created.amount / (created.splitBetween.length || 1);
            group.userNetBalance -= share;
          }
          group.totalSpend += created.amount;
        }

        return { data: created };
      },
      invalidatesTags: ['Expenses', 'Groups', 'Activity'],
    }),
    deleteExpense: builder.mutation<string, string>({
      queryFn: async (expenseId) => {
        const deletedExp = initialExpenses.find((e) => e.id === expenseId);
        initialExpenses = initialExpenses.filter((e) => e.id !== expenseId);

        if (deletedExp) {
          initialActivities = [
            {
              id: `act_${Date.now()}`,
              type: 'expense_deleted',
              title: `${deletedExp.title} removed`,
              description: `Deleted from ${deletedExp.groupName}`,
              timestamp: 'Just now',
              user: CURRENT_USER.name,
            },
            ...initialActivities,
          ];
        }

        return { data: expenseId };
      },
      invalidatesTags: ['Expenses', 'Groups', 'Activity'],
    }),
    settleBalance: builder.mutation<{ success: boolean; groupId: string }, { groupId: string; amount: number }>({
      queryFn: async ({ groupId, amount }) => {
        const group = initialGroups.find((g) => g.id === groupId);
        if (group) {
          group.userNetBalance = 0;
        }
        initialActivities = [
          {
            id: `act_${Date.now()}`,
            type: 'settlement',
            title: `Balance settled in ${group?.name || 'Group'}`,
            description: `Settlement of ₹${amount.toLocaleString('en-IN')} completed`,
            amount,
            timestamp: 'Just now',
            user: CURRENT_USER.name,
            groupId,
          },
          ...initialActivities,
        ];
        return { data: { success: true, groupId } };
      },
      invalidatesTags: ['Groups', 'Expenses', 'Activity'],
    }),
  }),
});

export const {
  useGetGroupsQuery,
  useGetExpensesQuery,
  useGetActivityQuery,
  useAddExpenseMutation,
  useDeleteExpenseMutation,
  useSettleBalanceMutation,
} = expenseApi;

export { CURRENT_USER, SAMPLE_MEMBERS };
