// 共通ユーティリティ関数
export const formatDate = (date: Date): string => {
  const dateString = date.toISOString().split('T')[0];
  return dateString || '';
};

export const calculateProgress = (completed: number, total: number): number => {
  if (total === 0) return 0;
  return Math.round((completed / total) * 100);
};

export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};
