# Split-Up 💸

**Split-Up** is an **Offline-First Expense Manager & Group Bill Splitting Web Application** built with **Next.js 16**, **React 19**, **TypeScript**, **Dexie.js (IndexedDB)**, and **Supabase**.

Designed for effortless expense tracking and seamless bill splitting with friends, housemates, or trip companions—even without an active internet connection.

---

## ✨ Features

- ⚡ **Offline-First Architecture**: Read and write data instantly using local IndexedDB storage (`Dexie.js`).
- 🔄 **Background Sync & Queue**: Changes made offline are automatically queued and synchronized with Supabase once reconnected.
- 👥 **Group Expense Management**: Create custom groups, manage member roles (owner/admin/member), and view collective activity logs.
- 💰 **Flexible Bill Splitting**:
  - **Equal**: Automatic division with minor-unit remainder distribution.
  - **Unequal**: Specify custom exact amounts for each member.
  - **Percentage**: Split expenses based on custom percentages.
  - **Shares**: Allocate costs by relative ratio/shares (e.g. 2 shares vs 1 share).
- 🧮 **Greedy Debt Simplification**: Built-in algorithm (`debtSimplifier.ts`) minimizes total transaction count needed to settle group debts.
- 💵 **Precision Financial Calculations**: Uses minor units (cents/paise) internally to eliminate floating-point rounding errors.
- 📱 **Responsive Dark-Theme UI**: Built with Next.js App Router, Tailwind CSS, MUI Icons, Lucide Icons, and smooth mobile bottom sheet navigation.

---

## 🛠️ Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router), [React 19](https://react.dev/), [TypeScript](https://www.typescriptlang.org/)
- **Local Database**: [Dexie.js](https://dexie.org/) (IndexedDB wrapper) & `dexie-react-hooks`
- **Backend & Cloud Sync**: [Supabase JS Client](https://supabase.com/) & Custom Sync Queue Engine
- **State Management**: [Redux Toolkit](https://redux-toolkit.js.org/) & `react-redux`
- **Styling & UI**: Tailwind CSS v4, `@mui/material`, `@mui/icons-material`, `lucide-react`, `canvas-confetti`
- **Validation**: [Zod](https://zod.dev/)
- **Testing**: [Vitest](https://vitest.dev/)

---

## 📁 Project Structure

```
split-up/
├── src/
│   ├── app/                # Next.js App Router pages, layout, and global providers
│   ├── components/         # Reusable UI components (auth, layout, modals, UI primitives)
│   ├── views/              # Core application screens (Home, Groups, GroupDetail, Activity, Profile)
│   ├── lib/
│   │   ├── db/             # Dexie IndexedDB setup & local data models (`db.ts`)
│   │   ├── financial/      # Financial calculation engine & debt simplification algorithm
│   │   ├── sync/           # Background synchronization engine & offline queue processing
│   │   └── supabase/       # Supabase client configuration
│   ├── store/              # Redux slices (UI state, active group/tab management)
│   └── utils/              # Helper functions & formatting utilities
├── supabase/
│   └── schema.sql          # Database schema, RLS policies, & indexes for Supabase
├── public/                 # Static assets & web manifest
├── package.json            # Dependencies & build scripts
└── README.md               # Project documentation
```

---

## 🚀 Getting Started

### 1. Prerequisites

- **Node.js**: v18.x or higher
- **npm** or **pnpm** / **yarn**

### 2. Installation

Clone the repository and install dependencies:

```bash
git clone https://github.com/your-username/split-up.git
cd split-up
npm install
```

### 3. Environment Setup

Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-supabase-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### 4. Supabase Setup (Optional for Cloud Sync)

Execute the SQL script in `supabase/schema.sql` inside your Supabase SQL Editor to set up:
- Profiles, Groups, Group Members, Expenses, Expense Payers, Expense Splits, and Settlements tables.
- RLS (Row Level Security) policies and database triggers for automatic timestamp updates.

### 5. Running the Application

Start the local development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Testing & Verification

Run unit tests for financial calculations and debt simplification:

```bash
npx vitest run
```

---

## 💡 How Debt Simplification Works

Split-Up calculates the net balance for each group member (`Total Paid - Total Owed`). 
It then uses a **greedy min/max algorithm** (`src/lib/financial/debtSimplifier.ts`) to pair the member with the largest net debt to the member with the largest net credit. 

This guarantees that:
1. All balances are settled accurately to zero.
2. The total number of required transfer transactions is minimized.

---

## 📜 License

This project is licensed under the MIT License.
