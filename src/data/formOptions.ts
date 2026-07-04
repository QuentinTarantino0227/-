export const CLEARING_METHODS = [
  { value: '推荐：中信清分', label: '推荐：中信清分', hint: '还款账户信息由银行线上系统处理，还款函中无需填写具体账户' },
  { value: '线上：中信过渡户清分', label: '线上：中信过渡户清分', hint: '还款函中的【账号】将自动取自「核企还款账户」' },
  { value: '线上：交e保清分', label: '线上：交e保清分', hint: '还款函中的【开户行】将自动取自「还款户开户行」' },
  { value: '线上：工行e企付', label: '线上：工行e企付', hint: '还款函中的【联行号】将自动取自「还款户联行号」' },
  { value: '实体户：农业银行', label: '实体户：农业银行', hint: '还款函将完整填写账户信息，均取自本页已填字段' },
  { value: '实体户：交行银企付', label: '实体户：交行银企付', hint: '还款函将完整填写账户信息，均取自本页已填字段' },
  { value: '实体户：工商银行', label: '实体户：工商银行', hint: '还款函将完整填写账户信息，均取自本页已填字段' },
  { value: '实体户：中国银行', label: '实体户：中国银行', hint: '还款函将完整填写账户信息，均取自本页已填字段' },
  { value: '实体户：中信银行', label: '实体户：中信银行', hint: '还款函将完整填写账户信息，均取自本页已填字段' },
];

export const INTEREST_PAYER_OPTIONS = [
  { value: '仅卖方付息', label: '仅卖方付息' },
  { value: '需要买方付息', label: '需要买方付息' },
];

export const BUYER_INTEREST_OPTIONS = [
  { value: '子公司各自付息费', label: '子公司各自付息费' },
  { value: '集团统一付息', label: '集团统一付息' },
];

export const YES_NO_OPTIONS = [
  { value: '是', label: '是' },
  { value: '否', label: '否' },
];

export const FIRST_TRADE_BACK_OPTIONS = [
  { value: '可提供一手发票', label: '可提供一手发票' },
  { value: '后补一手发票（需出具说明）', label: '后补一手发票（需出具说明）' },
];

export const PROJECT_TYPE_OPTIONS = [
  { value: '新增额度', label: '新增额度' },
  { value: '新增额度-并入混合额度', label: '新增额度-并入混合额度' },
  { value: '原有额度-授信续期/增额', label: '原有额度-授信续期/增额' },
  { value: '原有额度-参数修改（不涉及额度、期限）', label: '原有额度-参数修改（不涉及额度、期限）' },
];
