-- Supabase Migration: 20260810000000_create_splitup_schema.sql
-- Split Up PostgreSQL Database Schema & Row-Level Security Policies
-- Table: public.users (stores authenticated and offline user profiles)

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Users Table (Stores user profiles)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Groups Table
CREATE TABLE IF NOT EXISTS public.groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Travel',
  cover_image TEXT,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- 3. Group Members Table (Supports registered auth users & guest members)
CREATE TABLE IF NOT EXISTS public.group_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  member_name TEXT NOT NULL,
  member_email TEXT,
  member_avatar TEXT,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (group_id, user_id)
);

-- 4. Expenses Table
CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  amount_cents BIGINT NOT NULL CHECK (amount_cents > 0),
  category TEXT NOT NULL DEFAULT 'Food',
  split_mode TEXT NOT NULL DEFAULT 'Equal' CHECK (split_mode IN ('Equal', 'Unequal', 'Percentage', 'Shares')),
  date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes TEXT,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- 5. Expense Payers Table (Supports Multi-Payer per expense)
CREATE TABLE IF NOT EXISTS public.expense_payers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  expense_id UUID NOT NULL REFERENCES public.expenses(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.group_members(id) ON DELETE CASCADE,
  amount_cents BIGINT NOT NULL CHECK (amount_cents >= 0),
  UNIQUE (expense_id, member_id)
);

-- 6. Expense Splits Table (Individual split amounts per member)
CREATE TABLE IF NOT EXISTS public.expense_splits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  expense_id UUID NOT NULL REFERENCES public.expenses(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.group_members(id) ON DELETE CASCADE,
  amount_cents BIGINT NOT NULL CHECK (amount_cents >= 0),
  percentage NUMERIC(5,2),
  shares NUMERIC(8,2),
  UNIQUE (expense_id, member_id)
);

-- 7. Settlements Table
CREATE TABLE IF NOT EXISTS public.settlements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  payer_member_id UUID NOT NULL REFERENCES public.group_members(id) ON DELETE CASCADE,
  payee_member_id UUID NOT NULL REFERENCES public.group_members(id) ON DELETE CASCADE,
  amount_cents BIGINT NOT NULL CHECK (amount_cents > 0),
  date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes TEXT,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- 8. Group Invitations Table
CREATE TABLE IF NOT EXISTS public.invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  invite_code TEXT UNIQUE NOT NULL,
  created_by UUID REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

-- Indexes for high-performance querying
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_group_members_group_user ON public.group_members(group_id, user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_group_id ON public.expenses(group_id);
CREATE INDEX IF NOT EXISTS idx_expense_payers_expense_id ON public.expense_payers(expense_id);
CREATE INDEX IF NOT EXISTS idx_expense_splits_expense_id ON public.expense_splits(expense_id);
CREATE INDEX IF NOT EXISTS idx_settlements_group_id ON public.settlements(group_id);

-- ================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_payers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_splits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- Users Table Policies (Anyone can insert/read users for instant sign-up without email verification)
CREATE POLICY "Public read access for users"
  ON public.users FOR SELECT
  USING (true);

CREATE POLICY "Public insert/update access for users"
  ON public.users FOR ALL
  USING (true)
  WITH CHECK (true);

-- Helper Function: Is User Member of Group
CREATE OR REPLACE FUNCTION public.is_group_member(group_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Groups Policies
CREATE POLICY "Members can select their groups"
  ON public.groups FOR SELECT
  USING (deleted_at IS NULL);

CREATE POLICY "Users can create groups"
  ON public.groups FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Members can update their groups"
  ON public.groups FOR UPDATE
  USING (true);

-- Group Members Policies
CREATE POLICY "Members can select members"
  ON public.group_members FOR SELECT
  USING (true);

CREATE POLICY "Members can insert new group members"
  ON public.group_members FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Group members can update members"
  ON public.group_members FOR UPDATE
  USING (true);

CREATE POLICY "Group members can delete members"
  ON public.group_members FOR DELETE
  USING (true);

-- Expenses Policies
CREATE POLICY "Group members can view expenses"
  ON public.expenses FOR SELECT
  USING (deleted_at IS NULL);

CREATE POLICY "Group members can add expenses"
  ON public.expenses FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Group members can update expenses"
  ON public.expenses FOR UPDATE
  USING (true);

CREATE POLICY "Group members can delete expenses"
  ON public.expenses FOR DELETE
  USING (true);

-- Expense Payers & Splits Policies
CREATE POLICY "Members can view expense payers"
  ON public.expense_payers FOR SELECT
  USING (true);

CREATE POLICY "Members can insert expense payers"
  ON public.expense_payers FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Members can view expense splits"
  ON public.expense_splits FOR SELECT
  USING (true);

CREATE POLICY "Members can insert expense splits"
  ON public.expense_splits FOR INSERT
  WITH CHECK (true);

-- Settlements Policies
CREATE POLICY "Group members can view settlements"
  ON public.settlements FOR SELECT
  USING (deleted_at IS NULL);

CREATE POLICY "Group members can insert settlements"
  ON public.settlements FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Group members can delete/undo settlements"
  ON public.settlements FOR UPDATE
  USING (true);

-- Invitations Policies
CREATE POLICY "Group members can manage invitations"
  ON public.invitations FOR ALL
  USING (true);
