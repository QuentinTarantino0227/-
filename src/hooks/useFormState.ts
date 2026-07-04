import { useState, useCallback, useEffect } from 'react';
import type { FormState, CoreInfo, BankInfo, ReceiveAccountInfo, RateInfo, OtherInfo, Subsidiary, ValidationError } from '../types/form';
import { isOldProject, isExclusiveQuotaProject, isMixedQuotaProject } from '../utils/branchLogic';
import { getBusinessLine } from '../business/businessLine';
import { getFormStrategy } from '../business/form';

function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

function generateProjectId(): string {
  const now = new Date();
  const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const timeStr = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
  const random = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `LX-${dateStr}-${timeStr}-${random}`;
}

const defaultCoreInfo: CoreInfo = {
  initiatorName: '',
  creditCode: '',
  cloudQuota: 0,
  isGroupMode: '',
  productType: '云信',
  cooperationBank: '交通银行',
  cooperationMode: '',
  clearingMethod: '推荐：中信清分',
  repaymentAccount: '',
  repaymentBank: '',
  repaymentUnionCode: '',
  interestPayer: '',
  buyerInterestDetail: '',
  firstTradeBack: '',
};

const defaultBankInfo: BankInfo = {
  branchName: '',
  creditStartDate: '',
  managerName: '',
  creditEndDate: '',
  managerPhone: '',
  branchRegion: '',
  branchProvince: '',
  branchCity: '',
  branchArea: '',
  branchAddress: '',
  initiatorAccount: '',
  initiatorBank: '',
  branchCreditCode: '',
};

const defaultReceiveAccount: ReceiveAccountInfo = {
  accountName: '',
  accountNumber: '',
  identifier: '',
  bankName: '',
  unionCode: '',
};

const defaultRateInfo: RateInfo = {
  financingRate: undefined as any,
  financingRateType: '年化',
  factoringFee: undefined as any,
  factoringFeeType: '非年化',
  platformFee: 0.2,
  platformFeeType: '年化',
  sponsorFee: 0,
  sponsorFeeType: '年化',
};

const defaultOtherInfo: OtherInfo = {
  quotaShortName: '',
  projectType: '',
  quotaName: '',
  mixedQuotaName: '',
  adjustmentNo: '',
};

const defaultSubsidiary: Subsidiary = {
  id: generateId(),
  name: '',
  quota: 0,
  creditCode: '',
  repaymentAccount: '',
  repaymentBank: '',
  repaymentUnionCode: '',
};

export function getDefaultState(): FormState {
  return {
    projectId: generateProjectId(),
    createdAt: new Date().toISOString(),
    coreInfo: { ...defaultCoreInfo },
    subsidiaries: [{ ...defaultSubsidiary, id: generateId() }, { ...defaultSubsidiary, id: generateId() }],
    bankInfo: { ...defaultBankInfo },
    receiveAccount: { ...defaultReceiveAccount },
    rateInfo: { ...defaultRateInfo },
    otherInfo: { ...defaultOtherInfo },
  };
}

// ==================== 历史立项管理 ====================

export interface ProjectRecord {
  projectId: string;
  createdAt: string;
  name: string;
  state: FormState;
  lastSaved?: string;
}

import { saveProject as apiSaveProject, listProjects as apiListProjects, deleteProject as apiDeleteProject, duplicateProject as apiDuplicateProject } from '../api/client';

export async function saveProject(state: FormState) {
  try {
    await apiSaveProject(state);
  } catch (err) {
    console.error('保存立项失败:', err);
  }
}

export async function getProjects(): Promise<ProjectRecord[]> {
  try {
    return await apiListProjects();
  } catch (err) {
    console.error('获取立项列表失败:', err);
    return [];
  }
}

export async function deleteProject(projectId: string) {
  try {
    await apiDeleteProject(projectId);
  } catch (err) {
    console.error('删除立项失败:', err);
  }
}

// 重复立项：将历史立项数据合并到当前默认结构中，生成新编号
export async function duplicateProject(projectId: string): Promise<FormState | null> {
  try {
    return await apiDuplicateProject(projectId);
  } catch {
    return null;
  }
}

// ==================== useFormState Hook ====================

const CURRENT_PROJECT_KEY = 'current_project_draft';

function loadDraftFromSession(): FormState | null {
  try {
    const saved = sessionStorage.getItem(CURRENT_PROJECT_KEY);
    if (saved) return JSON.parse(saved) as FormState;
  } catch {}
  return null;
}

export function useFormState() {
  const [state, setState] = useState<FormState>(() => loadDraftFromSession() || getDefaultState());
  const [lastSaved, setLastSaved] = useState<string>('');

  // 自动同步当前草稿到 sessionStorage，保证页面跳转后状态不丢失
  useEffect(() => {
    sessionStorage.setItem(CURRENT_PROJECT_KEY, JSON.stringify(state));
  }, [state]);

  const updateCoreInfo = useCallback((patch: Partial<CoreInfo>) => {
    setState(prev => {
      const next: FormState = {
        ...prev,
        coreInfo: { ...prev.coreInfo, ...patch },
      };
      if (patch.isGroupMode === '否') {
        next.subsidiaries = [{ ...defaultSubsidiary, id: generateId() }, { ...defaultSubsidiary, id: generateId() }];
        next.coreInfo.buyerInterestDetail = '';
      }
      if (patch.isGroupMode === '是') {
        while (next.subsidiaries.length < 2) {
          next.subsidiaries.push({ ...defaultSubsidiary, id: generateId() });
        }
        const first = next.subsidiaries[0];
        const isEmpty = !first.name.trim() && !first.creditCode.trim();
        if (isEmpty) {
          next.subsidiaries[0] = {
            ...first,
            name: next.coreInfo.initiatorName,
            creditCode: next.coreInfo.creditCode,
            repaymentAccount: next.coreInfo.repaymentAccount,
            repaymentBank: next.coreInfo.repaymentBank,
            repaymentUnionCode: next.coreInfo.repaymentUnionCode,
          };
        }
      }
      if (patch.interestPayer === '仅卖方付息') {
        next.coreInfo.buyerInterestDetail = '';
      }
      return next;
    });
  }, []);

  const updateBankInfo = useCallback((patch: Partial<BankInfo>) => {
    setState(prev => ({ ...prev, bankInfo: { ...prev.bankInfo, ...patch } }));
  }, []);

  const updateReceiveAccount = useCallback((patch: Partial<ReceiveAccountInfo>) => {
    setState(prev => ({ ...prev, receiveAccount: { ...prev.receiveAccount, ...patch } }));
  }, []);

  const updateRateInfo = useCallback((patch: Partial<RateInfo>) => {
    setState(prev => ({ ...prev, rateInfo: { ...prev.rateInfo, ...patch } }));
  }, []);

  const updateOtherInfo = useCallback((patch: Partial<OtherInfo>) => {
    setState(prev => {
      const next: FormState = { ...prev, otherInfo: { ...prev.otherInfo, ...patch } };
      // 立项类型切换时清空不相关的额度字段
      if (patch.projectType !== undefined) {
        const pt = patch.projectType;
        if (isExclusiveQuotaProject(pt)) {
          next.otherInfo.mixedQuotaName = '';
          next.otherInfo.quotaName = '';
          next.otherInfo.adjustmentNo = '';
        } else if (isMixedQuotaProject(pt)) {
          next.otherInfo.quotaName = '';
        } else if (isOldProject(pt)) {
          next.otherInfo.mixedQuotaName = '';
          next.otherInfo.quotaShortName = '';
        } else if (pt === '') {
          next.otherInfo.mixedQuotaName = '';
          next.otherInfo.quotaName = '';
          next.otherInfo.quotaShortName = '';
          next.otherInfo.adjustmentNo = '';
        }
      }
      return next;
    });
  }, []);

  const setSubsidiaries = useCallback((subsidiaries: Subsidiary[]) => {
    setState(prev => ({ ...prev, subsidiaries }));
  }, []);

  const clearState = useCallback(() => {
    setState(getDefaultState());
    setLastSaved('');
    sessionStorage.removeItem(CURRENT_PROJECT_KEY);
  }, []);

  const startNewProject = useCallback((initialCore: Partial<CoreInfo>) => {
    const fresh = getDefaultState();
    fresh.coreInfo = { ...fresh.coreInfo, ...initialCore };
    setState(fresh);
    sessionStorage.setItem(CURRENT_PROJECT_KEY, JSON.stringify(fresh));
    setLastSaved(new Date().toLocaleString('zh-CN'));
  }, []);

  const loadProjectState = useCallback((newState: FormState) => {
    setState(newState);
    sessionStorage.setItem(CURRENT_PROJECT_KEY, JSON.stringify(newState));
    setLastSaved(new Date().toLocaleString('zh-CN'));
  }, []);

  const patchState = useCallback((patch: Partial<FormState>) => {
    setState(prev => {
      const next = { ...prev };
      if (patch.coreInfo) next.coreInfo = { ...next.coreInfo, ...patch.coreInfo };
      if (patch.subsidiaries) next.subsidiaries = patch.subsidiaries;
      if (patch.bankInfo) next.bankInfo = { ...next.bankInfo, ...patch.bankInfo };
      if (patch.receiveAccount) next.receiveAccount = { ...next.receiveAccount, ...patch.receiveAccount };
      if (patch.rateInfo) next.rateInfo = { ...next.rateInfo, ...patch.rateInfo };
      if (patch.otherInfo) next.otherInfo = { ...next.otherInfo, ...patch.otherInfo };
      return next;
    });
  }, []);

  return {
    state,
    lastSaved,
    updateCoreInfo,
    updateBankInfo,
    updateReceiveAccount,
    updateRateInfo,
    updateOtherInfo,
    setSubsidiaries,
    clearState,
    startNewProject,
    loadProjectState,
    patchState,
  };
}

// 验证函数
export function validateStep1(state: FormState): ValidationError[] {
  const strategy = getFormStrategy(getBusinessLine(state));
  return strategy.validateCoreInfo(state);
}

export function validateStep2(state: FormState): ValidationError[] {
  const strategy = getFormStrategy(getBusinessLine(state));
  return strategy.validateGroupMode(state);
}

export function validateStep3(state: FormState): ValidationError[] {
  const strategy = getFormStrategy(getBusinessLine(state));
  return strategy.validateBankInfo(state);
}

export function validateStep4(state: FormState): ValidationError[] {
  const errors: ValidationError[] = [];
  const r = state.receiveAccount;
  const b = state.bankInfo;
  if (!r.accountName.trim()) errors.push({ field: 'accountName', message: '请输入银行收款户名' });
  if (!r.accountNumber.trim()) errors.push({ field: 'accountNumber', message: '请输入收款账号' });
  // 识别号：收款户名不等于额度发起方名称时必填
  if (r.accountName.trim() && r.accountName !== state.coreInfo.initiatorName && !r.identifier?.trim()) {
    errors.push({ field: 'identifier', message: '收款户名与核心企业名称不一致时，识别号必填' });
  }
  if (!r.bankName.trim()) errors.push({ field: 'bankName', message: '请输入开户行' });
  if (!r.unionCode.trim()) errors.push({ field: 'unionCode', message: '请输入联行号' });
  else if (!/^\d{12}$/.test(r.unionCode))
    errors.push({ field: 'unionCode', message: '联行号必须为12位数字' });
  // 结算账户字段（从银行信息移到账户信息步骤）
  if (!b.initiatorAccount.trim()) errors.push({ field: 'initiatorAccount', message: '请输入交行结算账户' });
  if (!b.initiatorBank.trim()) errors.push({ field: 'initiatorBank', message: '请输入结算账户开户行' });
  return errors;
}

export function validateStep5(state: FormState): ValidationError[] {
  const errors: ValidationError[] = [];
  const r = state.rateInfo;
  if (!r.financingRate && r.financingRate !== 0) errors.push({ field: 'financingRate', message: '请输入银行融资利率' });
  if (!r.factoringFee && r.factoringFee !== 0) errors.push({ field: 'factoringFee', message: '请输入银行保理手续费' });
  if (!r.platformFee && r.platformFee !== 0) errors.push({ field: 'platformFee', message: '请输入平台综合服务费率' });
  return errors;
}
