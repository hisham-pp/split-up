import { CurrencySymbol } from '@/store/slices/uiSlice';

export const formatCurrency = (amount: number, currency: CurrencySymbol = '₹'): string => {
  const formattedNumber = Math.abs(amount).toLocaleString('en-IN', {
    maximumFractionDigits: 2,
  });

  return `${currency}${formattedNumber}`;
};

export const formatDateRelative = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 172800) return 'Yesterday';

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};
