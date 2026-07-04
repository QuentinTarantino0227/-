export interface QuotaItem {
  name: string;
  category: string;
  code?: string;
}

export interface CheckQuotaResult {
  ok: boolean;
  message: string;
  hasData?: boolean;
}

/**
 * 查表验证额度状态 / 额度简称唯一性校验
 * 离线版本：始终返回通过
 */
export async function checkQuotaInDb(
  _initiatorName: string,
  _projectType: string,
  _quotaShortName?: string,
  _bankCategory?: string,
  _productType: string = '云信'
): Promise<CheckQuotaResult> {
  return { ok: true, message: '' };
}

/**
 * 根据额度发起方和合作银行查询额度名称列表（原有额度类业务用）
 * 离线版本：返回空数组
 */
export async function queryQuotaNames(
  _initiatorName: string,
  _bankCategory?: string,
  _productType: string = '云信'
): Promise<QuotaItem[]> {
  return [];
}

/**
 * 根据额度发起方查询已有混合额度名称列表（新增额度-并入混合额度用）
 * 离线版本：返回空数组
 */
export async function queryMixedQuotaNames(
  _initiatorName: string,
  _productType: string = '云信'
): Promise<QuotaItem[]> {
  return [];
}
