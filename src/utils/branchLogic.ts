import type { FormState } from '../types/form';
import { addMonths, parseISO, format } from 'date-fns';

export function isGroupMode(state: FormState): boolean {
  return state.coreInfo.isGroupMode === '是';
}

// 由授信终止日推导最晚业务到期日（固定加 6 个月）
export function getLatestDueDate(creditEndDate: string): string {
  if (!creditEndDate) return '';
  try {
    return format(addMonths(parseISO(creditEndDate), 6), 'yyyy-MM-dd');
  } catch {
    return '';
  }
}

// 由立项类型推导额度分类
export function getQuotaCategory(projectType: string): string {
  if (projectType === '新增额度-并入混合额度') return '混合额度';
  if (projectType === '新增额度') return '专属额度';
  return '';
}

export function showBuyerInterestDetail(state: FormState): boolean {
  return state.coreInfo.isGroupMode === '是' && state.coreInfo.interestPayer === '需要买方付息';
}

// 立项类型判断
export function isNewProject(projectType: string): boolean {
  return projectType.startsWith('新增额度');
}

export function isOldProject(projectType: string): boolean {
  return projectType.startsWith('原有额度');
}

export function isExclusiveQuotaProject(projectType: string): boolean {
  return projectType === '新增额度';
}

export function isMixedQuotaProject(projectType: string): boolean {
  return projectType === '新增额度-并入混合额度';
}

// 原有额度-参数修改（不涉及额度、期限）：不生成/不校验三方协议、额度利率确认函
export function isParamModifyOnlyProject(projectType: string): boolean {
  return projectType === '原有额度-参数修改（不涉及额度、期限）';
}

export function getStepCount(state: FormState): number {
  return isGroupMode(state) ? 6 : 5;
}

export function getStepTitle(state: FormState, index: number): string {
  const isGroup = isGroupMode(state);
  if (index === 2) {
    return isGroup ? '步骤3：集团模式' : '步骤3：集团模式（已跳过）';
  }
  const titles = ['步骤1：额度信息', '步骤2：核企信息', '', '步骤4：银行信息', '账户信息', '步骤6：利率信息'];
  return titles[index] || '';
}

export function getDisplaySteps(state: FormState): number[] {
  if (isGroupMode(state)) {
    return [0, 1, 2, 3, 4, 5];
  }
  return [0, 1, 3, 4, 5];
}

export function mapStepIndexToLogicIndex(displayIndex: number, state: FormState): number {
  if (isGroupMode(state)) {
    return displayIndex;
  }
  // 非集团模式：0->0, 1->1, 2->3, 3->4, 4->5
  if (displayIndex <= 1) return displayIndex;
  return displayIndex + 1;
}

// 清分方案名称：去掉“前缀：”中的前缀部分，例如“推荐：中信清分” -> “中信清分”
export function getClearingPlanName(clearingMethod: string): string {
  if (!clearingMethod) return '';
  const idx = clearingMethod.indexOf('：');
  if (idx === -1) return clearingMethod;
  return clearingMethod.slice(idx + 1).trim();
}

