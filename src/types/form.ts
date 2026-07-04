export interface Subsidiary {
  id: string;
  name: string;
  quota: number;
  creditCode: string;
  repaymentAccount: string;
  repaymentBank: string;
  repaymentUnionCode: string;
}

export interface CoreInfo {
  initiatorName: string;
  creditCode: string;
  cloudQuota: number;
  isGroupMode: '是' | '否' | '';
  productType: '云信' | '';
  cooperationBank: '农业银行' | '工商银行' | '中信银行' | '交通银行' | '中国银行' | '邮储银行' | '其他银行' | '';
  cooperationMode: '直接保理' | '再保理' | '';
  clearingMethod: string;
  repaymentAccount: string;
  repaymentBank: string;
  repaymentUnionCode: string;
  interestPayer: '仅卖方付息' | '需要买方付息' | '';
  buyerInterestDetail: '子公司各自付息费' | '集团统一付息' | '';
  firstTradeBack?: '可提供一手发票' | '后补一手发票（需出具说明）' | '';
  confirmationMode?: '核企直接确权' | '供应商申请-核企确权' | '';
  confirmationPost?: '单岗确权' | '双岗复核' | '';
}

export interface BankInfo {
  branchName: string;
  creditStartDate: string;
  managerName: string;
  creditEndDate: string;
  managerPhone: string;
  branchRegion: string;
  branchProvince: string;
  branchCity: string;
  branchArea: string;
  branchAddress: string;
  initiatorAccount: string;
  initiatorBank: string;
  branchCreditCode: string;
}

export interface ReceiveAccountInfo {
  accountName: string;
  accountNumber: string;
  identifier?: string;
  bankName: string;
  unionCode: string;
}

export type FeeType = '年化' | '非年化';

export interface RateInfo {
  financingRate: number;
  financingRateType: FeeType;
  factoringFee: number;
  factoringFeeType: FeeType;
  platformFee: number;
  platformFeeType: FeeType;
  sponsorFee?: number;
  sponsorFeeType?: FeeType;
}

export interface OtherInfo {
  quotaShortName: string;
  projectType: '新增额度' | '新增额度-并入混合额度' | '原有额度-授信续期/增额' | '原有额度-参数修改（不涉及额度、期限）' | '';
  quotaName: string;
  mixedQuotaName: string;
  adjustmentNo: string;
}

export interface FormState {
  projectId: string;
  createdAt: string;
  status?: string;
  coreInfo: CoreInfo;
  subsidiaries: Subsidiary[];
  bankInfo: BankInfo;
  receiveAccount: ReceiveAccountInfo;
  rateInfo: RateInfo;
  otherInfo: OtherInfo;
}

export type StepKey = 'core' | 'group' | 'bank' | 'account' | 'rate' | 'other';

export interface ValidationError {
  field: string;
  message: string;
}
