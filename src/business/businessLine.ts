import type { FormState, CoreInfo } from '../types/form';

export type BusinessLine = 'comm_yunxin';

export function getBusinessLine(_state: FormState): BusinessLine {
  return 'comm_yunxin';
}

export function getBusinessLineFromCore(_coreInfo: CoreInfo): BusinessLine {
  return 'comm_yunxin';
}

export function getBankDisplayName(cooperationBank: string): string {
  const map: Record<string, string> = {
    农业银行: '农行',
    交通银行: '交行',
    工商银行: '工行',
    中国银行: '中行',
    中信银行: '中信',
    邮储银行: '邮储',
  };
  return map[cooperationBank] || '';
}
