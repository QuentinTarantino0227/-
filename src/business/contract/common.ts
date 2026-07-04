import { format } from 'date-fns';

export function formatDateYmd(date: string | Date | undefined | null): string {
  if (!date) return '';
  try {
    return format(new Date(date), 'yyyy年MM月dd日');
  } catch {
    return String(date);
  }
}
