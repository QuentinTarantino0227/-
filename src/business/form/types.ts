import type { FormState, ValidationError } from '../../types/form';

export interface ClearingOption {
  value: string;
  label: string;
  hint: string;
}

export interface GroupModeHints {
  yes: string;
  no: string;
}

export interface FormStrategy {
  /** 业务线显示名称 */
  displayName: string;

  // ===== 步骤1：核企信息 =====
  /** 额度字段标签，例如"云信额度（万元）" */
  quotaLabel: string;
  /** 额度输入框 placeholder */
  quotaPlaceholder: string;
  /** 集团模式提示语 */
  groupModeHints: GroupModeHints;
  /** 清分方式可选项 */
  clearingOptions: ClearingOption[];
  /** 当前清分方式是否需要填写还款账户 */
  requiresRepaymentAccount(clearingMethod: string): boolean;
  /** 当前清分方式是否需要生成清分账户说明 */
  requiresClearingAccountDoc(clearingMethod: string): boolean;
  /** 根据清分方式获取还款户开户行的默认银行名称，无默认返回空字符串 */
  getDefaultRepaymentBank(clearingMethod: string): string;
  /** 付息方下方提示文案 */
  interestPayerHint: string;
  /** 是否展示并校验一手贸背 */
  showFirstTradeBack: boolean;
  /** 是否展示并校验确权模式/确权岗位 */
  showConfirmationSettings: boolean;

  // ===== 步骤3：银行信息（投资人） =====
  /** 结算账户标签，例如"XXX 的交行结算账户" */
  settlementAccountLabel(initiatorName: string): string;

  // ===== 步骤4：账户信息 =====
  /** 收款户顶部提示语 */
  receiveAccountNotice(bankDisplayName: string): string;

  // ===== 步骤2：集团模式 =====
  /** 是否显示子公司清单中的还款账户列 */
  showSubsidiaryRepaymentColumns: boolean;

  // ===== 校验 =====
  /** 校验核企信息步骤 */
  validateCoreInfo(state: FormState): ValidationError[];
  /** 校验集团模式步骤 */
  validateGroupMode(state: FormState): ValidationError[];
  /** 校验银行信息步骤 */
  validateBankInfo(state: FormState): ValidationError[];
}
