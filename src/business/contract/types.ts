import type { FormState } from '../../types/form';

export type ContractTemplateKey =
  | 'contract'
  | 'quotaRate'
  | 'investor'
  | 'buyerInterestNonGroup'
  | 'buyerInterestGroupSeparate'
  | 'buyerInterestGroupUnified'
  | 'clearingAccount'
  | 'coreEnterpriseList'
  | 'attachment6';

export interface ProtocolItemConfig {
  name: string;
  status: string;
  statusColor: string;
  signatory?: string;
  condition?: boolean;
}

export interface ContractStrategy {
  /** 业务线显示名称 */
  displayName: string;
  /** 模板基础目录名 */
  templateDir: string;
  /** 获取模板完整路径 */
  getTemplatePath(templateKey: string): string;
  /** 生成合同变量映射 */
  getReplacements(state: FormState): Record<string, string>;
  /** 生成结果页协议清单 */
  getProtocolList(state: FormState): ProtocolItemConfig[];
  /** 判断是否需要生成清分账户说明 */
  requiresClearingAccountDoc(clearingMethod: string): boolean;
}
