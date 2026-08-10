import { configureStore } from '@reduxjs/toolkit';
import uiReducer from './slices/uiSlice';
import { expenseApi } from './api/expenseApi';

export const store = configureStore({
  reducer: {
    ui: uiReducer,
    [expenseApi.reducerPath]: expenseApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(expenseApi.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
