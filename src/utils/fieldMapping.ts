/**
 * 变量英文名称映射表
 * 所有字段按模块分组，英文名称全局唯一、简短、易懂
 * 后续 Excel 导出、合同模板均使用此映射作为变量索引
 */

// ============================================================
// 1. 核企信息 (CoreInfo)
// ============================================================
export const CORE_INFO_FIELDS = {
  initiatorName: '额度发起方名称',
  creditCode: '统一社会信用代码',
  cloudQuota: '云信额度（万元）',
  isGroupMode: '是否集团模式',
  productType: '产品类型',
  cooperationBank: '合作银行',
  cooperationMode: '合作模式',
  clearingMethod: '清分方式',
  repaymentAccount: '核企还款账户',
  repaymentBank: '还款户开户行',
  repaymentUnionCode: '还款户联行号',
  interestPayer: '付息方',
  buyerInterestDetail: '买方付息详情',
  confirmationMode: '确权模式',
  confirmationPost: '确权岗位',
  firstTradeBack: '一手贸背',
} as const;

// ============================================================
// 2. 集团模式 - 子公司 (Subsidiary)
// ============================================================
export const SUBSIDIARY_FIELDS = {
  subName: '子公司名称',
  subQuota: '分配额度（万元）',
  subCreditCode: '社会信用代码',
  subRepaymentAccount: '核企还款账户',
  subRepaymentBank: '还款户开户行',
  subRepaymentUnionCode: '还款户联行号',
} as const;

// ============================================================
// 3. 银行信息 (BankInfo)
// ============================================================
export const BANK_INFO_FIELDS = {
  branchName: '支行名称（投资人）',
  branchCreditCode: '支行社会信用代码',
  creditStartDate: '授信起始日',
  creditEndDate: '授信终止日',
  managerName: '客户经理姓名',
  managerPhone: '客户经理手机号',
  branchRegion: '支行所在省市区',
  branchProvince: '支行所在省',
  branchCity: '支行所在市',
  branchArea: '支行所在区',
  branchAddress: '支行详细地址',
  settlementAccount: '交行结算账户',
  settlementBank: '结算账户开户行',
} as const;

// ============================================================
// 4. 收款户信息 (ReceiveAccountInfo)
// ============================================================
export const RECEIVE_ACCOUNT_FIELDS = {
  recvAccountName: '收款户名',
  recvAccountNumber: '收款账号',
  recvBankName: '开户行',
  recvUnionCode: '联行号',
} as const;

// ============================================================
// 5. 利率信息 (RateInfo)
// ============================================================
export const RATE_INFO_FIELDS = {
  financingRate: '银行融资利率（预计）',
  factoringFee: '银行保理手续费（预计）',
  platformFee: '中企云链平台手续费平台综合服务费率',
} as const;

// ============================================================
// 6. 其他信息 (OtherInfo)
// ============================================================
export const OTHER_INFO_FIELDS = {
  quotaShortName: '额度简称（自定义）',
} as const;

// ============================================================
// 7. 合同模板衍生字段（由上述字段计算/转换得到）
// ============================================================
export const CONTRACT_DERIVED_FIELDS = {
  protocolVersion: '三方协议版本',
  subTableHtml: '子公司列表HTML',
  rlPrefix: '还款函_抬头前缀',
  rlClearingMethod: '还款函_清分方式',
  rlAccountName: '还款函_账户名称',
  rlAccount: '还款函_账号',
  rlBankName: '还款函_开户行',
  rlUnionCode: '还款函_联行号',
  rlDate: '还款函_日期',
  signatory: '核心企业签约主体',
  conCreditStartDate: '合同授信起始日',
  conCreditEndDate: '合同授信终止日',
  anchorAccountName: '核心企业账户名称',
  anchorAccountBank: '核心企业账户开户行',
  anchorAccountNo: '核心企业账户账号',
  coanchorAccountName: '共同买方账户名称',
  coanchorAccountBank: '共同买方账户开户行',
  coanchorAccountNo: '共同买方账户账号',
  latestDueDate: '最晚业务到期日',
  // 核企清单-子公司社会信用代码（consub1~consub149，用于额度利率确认函/附件5-核心企业清单）
  consub1_subCreditCode: '核企清单-子1号',
  consub2_subCreditCode: '核企清单-子2号',
  consub3_subCreditCode: '核企清单-子3号',
  consub4_subCreditCode: '核企清单-子4号',
  consub5_subCreditCode: '核企清单-子5号',
  consub6_subCreditCode: '核企清单-子6号',
  consub7_subCreditCode: '核企清单-子7号',
  consub8_subCreditCode: '核企清单-子8号',
  consub9_subCreditCode: '核企清单-子9号',
  consub10_subCreditCode: '核企清单-子10号',
  consub11_subCreditCode: '核企清单-子11号',
  consub12_subCreditCode: '核企清单-子12号',
  consub13_subCreditCode: '核企清单-子13号',
  consub14_subCreditCode: '核企清单-子14号',
  consub15_subCreditCode: '核企清单-子15号',
  consub16_subCreditCode: '核企清单-子16号',
  consub17_subCreditCode: '核企清单-子17号',
  consub18_subCreditCode: '核企清单-子18号',
  consub19_subCreditCode: '核企清单-子19号',
  consub20_subCreditCode: '核企清单-子20号',
  consub21_subCreditCode: '核企清单-子21号',
  consub22_subCreditCode: '核企清单-子22号',
  consub23_subCreditCode: '核企清单-子23号',
  consub24_subCreditCode: '核企清单-子24号',
  consub25_subCreditCode: '核企清单-子25号',
  consub26_subCreditCode: '核企清单-子26号',
  consub27_subCreditCode: '核企清单-子27号',
  consub28_subCreditCode: '核企清单-子28号',
  consub29_subCreditCode: '核企清单-子29号',
  consub30_subCreditCode: '核企清单-子30号',
  consub31_subCreditCode: '核企清单-子31号',
  consub32_subCreditCode: '核企清单-子32号',
  consub33_subCreditCode: '核企清单-子33号',
  consub34_subCreditCode: '核企清单-子34号',
  consub35_subCreditCode: '核企清单-子35号',
  consub36_subCreditCode: '核企清单-子36号',
  consub37_subCreditCode: '核企清单-子37号',
  consub38_subCreditCode: '核企清单-子38号',
  consub39_subCreditCode: '核企清单-子39号',
  consub40_subCreditCode: '核企清单-子40号',
  consub41_subCreditCode: '核企清单-子41号',
  consub42_subCreditCode: '核企清单-子42号',
  consub43_subCreditCode: '核企清单-子43号',
  consub44_subCreditCode: '核企清单-子44号',
  consub45_subCreditCode: '核企清单-子45号',
  consub46_subCreditCode: '核企清单-子46号',
  consub47_subCreditCode: '核企清单-子47号',
  consub48_subCreditCode: '核企清单-子48号',
  consub49_subCreditCode: '核企清单-子49号',
  consub50_subCreditCode: '核企清单-子50号',
  consub51_subCreditCode: '核企清单-子51号',
  consub52_subCreditCode: '核企清单-子52号',
  consub53_subCreditCode: '核企清单-子53号',
  consub54_subCreditCode: '核企清单-子54号',
  consub55_subCreditCode: '核企清单-子55号',
  consub56_subCreditCode: '核企清单-子56号',
  consub57_subCreditCode: '核企清单-子57号',
  consub58_subCreditCode: '核企清单-子58号',
  consub59_subCreditCode: '核企清单-子59号',
  consub60_subCreditCode: '核企清单-子60号',
  consub61_subCreditCode: '核企清单-子61号',
  consub62_subCreditCode: '核企清单-子62号',
  consub63_subCreditCode: '核企清单-子63号',
  consub64_subCreditCode: '核企清单-子64号',
  consub65_subCreditCode: '核企清单-子65号',
  consub66_subCreditCode: '核企清单-子66号',
  consub67_subCreditCode: '核企清单-子67号',
  consub68_subCreditCode: '核企清单-子68号',
  consub69_subCreditCode: '核企清单-子69号',
  consub70_subCreditCode: '核企清单-子70号',
  consub71_subCreditCode: '核企清单-子71号',
  consub72_subCreditCode: '核企清单-子72号',
  consub73_subCreditCode: '核企清单-子73号',
  consub74_subCreditCode: '核企清单-子74号',
  consub75_subCreditCode: '核企清单-子75号',
  consub76_subCreditCode: '核企清单-子76号',
  consub77_subCreditCode: '核企清单-子77号',
  consub78_subCreditCode: '核企清单-子78号',
  consub79_subCreditCode: '核企清单-子79号',
  consub80_subCreditCode: '核企清单-子80号',
  consub81_subCreditCode: '核企清单-子81号',
  consub82_subCreditCode: '核企清单-子82号',
  consub83_subCreditCode: '核企清单-子83号',
  consub84_subCreditCode: '核企清单-子84号',
  consub85_subCreditCode: '核企清单-子85号',
  consub86_subCreditCode: '核企清单-子86号',
  consub87_subCreditCode: '核企清单-子87号',
  consub88_subCreditCode: '核企清单-子88号',
  consub89_subCreditCode: '核企清单-子89号',
  consub90_subCreditCode: '核企清单-子90号',
  consub91_subCreditCode: '核企清单-子91号',
  consub92_subCreditCode: '核企清单-子92号',
  consub93_subCreditCode: '核企清单-子93号',
  consub94_subCreditCode: '核企清单-子94号',
  consub95_subCreditCode: '核企清单-子95号',
  consub96_subCreditCode: '核企清单-子96号',
  consub97_subCreditCode: '核企清单-子97号',
  consub98_subCreditCode: '核企清单-子98号',
  consub99_subCreditCode: '核企清单-子99号',
  consub100_subCreditCode: '核企清单-子100号',
  consub101_subCreditCode: '核企清单-子101号',
  consub102_subCreditCode: '核企清单-子102号',
  consub103_subCreditCode: '核企清单-子103号',
  consub104_subCreditCode: '核企清单-子104号',
  consub105_subCreditCode: '核企清单-子105号',
  consub106_subCreditCode: '核企清单-子106号',
  consub107_subCreditCode: '核企清单-子107号',
  consub108_subCreditCode: '核企清单-子108号',
  consub109_subCreditCode: '核企清单-子109号',
  consub110_subCreditCode: '核企清单-子110号',
  consub111_subCreditCode: '核企清单-子111号',
  consub112_subCreditCode: '核企清单-子112号',
  consub113_subCreditCode: '核企清单-子113号',
  consub114_subCreditCode: '核企清单-子114号',
  consub115_subCreditCode: '核企清单-子115号',
  consub116_subCreditCode: '核企清单-子116号',
  consub117_subCreditCode: '核企清单-子117号',
  consub118_subCreditCode: '核企清单-子118号',
  consub119_subCreditCode: '核企清单-子119号',
  consub120_subCreditCode: '核企清单-子120号',
  consub121_subCreditCode: '核企清单-子121号',
  consub122_subCreditCode: '核企清单-子122号',
  consub123_subCreditCode: '核企清单-子123号',
  consub124_subCreditCode: '核企清单-子124号',
  consub125_subCreditCode: '核企清单-子125号',
  consub126_subCreditCode: '核企清单-子126号',
  consub127_subCreditCode: '核企清单-子127号',
  consub128_subCreditCode: '核企清单-子128号',
  consub129_subCreditCode: '核企清单-子129号',
  consub130_subCreditCode: '核企清单-子130号',
  consub131_subCreditCode: '核企清单-子131号',
  consub132_subCreditCode: '核企清单-子132号',
  consub133_subCreditCode: '核企清单-子133号',
  consub134_subCreditCode: '核企清单-子134号',
  consub135_subCreditCode: '核企清单-子135号',
  consub136_subCreditCode: '核企清单-子136号',
  consub137_subCreditCode: '核企清单-子137号',
  consub138_subCreditCode: '核企清单-子138号',
  consub139_subCreditCode: '核企清单-子139号',
  consub140_subCreditCode: '核企清单-子140号',
  consub141_subCreditCode: '核企清单-子141号',
  consub142_subCreditCode: '核企清单-子142号',
  consub143_subCreditCode: '核企清单-子143号',
  consub144_subCreditCode: '核企清单-子144号',
  consub145_subCreditCode: '核企清单-子145号',
  consub146_subCreditCode: '核企清单-子146号',
  consub147_subCreditCode: '核企清单-子147号',
  consub148_subCreditCode: '核企清单-子148号',
  consub149_subCreditCode: '核企清单-子149号',
} as const;

// ============================================================
// 汇总：所有字段映射（用于快速查找）
// ============================================================
export const ALL_FIELD_MAPPING: Record<string, string> = {
  ...CORE_INFO_FIELDS,
  ...SUBSIDIARY_FIELDS,
  ...BANK_INFO_FIELDS,
  ...RECEIVE_ACCOUNT_FIELDS,
  ...RATE_INFO_FIELDS,
  ...OTHER_INFO_FIELDS,
  ...CONTRACT_DERIVED_FIELDS,
};

// 反向映射：中文名 → 英文名
export const REVERSE_FIELD_MAPPING: Record<string, string> = Object.fromEntries(
  Object.entries(ALL_FIELD_MAPPING).map(([en, cn]) => [cn, en])
);
