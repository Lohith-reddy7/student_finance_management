export const formatCurrency = (value: number | string | null | undefined): string => {
  const amount = Number(value || 0);
  return `₹${Math.abs(amount).toLocaleString('en-IN')}`;
};

export const cleanDisplayText = (value: string | null | undefined): string => {
  if (!value) return '';
  return value
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu, '')
    .replace(/₹\s*([\d,]+(?:\.\d+)?)/g, (_match, amount: string) => formatCurrency(amount.replace(/,/g, '')))
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([,.;!?])/g, '$1')
    .trim();
};
