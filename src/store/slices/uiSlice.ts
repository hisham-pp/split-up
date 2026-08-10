import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type NavTab = 'home' | 'groups' | 'activity' | 'profile';
export type CurrencySymbol = '₹' | '$' | '€' | '£';
export type ThemeMode = 'dark' | 'light';

interface UIState {
  activeTab: NavTab;
  activeGroup: any | null;
  addExpenseSheetOpen: boolean;
  preselectedGroupId: string | null;
  isOffline: boolean;
  isSyncing: boolean;
  pendingSyncCount: number;
  showSyncedToast: boolean;
  currency: CurrencySymbol;
  theme: ThemeMode;
}

const initialState: UIState = {
  activeTab: 'home',
  activeGroup: null,
  addExpenseSheetOpen: false,
  preselectedGroupId: null,
  isOffline: false,
  isSyncing: false,
  pendingSyncCount: 0,
  showSyncedToast: false,
  currency: '₹',
  theme: 'dark',
};

export const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setActiveTab: (state, action: PayloadAction<NavTab>) => {
      state.activeTab = action.payload;
    },
    setActiveGroup: (state, action: PayloadAction<any | null>) => {
      state.activeGroup = action.payload;
    },
    openAddExpenseSheet: (state, action: PayloadAction<string | undefined>) => {
      state.addExpenseSheetOpen = true;
      if (action.payload) {
        state.preselectedGroupId = action.payload;
      }
    },
    closeAddExpenseSheet: (state) => {
      state.addExpenseSheetOpen = false;
      state.preselectedGroupId = null;
    },
    toggleOfflineMode: (state) => {
      state.isOffline = !state.isOffline;
      if (state.isOffline) {
        state.pendingSyncCount += 1;
      } else {
        state.isSyncing = true;
      }
    },
    setSyncingFinished: (state) => {
      state.isSyncing = false;
      state.pendingSyncCount = 0;
      state.showSyncedToast = true;
    },
    clearSyncedToast: (state) => {
      state.showSyncedToast = false;
    },
    incrementPendingSync: (state) => {
      state.pendingSyncCount += 1;
    },
    setCurrency: (state, action: PayloadAction<CurrencySymbol>) => {
      state.currency = action.payload;
    },
    setTheme: (state, action: PayloadAction<ThemeMode>) => {
      state.theme = action.payload;
    },
  },
});

export const {
  setActiveTab,
  setActiveGroup,
  openAddExpenseSheet,
  closeAddExpenseSheet,
  toggleOfflineMode,
  setSyncingFinished,
  clearSyncedToast,
  incrementPendingSync,
  setCurrency,
  setTheme,
} = uiSlice.actions;

export default uiSlice.reducer;
