import type { FormState, ValidationError } from '../../types/form';
import { isGroupMode, getLatestDueDate } from '../../utils/branchLogic';
import type { FormStrategy } from './types';

const EXEMPT_CLEARING_METHODS = ['推荐：中信清分', '线上：中信过渡户清分'];

export const commYunxinFormStrategy: FormStrategy = {
  displayName: '交通银行云信',

  // 步骤1：核企信息
  quotaLabel: '云信额度（万元）',
  quotaPlaceholder: '请输入云信额度',
  groupModeHints: {
    yes: '（多个关联公司，共用该额度开立云信）',
    no: '（只有一个核心企业开云信）',
  },
  clearingOptions: [
    { value: '推荐：中信清分', label: '推荐：中信清分', hint: '还款账户信息由银行线上系统处理，还款函中无需填写具体账户' },
    { value: '线上：中信过渡户清分', label: '线上：中信过渡户清分', hint: '还款函中的【账号】将自动取自「核企还款账户」' },
    { value: '线上：交e保清分', label: '线上：交e保清分', hint: '还款函中的【开户行】将自动取自「还款户开户行」' },
    { value: '线上：工行e企付', label: '线上：工行e企付', hint: '还款函中的【联行号】将自动取自「还款户联行号」' },
    { value: '实体户：农业银行', label: '实体户：农业银行', hint: '还款函将完整填写账户信息，均取自本页已填字段' },
    { value: '实体户：交行银企付', label: '实体户：交行银企付', hint: '还款函将完整填写账户信息，均取自本页已填字段' },
    { value: '实体户：工商银行', label: '实体户：工商银行', hint: '还款函将完整填写账户信息，均取自本页已填字段' },
    { value: '实体户：中国银行', label: '实体户：中国银行', hint: '还款函将完整填写账户信息，均取自本页已填字段' },
    { value: '实体户：中信银行', label: '实体户：中信银行', hint: '还款函将完整填写账户信息，均取自本页已填字段' },
  ],
  requiresRepaymentAccount(clearingMethod: string): boolean {
    return !EXEMPT_CLEARING_METHODS.includes(clearingMethod);
  },
  requiresClearingAccountDoc(clearingMethod: string): boolean {
    return !EXEMPT_CLEARING_METHODS.includes(clearingMethod);
  },
  getDefaultRepaymentBank(clearingMethod: string): string {
    const methodToBank: Record<string, string> = {
      '线上：交e保清分': '交通银行',
      '线上：工行e企付': '工商银行',
      '实体户：农业银行': '农业银行',
      '实体户：交行银企付': '交通银行',
      '实体户：工商银行': '工商银行',
      '实体户：中国银行': '中国银行',
      '实体户：中信银行': '中信银行',
    };
    return methodToBank[clearingMethod] || '';
  },
  interestPayerHint: '交通银行云信业务，不代扣平台手续费平台综合服务费率，需要付费方网银打款。',
  showFirstTradeBack: false,
  showConfirmationSettings: false,

  // 步骤3：银行信息（投资人）
  settlementAccountLabel(initiatorName: string): string {
    return `${initiatorName ? `${initiatorName} ` : ''}在交行的一般户`;
  },

  // 步骤4：账户信息
  receiveAccountNotice(_bankDisplayName: string): string {
    return `云信到期后，银行用该账户接收还款，有两种可能性：<br/>(1)核心企业在交行的一般户<br/>(2)支行内部户"暂收结算款项-应收账款清分还款"，需配合识别号使用。`;
  },

  // 步骤2：集团模式
  showSubsidiaryRepaymentColumns: true,

  // 校验
  validateCoreInfo(state: FormState): ValidationError[] {
    const errors: ValidationError[] = [];
    const c = state.coreInfo;
    const o = state.otherInfo;
    if (!c.initiatorName.trim()) errors.push({ field: 'initiatorName', message: '请输入额度发起方名称' });
    if (!o.quotaShortName.trim()) errors.push({ field: 'quotaShortName', message: '请输入额度简称' });
    if (!c.creditCode.trim()) errors.push({ field: 'creditCode', message: '请输入统一社会信用代码' });
    else if (!/^([0-9A-HJ-NPQRTUWXY]{2}\d{6}[0-9A-HJ-NPQRTUWXY]{10}|[0-9A-HJ-NPQRTUWXY]{18})$/i.test(c.creditCode))
      errors.push({ field: 'creditCode', message: '统一社会信用代码格式不正确（18位）' });
    if (!c.cloudQuota || c.cloudQuota <= 0) errors.push({ field: 'cloudQuota', message: '额度必须大于0' });
    if (!c.isGroupMode) errors.push({ field: 'isGroupMode', message: '请选择是否集团模式' });

    if (!c.clearingMethod) errors.push({ field: 'clearingMethod', message: '请选择清分方式' });
    if (this.requiresRepaymentAccount(c.clearingMethod)) {
      if (!c.repaymentAccount.trim()) errors.push({ field: 'repaymentAccount', message: '请输入还款账号' });
      if (!c.repaymentBank.trim()) errors.push({ field: 'repaymentBank', message: '请输入还款户开户行' });
      else {
        const expectedBank = this.getDefaultRepaymentBank(c.clearingMethod);
        if (expectedBank && !c.repaymentBank.includes(expectedBank)) {
          errors.push({ field: 'repaymentBank', message: `核企还款账户开户行与清分方式不匹配，应包含"${expectedBank}"` });
        }
      }
      if (!c.repaymentUnionCode.trim()) errors.push({ field: 'repaymentUnionCode', message: '请输入还款户联行号' });
      else if (!/^\d{12}$/.test(c.repaymentUnionCode)) errors.push({ field: 'repaymentUnionCode', message: '联行号必须为12位数字' });
    }
    if (!c.interestPayer) errors.push({ field: 'interestPayer', message: '请选择付息方' });
    if (c.isGroupMode === '是' && c.interestPayer === '需要买方付息' && !c.buyerInterestDetail)
      errors.push({ field: 'buyerInterestDetail', message: '请选择买方付息详情' });

    return errors;
  },

  validateGroupMode(state: FormState): ValidationError[] {
    const errors: ValidationError[] = [];
    if (!isGroupMode(state)) return errors;

    const totalAssigned = state.subsidiaries.reduce((sum, s) => sum + (s.quota || 0), 0);
    if (state.subsidiaries.length < 2) {
      errors.push({ field: 'subsidiaries', message: '集团模式至少需要2个核心企业' });
    }
    if (totalAssigned > state.coreInfo.cloudQuota) {
      errors.push({ field: 'subsidiaries', message: `已超额分配，当前超额 ${totalAssigned - state.coreInfo.cloudQuota} 万元` });
    }

    state.subsidiaries.forEach((s, i) => {
      if (!s.name.trim()) errors.push({ field: `subsidiary-${i}-name`, message: `子公司${i + 1}名称必填` });
      if (s.quota === undefined || s.quota === null || s.quota < 0) errors.push({ field: `subsidiary-${i}-quota`, message: `子公司${i + 1}分配额度必填` });
      else if (i > 0 && s.quota <= 0) errors.push({ field: `subsidiary-${i}-quota`, message: `子公司${i + 1}分配额度必须大于0` });
      if (!s.creditCode.trim()) errors.push({ field: `subsidiary-${i}-creditCode`, message: `子公司${i + 1}社会信用代码必填` });
      if (this.requiresRepaymentAccount(state.coreInfo.clearingMethod)) {
        if (!s.repaymentAccount.trim()) errors.push({ field: `subsidiary-${i}-repaymentAccount`, message: `子公司${i + 1}核企还款账号必填` });
        if (!s.repaymentBank.trim()) errors.push({ field: `subsidiary-${i}-repaymentBank`, message: `子公司${i + 1}还款户开户行必填` });
        else {
          const expectedBank = this.getDefaultRepaymentBank(state.coreInfo.clearingMethod);
          if (expectedBank && !s.repaymentBank.includes(expectedBank)) {
            errors.push({ field: `subsidiary-${i}-repaymentBank`, message: `子公司${i + 1}还款户开户行与清分方式不匹配，应包含"${expectedBank}"` });
          }
        }
        if (!s.repaymentUnionCode.trim()) errors.push({ field: `subsidiary-${i}-repaymentUnionCode`, message: `子公司${i + 1}还款户联行号必填` });
        else if (!/^\d{12}$/.test(s.repaymentUnionCode)) errors.push({ field: `subsidiary-${i}-repaymentUnionCode`, message: `子公司${i + 1}联行号必须为12位数字` });
      }
    });

    return errors;
  },

  validateBankInfo(state: FormState): ValidationError[] {
    const errors: ValidationError[] = [];
    const b = state.bankInfo;
    const latestDueDate = getLatestDueDate(b.creditEndDate);
    if (!b.branchName.trim()) errors.push({ field: 'branchName', message: '请输入支行名称' });
    if (!b.branchCreditCode.trim()) errors.push({ field: 'branchCreditCode', message: '请输入支行社会信用代码' });
    else if (!/^([0-9A-HJ-NPQRTUWXY]{2}\d{6}[0-9A-HJ-NPQRTUWXY]{10}|[0-9A-HJ-NPQRTUWXY]{18})$/i.test(b.branchCreditCode))
      errors.push({ field: 'branchCreditCode', message: '统一社会信用代码格式不正确（18位）' });
    if (!b.creditStartDate) errors.push({ field: 'creditStartDate', message: '请选择授信起始日' });
    if (!b.creditEndDate) errors.push({ field: 'creditEndDate', message: '请选择授信终止日' });
    if (b.creditStartDate && b.creditEndDate && b.creditEndDate < b.creditStartDate)
      errors.push({ field: 'creditEndDate', message: '授信终止日必须大于等于起始日' });
    if (!latestDueDate) errors.push({ field: 'creditEndDate', message: '授信终止日无效，无法计算最晚业务到期日' });
    if (b.creditEndDate && latestDueDate && latestDueDate < b.creditEndDate)
      errors.push({ field: 'creditEndDate', message: '最晚业务到期日必须大于等于终止日' });
    if (!b.managerName.trim()) errors.push({ field: 'managerName', message: '请输入客户经理姓名' });
    if (!b.managerPhone.trim()) errors.push({ field: 'managerPhone', message: '请输入客户经理手机号' });
    else if (!/^1[3-9]\d{9}$/.test(b.managerPhone))
      errors.push({ field: 'managerPhone', message: '手机号格式不正确' });
    if (!b.branchRegion.trim()) errors.push({ field: 'branchRegion', message: '请输入支行所在省市区' });
    if (!b.branchAddress.trim()) errors.push({ field: 'branchAddress', message: '请输入支行详细地址' });
    return errors;
  },
};
