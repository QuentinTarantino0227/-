import type { FormState, Subsidiary } from '../types/form';
import { format } from 'date-fns';
import { numberToChinese } from './numberToChinese';
import { getLatestDueDate, getQuotaCategory, getClearingPlanName } from './branchLogic';

export interface ExcelRow {
  step: string;
  enName: string;
  cnName: string;
  value: string;
}

// 计算实际需要输出的子公司数量：母公司（索引0）始终输出，去掉尾部无数据的空槽位
function getEffectiveSubCount(subsidiaries: Subsidiary[]): number {
  if (!subsidiaries || subsidiaries.length === 0) return 1;
  let lastIndex = 0;
  for (let i = subsidiaries.length - 1; i > 0; i--) {
    const s = subsidiaries[i];
    if (s.name.trim() || s.quota || s.creditCode.trim()) {
      lastIndex = i;
      break;
    }
  }
  return lastIndex + 1;
}

export function getEffectiveQuotaName(state: FormState): string {
  const { projectType, quotaShortName, quotaName, mixedQuotaName } = state.otherInfo;

  if (projectType === '新增额度') {
    return quotaShortName.trim() || '未命名';
  }
  if (projectType === '新增额度-并入混合额度') {
    return mixedQuotaName.trim() || '未命名';
  }
  if (projectType === '原有额度-授信续期/增额' || projectType === '原有额度-参数修改（不涉及额度、期限）') {
    return quotaName.trim() || '未命名';
  }

  // 未知/空立项类型：保持旧优先级兜底
  return quotaShortName.trim()
    || quotaName.trim()
    || mixedQuotaName.trim()
    || '未命名';
}

export function generateExcelData(
  state: FormState,
  creator?: string,
  creatorAffiliation?: string,
  feeSchemeNo?: string
): ExcelRow[] {
  const { coreInfo, subsidiaries, bankInfo, receiveAccount, rateInfo, otherInfo } = state;
  // 收款户开户行缺省时，默认取步骤4的支行名称
  const recvBankName = receiveAccount.bankName.trim() || bankInfo.branchName;
  const rows: ExcelRow[] = [];

  // 立项基本信息
  rows.push({ step: '0.立项信息', enName: 'projectId', cnName: '业务编号', value: state.projectId || '' });
  rows.push({ step: '0.立项信息', enName: 'createdAt', cnName: '创建时间', value: state.createdAt || '' });
  rows.push({ step: '0.立项信息', enName: 'feeSchemeNo', cnName: '费用方案编号', value: feeSchemeNo || '' });
  rows.push({ step: '0.立项信息', enName: 'projectCreator', cnName: '立项人', value: creator || '' });
  rows.push({ step: '0.立项信息', enName: 'projectInstitution', cnName: '立项机构', value: creatorAffiliation || '' });

  // 额度信息（步骤1）
  const s1 = '1.额度信息';
  rows.push({ step: s1, enName: 'initiatorName', cnName: '额度发起方名称', value: coreInfo.initiatorName });
  rows.push({ step: s1, enName: 'quotaShortName', cnName: '额度简称（自定义）', value: otherInfo.quotaShortName });
  rows.push({ step: s1, enName: 'projectType', cnName: '立项类型', value: otherInfo.projectType });

  rows.push({ step: s1, enName: 'quotaName', cnName: '额度名称', value: otherInfo.quotaName });
  rows.push({ step: s1, enName: 'mixedQuotaName', cnName: '并入现有混合额度', value: otherInfo.mixedQuotaName });
  // feeSchemeNo 已移至 0.立项信息

  // 核企信息（步骤2）
  const s2 = '2.核企信息';
  rows.push({ step: s2, enName: 'creditCode', cnName: '统一社会信用代码', value: coreInfo.creditCode });
  rows.push({ step: s2, enName: 'cloudQuota', cnName: '云信额度（万元）', value: String(coreInfo.cloudQuota) });
  rows.push({ step: s2, enName: 'isGroupMode', cnName: '是否集团模式', value: coreInfo.isGroupMode });
  rows.push({ step: s2, enName: 'productType', cnName: '产品类型', value: coreInfo.productType });
  rows.push({ step: s2, enName: 'cooperationBank', cnName: '合作银行', value: coreInfo.cooperationBank });
  rows.push({ step: s2, enName: 'cooperationMode', cnName: '合作模式', value: coreInfo.cooperationMode });
  rows.push({ step: s2, enName: 'clearingMethod', cnName: '清分方式', value: coreInfo.clearingMethod });
  rows.push({ step: s2, enName: 'repaymentAccount', cnName: '核企还款账户', value: coreInfo.repaymentAccount });
  rows.push({ step: s2, enName: 'repaymentBank', cnName: '还款户开户行', value: coreInfo.repaymentBank });
  rows.push({ step: s2, enName: 'repaymentUnionCode', cnName: '还款户联行号', value: coreInfo.repaymentUnionCode });
  rows.push({ step: s2, enName: 'interestPayer', cnName: '付息方', value: coreInfo.interestPayer });
  rows.push({ step: s2, enName: 'buyerInterestDetail', cnName: '买方付息详情', value: coreInfo.buyerInterestDetail });
  rows.push({ step: s2, enName: 'confirmationMode', cnName: '确权模式', value: coreInfo.confirmationMode || '' });
  rows.push({ step: s2, enName: 'confirmationPost', cnName: '确权岗位', value: coreInfo.confirmationPost || '' });
  rows.push({ step: s2, enName: 'firstTradeBack', cnName: '一手贸背', value: coreInfo.firstTradeBack || '' });

  // 集团模式（步骤3）
  const s3 = '3.集团模式';
  if (coreInfo.isGroupMode === '是') {
    const allocatedQuota = subsidiaries.reduce((sum, s) => sum + (s.quota || 0), 0);
    const tempNoQuotaAllocation = coreInfo.cloudQuota - allocatedQuota;
    rows.push({ step: s3, enName: 'tempNoQuotaAllocation', cnName: '暂不分配额度（万元）', value: String(tempNoQuotaAllocation) });
    subsidiaries.forEach((s, i) => {
      const prefix = `sub${i}`;
      rows.push({ step: s3, enName: `${prefix}_subName`, cnName: `子公司${i}-名称`, value: s.name });
      rows.push({ step: s3, enName: `${prefix}_subQuota`, cnName: `子公司${i}-分配额度（万元）`, value: String(s.quota) });
      rows.push({ step: s3, enName: `${prefix}_subCreditCode`, cnName: `子公司${i}-社会信用代码`, value: s.creditCode });
      rows.push({ step: s3, enName: `${prefix}_subRepaymentAccount`, cnName: `子公司${i}-核企还款账户`, value: s.repaymentAccount });
      rows.push({ step: s3, enName: `${prefix}_subRepaymentBank`, cnName: `子公司${i}-还款户开户行`, value: s.repaymentBank });
      rows.push({ step: s3, enName: `${prefix}_subRepaymentUnionCode`, cnName: `子公司${i}-还款户联行号`, value: s.repaymentUnionCode });
    });
  } else {
    rows.push({ step: s3, enName: 'groupModeSkipped', cnName: '跳过集团模式详情', value: '非集团模式（已跳过）' });
  }

  // 银行信息（步骤4）
  const s4 = '4.银行信息';
  rows.push({ step: s4, enName: 'branchName', cnName: '支行名称（投资人）', value: bankInfo.branchName });
  rows.push({ step: s4, enName: 'branchCreditCode', cnName: '支行社会信用代码', value: bankInfo.branchCreditCode });
  rows.push({ step: s4, enName: 'creditStartDate', cnName: '授信起始日', value: bankInfo.creditStartDate });
  rows.push({ step: s4, enName: 'creditEndDate', cnName: '授信终止日', value: bankInfo.creditEndDate });
  rows.push({ step: s4, enName: 'latestDueDate', cnName: '最晚业务到期日', value: getLatestDueDate(bankInfo.creditEndDate) });
  rows.push({ step: s4, enName: 'managerName', cnName: '客户经理姓名', value: bankInfo.managerName });
  rows.push({ step: s4, enName: 'managerPhone', cnName: '客户经理手机号', value: bankInfo.managerPhone });
  rows.push({ step: s4, enName: 'branchRegion', cnName: '支行所在省市区', value: bankInfo.branchRegion });
  rows.push({ step: s4, enName: 'branchProvince', cnName: '支行所在省', value: bankInfo.branchProvince });
  rows.push({ step: s4, enName: 'branchCity', cnName: '支行所在市', value: bankInfo.branchCity });
  rows.push({ step: s4, enName: 'branchArea', cnName: '支行所在区', value: bankInfo.branchArea });
  rows.push({ step: s4, enName: 'branchAddress', cnName: '支行详细地址', value: bankInfo.branchAddress });
  rows.push({ step: s4, enName: 'settlementAccount', cnName: '交行结算账户', value: bankInfo.initiatorAccount });
  rows.push({ step: s4, enName: 'settlementBank', cnName: '结算账户开户行', value: bankInfo.initiatorBank });

  // 收款户信息（账户信息）
  const s5 = '5.收款户信息';
  rows.push({ step: s5, enName: 'recvAccountName', cnName: '收款户名', value: receiveAccount.accountName });
  rows.push({ step: s5, enName: 'recvAccountNumber', cnName: '收款账号', value: receiveAccount.accountNumber });
  rows.push({ step: s5, enName: 'recvBankName', cnName: '开户行', value: recvBankName });
  rows.push({ step: s5, enName: 'recvUnionCode', cnName: '联行号', value: receiveAccount.unionCode });

  // 利率信息（步骤6）
  const s6 = '6.利率信息';
  rows.push({ step: s6, enName: 'financingRate', cnName: '银行融资利率（预计）', value: `${rateInfo.financingRate}%（${rateInfo.financingRateType || '年化'}）` });
  rows.push({ step: s6, enName: 'factoringFee', cnName: '银行保理手续费（预计）', value: `${rateInfo.factoringFee}%（${rateInfo.factoringFeeType || '非年化'}）` });
  rows.push({ step: s6, enName: 'platformFee', cnName: '中企云链平台手续费平台综合服务费率', value: `${rateInfo.platformFee}%（${rateInfo.platformFeeType || '年化'}）` });

  // 合同参数（步骤7）
  const s7 = '7.合同参数';
  const sub0Quota = subsidiaries[0]?.quota || 0;
  const isGroup = coreInfo.isGroupMode === '是';
  const allocatedQuota = subsidiaries.reduce((sum, s) => sum + (s.quota || 0), 0);
  const tempNoQuotaAllocation = coreInfo.cloudQuota - allocatedQuota;

  let signatory = '';
  if (!isGroup) {
    signatory = '√核心企业/×共同买方';
  } else if (sub0Quota === coreInfo.cloudQuota) {
    signatory = '√核心企业/×共同买方';
  } else if (sub0Quota === 0) {
    signatory = '×核心企业/√共同买方';
  } else {
    signatory = '√核心企业/√共同买方';
  }

  rows.push({ step: s7, enName: 'signatory', cnName: '核心企业签约主体', value: signatory });
  rows.push({ step: s7, enName: 'quotaLetterGroupMode', cnName: '额度函-集团模式', value: isGroup ? '集团企业' : '核心企业' });
  rows.push({ step: s7, enName: 'conCreditStartDate', cnName: '合同授信起始日', value: bankInfo.creditStartDate ? format(new Date(bankInfo.creditStartDate), 'yyyy年MM月dd日') : '' });
  rows.push({ step: s7, enName: 'conCreditEndDate', cnName: '合同授信终止日', value: bankInfo.creditEndDate ? format(new Date(bankInfo.creditEndDate), 'yyyy年MM月dd日') : '' });
  rows.push({ step: s7, enName: 'anchorAccountName', cnName: '核心企业账户名称', value: !isGroup || sub0Quota > 0 ? coreInfo.initiatorName : '/' });
  rows.push({ step: s7, enName: 'anchorAccountBank', cnName: '核心企业账户开户行', value: !isGroup || sub0Quota > 0 ? bankInfo.initiatorBank : '/' });
  rows.push({ step: s7, enName: 'anchorAccountNo', cnName: '核心企业账户账号', value: !isGroup || sub0Quota > 0 ? bankInfo.initiatorAccount : '/' });
  rows.push({ step: s7, enName: 'coanchorAccountName', cnName: '共同买方账户名称', value: isGroup && sub0Quota < coreInfo.cloudQuota ? coreInfo.initiatorName : '/' });
  rows.push({ step: s7, enName: 'coanchorAccountBank', cnName: '共同买方账户开户行', value: isGroup && sub0Quota < coreInfo.cloudQuota ? bankInfo.initiatorBank : '/' });
  rows.push({ step: s7, enName: 'coanchorAccountNo', cnName: '共同买方账户账号', value: isGroup && sub0Quota < coreInfo.cloudQuota ? bankInfo.initiatorAccount : '/' });
  rows.push({ step: s7, enName: 'cloudQuotaChinese', cnName: '云信额度（大写）', value: numberToChinese(coreInfo.cloudQuota) });
  rows.push({ step: s7, enName: 'shitNO', cnName: '投资人组织机构代码', value: bankInfo.branchCreditCode.substring(8, 17) });
  rows.push({ step: s7, enName: 'conrecvAccountName', cnName: '信息表-收款账户', value: receiveAccount.accountNumber });

  // ===== 额度利率确认函新增参数 =====
  // 仅输出实际存在的子公司变量，避免生成 149 个空槽位
  const effectiveSubCount = getEffectiveSubCount(subsidiaries);
  for (let i = 0; i < effectiveSubCount; i++) {
    // consubX_subName
    if (i === 0) {
      rows.push({ step: s7, enName: 'consub0_subName', cnName: '额度函-母公司', value: coreInfo.initiatorName });
    } else {
      const sub = subsidiaries[i];
      rows.push({ step: s7, enName: `consub${i}_subName`, cnName: `额度函-子公司${i}`, value: sub && sub.name.trim() ? sub.name : '-' });
    }

    // consubX_subQuota
    if (i === 0) {
      rows.push({ step: s7, enName: 'consub0_subQuota', cnName: '额度函-母公司额度', value: isGroup ? String(subsidiaries[0]?.quota || 0) : String(coreInfo.cloudQuota) });
    } else {
      const sub = subsidiaries[i];
      rows.push({ step: s7, enName: `consub${i}_subQuota`, cnName: `额度函-子公司额度${i}`, value: sub && sub.quota ? String(sub.quota) : '-' });
    }

    // conrateX
    if (i === 0) {
      rows.push({ step: s7, enName: 'conrate0', cnName: '额度函-银行利率0', value: `${rateInfo.financingRate}%（${rateInfo.financingRateType || '年化'}）` });
    } else {
      const sub = subsidiaries[i];
      rows.push({ step: s7, enName: `conrate${i}`, cnName: `额度函-银行利率${i}`, value: sub && sub.quota ? `${rateInfo.financingRate}%（${rateInfo.financingRateType || '年化'}）` : '-' });
    }

    // conbankfeeX
    if (i === 0) {
      rows.push({ step: s7, enName: 'conbankfee0', cnName: '额度函-银行费率0', value: `${rateInfo.factoringFee}%（${rateInfo.factoringFeeType || '非年化'}）` });
    } else {
      const sub = subsidiaries[i];
      rows.push({ step: s7, enName: `conbankfee${i}`, cnName: `额度函-银行费率${i}`, value: sub && sub.quota ? `${rateInfo.factoringFee}%（${rateInfo.factoringFeeType || '非年化'}）` : '-' });
    }

    // conplatfeeX
    if (i === 0) {
      rows.push({ step: s7, enName: 'conplatfee0', cnName: '额度函-平台费0', value: `${rateInfo.platformFee}%（${rateInfo.platformFeeType || '年化'}）` });
    } else {
      const sub = subsidiaries[i];
      rows.push({ step: s7, enName: `conplatfee${i}`, cnName: `额度函-平台费${i}`, value: sub && sub.quota ? `${rateInfo.platformFee}%（${rateInfo.platformFeeType || '年化'}）` : '-' });
    }
  }

  // 额度函-额度简称（按立项类型取值）
  rows.push({ step: s7, enName: 'quotaLetterShortName', cnName: '额度函-额度简称', value: getEffectiveQuotaName(state) });

  // 核企清单-子公司社会信用代码（额度利率确认函 / 附件5-核心企业清单用）
  for (let i = 1; i < effectiveSubCount; i++) {
    const sub = subsidiaries[i];
    rows.push({ step: s7, enName: `consub${i}_subCreditCode`, cnName: `核企清单-子${i}号`, value: sub && sub.creditCode ? sub.creditCode : '-' });
  }

  // ===== 新增参数（9.额度信息）=====
  const s9 = '9.额度信息';
  const applicationMode = coreInfo.isGroupMode === '是' ? '集团模式' : '核心企业模式';
  const tradeBackgroundPlan = coreInfo.firstTradeBack === '可提供一手发票'
    ? '一手贸易背景-平台通用'
    : '一手贸易背景-平台通用V2';
  const buyerInterestSupport = coreInfo.interestPayer === '需要买方付息' ? '支持' : '不支持';

  // 额度分配列表
  const allocationNames = coreInfo.isGroupMode === '是'
    ? subsidiaries.map(s => s.name).filter(n => n.trim()).join('、')
    : coreInfo.initiatorName;
  const allocationQuotas = coreInfo.isGroupMode === '是'
    ? subsidiaries.map(s => String(s.quota)).filter(q => q !== '0').join('、')
    : String(coreInfo.cloudQuota);

  rows.push({ step: s9, enName: 'quotaInitiator', cnName: '额度发起企业', value: coreInfo.initiatorName });
  rows.push({ step: s9, enName: 'quotaNameBG', cnName: '额度名称', value: getEffectiveQuotaName(state) });
  rows.push({ step: s9, enName: 'productType2', cnName: '产品类型', value: '基础云信' });
  rows.push({ step: s9, enName: 'sponsor', cnName: '保荐商', value: coreInfo.initiatorName });
  rows.push({ step: s9, enName: 'quotaLogo', cnName: '额度Logo', value: '白板' });
  rows.push({ step: s9, enName: 'quotaCategory', cnName: '额度分类', value: getQuotaCategory(otherInfo.projectType) });
  rows.push({ step: s9, enName: 'adjustmentNo', cnName: '调整单编号', value: otherInfo.adjustmentNo });
  rows.push({ step: s9, enName: 'quotaUsageMode', cnName: '额度使用方式', value: '循环' });
  rows.push({ step: s9, enName: 'applicationMode', cnName: '应用模式', value: applicationMode });
  rows.push({ step: s9, enName: 'firstTradeBackground', cnName: '一手贸易背景', value: '需要' });
  rows.push({ step: s9, enName: 'tradeBackgroundPlan', cnName: '贸易背景方案', value: tradeBackgroundPlan });
  rows.push({ step: s9, enName: 'tradeBackgroundVersion', cnName: '贸易背景方案编号/版本', value: '' });
  rows.push({ step: s9, enName: 'transferRestriction', cnName: '限制流转', value: '不限制' });
  rows.push({ step: s9, enName: 'restrictionLevel', cnName: '限制层级', value: '' });
  rows.push({ step: s9, enName: 'feePlanName', cnName: '费用方案名称', value: feeSchemeNo || '' });
  rows.push({ step: s9, enName: 'cloudInfoAuth', cnName: '云信信息授权', value: '不授权' });
  rows.push({ step: s9, enName: 'authorizedInvestor', cnName: '授权投资人', value: '' });
  rows.push({ step: s9, enName: 'creditSource', cnName: '授信来源', value: '交行' });
  rows.push({ step: s9, enName: 'creditType', cnName: '授信类型', value: '银行授信' });
  rows.push({ step: s9, enName: 'bankCategory', cnName: '银行大类', value: '交通银行' });
  rows.push({ step: s9, enName: 'creditQuota', cnName: '授信额度', value: String(Math.round((Number(coreInfo.cloudQuota) || 0) * 10000)) });
  rows.push({ step: s9, enName: 'creditValidStart', cnName: '授信有效期-起始', value: bankInfo.creditStartDate });
  rows.push({ step: s9, enName: 'creditValidEnd', cnName: '授信有效期-终止', value: bankInfo.creditEndDate });
  rows.push({ step: s9, enName: 'creditStatus', cnName: '授信状态', value: '启用' });
  rows.push({ step: s9, enName: 'proofAttachment', cnName: '证明附件', value: '' });
  rows.push({ step: s9, enName: 'creditRecordType', cnName: '授信记录类型', value: '初始授信' });
  rows.push({ step: s9, enName: 'remark', cnName: '备注', value: `BOT-${state.projectId}` });
  rows.push({ step: s9, enName: 'allocationCompanyName', cnName: '额度分配-企业名称', value: allocationNames });
  rows.push({ step: s9, enName: 'allocationQuota', cnName: '分配云信额度', value: allocationQuotas });
  rows.push({ step: s9, enName: 'cloudConfirmTerm', cnName: '云信确权期限', value: '6个月' });
  rows.push({ step: s9, enName: 'latestDueDate2', cnName: '最晚到期日', value: getLatestDueDate(bankInfo.creditEndDate) });
  rows.push({ step: s9, enName: 'quotaValidStart', cnName: '额度有效期-起始', value: bankInfo.creditStartDate });
  rows.push({ step: s9, enName: 'quotaValidEnd', cnName: '额度有效期-终止', value: bankInfo.creditEndDate });
  rows.push({ step: s9, enName: 'buyerInterestSupport', cnName: '是否支持买方付息', value: buyerInterestSupport });
  rows.push({ step: s9, enName: 'clearingPlan', cnName: '清分方案', value: getClearingPlanName(coreInfo.clearingMethod) });
  rows.push({ step: s9, enName: 'status', cnName: '状态', value: '生效' });

  // ===== 新增参数（12.投资者产品属性）=====
  const s12 = '12.投资者产品属性';
  const productAttrPlanName = coreInfo.buyerInterestDetail === '集团统一付息'
    ? `${bankInfo.branchName}-集团统付BOT`
    : `${bankInfo.branchName}-BOT`;
  rows.push({ step: s12, enName: 'productAttrPlanName', cnName: '产品属性方案名称', value: productAttrPlanName });
  rows.push({ step: s12, enName: 'investor', cnName: '投资者', value: bankInfo.branchName });
  rows.push({ step: s12, enName: 'investorCategory', cnName: '投资者类别', value: '投资人' });
  rows.push({ step: s12, enName: 'capitalChannelName', cnName: '资方通道名称', value: '交通银行' });
  rows.push({ step: s12, enName: 'configPlanName', cnName: '配置方案名称', value: '通用配置' });
  rows.push({ step: s12, enName: 'interfaceForm', cnName: '对接形式', value: '接口' });
  rows.push({ step: s12, enName: 'feePayment', cnName: '费用支付', value: '其他' });
  rows.push({ step: s12, enName: 'capitalFeature', cnName: '资方特性', value: '' });
  rows.push({ step: s12, enName: 'filingApplyStartTime', cnName: '建档申请开始时间', value: '不限' });
  rows.push({ step: s12, enName: 'filingApplyEndTime', cnName: '建档申请结束时间', value: '不限' });
  rows.push({ step: s12, enName: 'financingApplyEndTime', cnName: '融资申请结束时间', value: '不限' });
  rows.push({ step: s12, enName: 'financingApplyStartTime', cnName: '融资申请开始时间', value: '不限' });
  rows.push({ step: s12, enName: 'withholdLimit', cnName: '代扣上限（%）', value: '' });
  rows.push({ step: s12, enName: 'highlightBankRate', cnName: '是否突出展示银行利率', value: '否' });
  rows.push({ step: s12, enName: 'firstTradeBackTransferRule', cnName: '一手贸背传送规则', value: '配置一手贸背时，必传' });

  // 买方付息模型：付费方联动“2.核企信息-买方付息详情”
  const buyerPayPayer = coreInfo.buyerInterestDetail === '集团统一付息' ? '额度发起方' : '确权方';
  rows.push({ step: s12, enName: 'buyerFinancingInterestPayer', cnName: '买方付息模型-融资利息-付费方', value: buyerPayPayer });
  rows.push({ step: s12, enName: 'buyerFinancingInterestMethod', cnName: '买方付息模型-融资利息-收费方式', value: '' });
  rows.push({ step: s12, enName: 'buyerFinancingInterestCycle', cnName: '买方付息模型-融资利息-收费周期', value: '' });
  rows.push({ step: s12, enName: 'buyerBankFeePayer', cnName: '买方付息模型-银行手续费-付费方', value: buyerPayPayer });
  rows.push({ step: s12, enName: 'buyerBankFeeMethod', cnName: '买方付息模型-银行手续费-收费方式', value: '' });
  rows.push({ step: s12, enName: 'buyerBankFeeCycle', cnName: '买方付息模型-银行手续费-收费周期', value: '' });
  rows.push({ step: s12, enName: 'buyerExpandFeePayer', cnName: '买方付息模型-拓展服务费-付费方', value: buyerPayPayer });
  rows.push({ step: s12, enName: 'buyerExpandFeeMethod', cnName: '买方付息模型-拓展服务费-收费方式', value: '云聚付' });
  rows.push({ step: s12, enName: 'buyerExpandFeeCycle', cnName: '买方付息模型-拓展服务费-收费周期', value: '实时收费' });
  rows.push({ step: s12, enName: 'buyerPlatformFeePayer', cnName: '买方付息模型-平台手续费平台综合服务费率-付费方', value: buyerPayPayer });
  rows.push({ step: s12, enName: 'buyerPlatformFeeMethod', cnName: '买方付息模型-平台手续费平台综合服务费率-收费方式', value: '云聚付' });
  rows.push({ step: s12, enName: 'buyerPlatformFeeCycle', cnName: '买方付息模型-平台手续费平台综合服务费率-收费周期', value: '实时收费' });
  rows.push({ step: s12, enName: 'buyerMiscFeePayer', cnName: '买方付息模型-杂费-付费方', value: buyerPayPayer });
  rows.push({ step: s12, enName: 'buyerMiscFeeMethod', cnName: '买方付息模型-杂费-收费方式', value: '云聚付' });
  rows.push({ step: s12, enName: 'buyerMiscFeeCycle', cnName: '买方付息模型-杂费-收费周期', value: '实时收费' });
  rows.push({ step: s12, enName: 'buyerRefactoringFeePayer', cnName: '买方付息模型-再保理手续费-付费方', value: buyerPayPayer });
  rows.push({ step: s12, enName: 'buyerRefactoringFeeMethod', cnName: '买方付息模型-再保理手续费-收费方式', value: '云聚付' });
  rows.push({ step: s12, enName: 'buyerRefactoringFeeCycle', cnName: '买方付息模型-再保理手续费-收费周期', value: '实时收费' });
  rows.push({ step: s12, enName: 'buyerGuaranteeFeePayer', cnName: '买方付息模型-担保费-付费方', value: '确权方' });
  rows.push({ step: s12, enName: 'buyerGuaranteeFeeMethod', cnName: '买方付息模型-担保费-收费方式', value: '代扣' });
  rows.push({ step: s12, enName: 'buyerGuaranteeFeeCycle', cnName: '买方付息模型-担保费-收费周期', value: '' });

  // 融资人付息模型
  rows.push({ step: s12, enName: 'financierFinancingInterestPayer', cnName: '融资人付息模型-融资利息-付费方', value: '融资申请方' });
  rows.push({ step: s12, enName: 'financierFinancingInterestMethod', cnName: '融资人付息模型-融资利息-收费方式', value: '' });
  rows.push({ step: s12, enName: 'financierFinancingInterestCycle', cnName: '融资人付息模型-融资利息-收费周期', value: '' });
  rows.push({ step: s12, enName: 'financierBankFeePayer', cnName: '融资人付息模型-银行手续费-付费方', value: '融资申请方' });
  rows.push({ step: s12, enName: 'financierBankFeeMethod', cnName: '融资人付息模型-银行手续费-收费方式', value: '' });
  rows.push({ step: s12, enName: 'financierBankFeeCycle', cnName: '融资人付息模型-银行手续费-收费周期', value: '' });
  rows.push({ step: s12, enName: 'financierExpandFeePayer', cnName: '融资人付息模型-拓展服务费-付费方', value: '融资申请方' });
  rows.push({ step: s12, enName: 'financierExpandFeeMethod', cnName: '融资人付息模型-拓展服务费-收费方式', value: '云聚付' });
  rows.push({ step: s12, enName: 'financierExpandFeeCycle', cnName: '融资人付息模型-拓展服务费-收费周期', value: '实时收费' });
  rows.push({ step: s12, enName: 'financierPlatformFeePayer', cnName: '融资人付息模型-平台手续费平台综合服务费率-付费方', value: '融资申请方' });
  rows.push({ step: s12, enName: 'financierPlatformFeeMethod', cnName: '融资人付息模型-平台手续费平台综合服务费率-收费方式', value: '云聚付' });
  rows.push({ step: s12, enName: 'financierPlatformFeeCycle', cnName: '融资人付息模型-平台手续费平台综合服务费率-收费周期', value: '实时收费' });
  rows.push({ step: s12, enName: 'financierMiscFeePayer', cnName: '融资人付息模型-杂费-付费方', value: '融资申请方' });
  rows.push({ step: s12, enName: 'financierMiscFeeMethod', cnName: '融资人付息模型-杂费-收费方式', value: '云聚付' });
  rows.push({ step: s12, enName: 'financierMiscFeeCycle', cnName: '融资人付息模型-杂费-收费周期', value: '实时收费' });
  rows.push({ step: s12, enName: 'financierRefactoringFeePayer', cnName: '融资人付息模型-再保理手续费-付费方', value: '融资申请方' });
  rows.push({ step: s12, enName: 'financierRefactoringFeeMethod', cnName: '融资人付息模型-再保理手续费-收费方式', value: '云聚付' });
  rows.push({ step: s12, enName: 'financierRefactoringFeeCycle', cnName: '融资人付息模型-再保理手续费-收费周期', value: '实时收费' });
  rows.push({ step: s12, enName: 'financierGuaranteeFeePayer', cnName: '融资人付息模型-担保费-付费方', value: '融资申请方' });
  rows.push({ step: s12, enName: 'financierGuaranteeFeeMethod', cnName: '融资人付息模型-担保费-收费方式', value: '代扣' });
  rows.push({ step: s12, enName: 'financierGuaranteeFeeCycle', cnName: '融资人付息模型-担保费-收费周期', value: '' });

  const financingNotice = [
    '准入标准',
    '融资申请方类型必须为企业',
    '',
    '放款时效',
    'T+5（预计5个工作日内放款）',
    '',
    '特别提示',
    '1、自首笔业务放款之日起，半年内需开立交行账户；',
    '',
    '2、银行收费（融资利息、手续费等）请以银行为准；',
    '',
    '3、交行系统单个文件大小不超过20MB',
    '',
    '',
    '额度要求',
    '建议单笔1000万以下',
    '',
    '发票要求',
    '1、必须提供融资申请日2年内的发票；',
    '',
    '2、发票后引用合同编码字符不超200字符；',
    '',
    '3、发票张数不超过300张（一手贸易背景处及融资处的总和）'
  ].join('\n');
  rows.push({ step: s12, enName: 'financingNotice', cnName: '融资须知', value: financingNotice });
  rows.push({ step: s12, enName: 'preferentialAccount', cnName: '本行优惠账户', value: '' });

  // ===== 新增参数（13.投资方案）=====
  const s13 = '13.投资方案';
  rows.push({ step: s13, enName: 'investProductType', cnName: '产品类型', value: '云信保理' });
  rows.push({ step: s13, enName: 'investQuotaInitiator', cnName: '额度发起企业', value: coreInfo.initiatorName });
  rows.push({ step: s13, enName: 'investQuotaName', cnName: '额度名称', value: otherInfo.quotaName || getEffectiveQuotaName(state) });


  rows.push({ step: s13, enName: 'investMatchCoreEnterprise', cnName: '是否匹配核心企业', value: '否' });
  rows.push({ step: s13, enName: 'investMatchSupplier', cnName: '是否匹配供应商', value: '否' });
  rows.push({ step: s13, enName: 'investInvestor', cnName: '投资人', value: bankInfo.branchName });
  rows.push({ step: s13, enName: 'investQuotaAmount', cnName: '投资额度', value: String(Math.round((Number(coreInfo.cloudQuota) || 0) * 10000)) });
  rows.push({ step: s13, enName: 'investEndDate', cnName: '投资截止日期', value: bankInfo.creditEndDate });

  rows.push({ step: s13, enName: 'investManageBranch', cnName: '管户行', value: bankInfo.branchName });
  rows.push({ step: s13, enName: 'investFinancierAccountReq', cnName: '融资人账户要求', value: '不限制' });
  rows.push({ step: s13, enName: 'investSponsorGuaranteeAudit', cnName: '保荐/担保审核', value: '不需要' });
  rows.push({ step: s13, enName: 'investMethod', cnName: '投资方式', value: '直接保理' });
  rows.push({ step: s13, enName: 'investCloudLevelReq', cnName: '云信级次要求', value: '1至999' });
  rows.push({ step: s13, enName: 'investProductAttrPlanName', cnName: '产品属性方案', value: productAttrPlanName });
  rows.push({ step: s13, enName: 'investPricingMethod', cnName: '定价方式', value: '定价-人工' });

  // 投资方案新增参数（位于“融资利息”分组之前）
  const effectiveFeeSchemeNo = feeSchemeNo || '';
  const investBuyerInterestSupport = coreInfo.interestPayer === '需要买方付息' ? '支持' : '不支持';
  const investOwningCompany = creatorAffiliation === '北京区'
    ? '北京中企云链产融科技有限公司'
    : '中企链信（北京）科技有限公司';

  rows.push({ step: s13, enName: 'investFinancingPathName', cnName: '融资路径名称', value: '交通银行快易付' });
  rows.push({ step: s13, enName: 'investCloudFactoringFeeSchemeName', cnName: '云信保理费用方案名称', value: effectiveFeeSchemeNo });
  rows.push({ step: s13, enName: 'investBuyerInterestSupport', cnName: '是否支持买方付息', value: investBuyerInterestSupport });
  rows.push({ step: s13, enName: 'investFinancingPathLogo', cnName: '融资路径LOGO', value: '' });
  rows.push({ step: s13, enName: 'investOwningCompany', cnName: '归属公司', value: investOwningCompany });
  rows.push({ step: s13, enName: 'investBuyerInterestDisplayFee', cnName: '买方付息是否显示息费', value: '是' });
  rows.push({ step: s13, enName: 'investExpandServiceReverseCalc', cnName: '拓展服务费反算', value: '否' });
  rows.push({ step: s13, enName: 'investExternalUnifiedQuote', cnName: '对外统一报价(年化%)', value: '0' });

  // 投资方案补充参数
  rows.push({ step: s13, enName: 'investFinancingInterestFeeName', cnName: '融资利息-息费名称', value: '融资利息' });
  rows.push({ step: s13, enName: 'investFinancingInterestCalcMethod', cnName: '融资利息-计算方式', value: rateInfo.financingRateType || '年化' });
  rows.push({ step: s13, enName: 'investFinancingInterestYearDays', cnName: '融资利息-年计算天数', value: '360' });
  rows.push({ step: s13, enName: 'investFinancingInterestTieredPricing', cnName: '融资利息-是否分级定价', value: '否' });
  rows.push({ step: s13, enName: 'investFinancingInterestRate', cnName: '融资利息-息费率', value: String(rateInfo.financingRate) });
  rows.push({ step: s13, enName: 'investFinancingInterestMinAmount', cnName: '融资利息-最小收取金额', value: '0' });
  rows.push({ step: s13, enName: 'investFinancingInterestBuyerCharge', cnName: '融资利息-买方付息是否收取', value: '是' });
  rows.push({ step: s13, enName: 'investFinancingInterestPriceStrategy', cnName: '融资利息-价格策略', value: '常规' });

  rows.push({ step: s13, enName: 'investBankFeeName', cnName: '银行手续费-息费名称', value: '银行手续费' });
  rows.push({ step: s13, enName: 'investBankFeeCalcMethod', cnName: '银行手续费-计算方式', value: rateInfo.factoringFeeType || '非年化' });
  rows.push({ step: s13, enName: 'investBankFeeYearDays', cnName: '银行手续费-年计算天数', value: '360' });
  rows.push({ step: s13, enName: 'investBankFeeTieredPricing', cnName: '银行手续费-是否分级定价', value: '否' });
  rows.push({ step: s13, enName: 'investBankFeeRate', cnName: '银行手续费-息费率', value: String(rateInfo.factoringFee) });
  rows.push({ step: s13, enName: 'investBankFeeMinAmount', cnName: '银行手续费-最小收取金额', value: '0' });
  rows.push({ step: s13, enName: 'investBankFeeBuyerCharge', cnName: '银行手续费-买方付息是否收取', value: '是' });
  rows.push({ step: s13, enName: 'investBankFeePriceStrategy', cnName: '银行手续费-价格策略', value: '常规' });

  rows.push({ step: s13, enName: 'investExpandFeeName', cnName: '拓展服务费-息费名称', value: '拓展服务费' });
  rows.push({ step: s13, enName: 'investExpandFeeCalcMethod', cnName: '拓展服务费-计算方式', value: '年化' });
  rows.push({ step: s13, enName: 'investExpandFeeYearDays', cnName: '拓展服务费-年计算天数', value: '360' });
  rows.push({ step: s13, enName: 'investExpandFeeTieredPricing', cnName: '拓展服务费-是否分级定价', value: '否' });
  rows.push({ step: s13, enName: 'investExpandFeeRate', cnName: '拓展服务费-息费率', value: '0' });
  rows.push({ step: s13, enName: 'investExpandFeeMinAmount', cnName: '拓展服务费-最小收取金额', value: '0' });
  rows.push({ step: s13, enName: 'investExpandFeeBuyerCharge', cnName: '拓展服务费-买方付息是否收取', value: '否' });
  rows.push({ step: s13, enName: 'investExpandFeePriceStrategy', cnName: '拓展服务费-价格策略', value: '常规' });

  rows.push({ step: s13, enName: 'investPlatformFeeName', cnName: '平台手续费-息费名称', value: '平台手续费' });
  rows.push({ step: s13, enName: 'investPlatformFeeCalcMethod', cnName: '平台手续费-计算方式', value: rateInfo.platformFeeType || '年化' });
  rows.push({ step: s13, enName: 'investPlatformFeeYearDays', cnName: '平台手续费-年计算天数', value: '360' });
  rows.push({ step: s13, enName: 'investPlatformFeeTieredPricing', cnName: '平台手续费-是否分级定价', value: '否' });
  rows.push({ step: s13, enName: 'investPlatformFeeRate', cnName: '平台手续费-息费率', value: String(rateInfo.platformFee) });
  rows.push({ step: s13, enName: 'investPlatformFeeMinAmount', cnName: '平台手续费-最小收取金额', value: '200' });
  rows.push({ step: s13, enName: 'investPlatformFeeBuyerCharge', cnName: '平台手续费-买方付息是否收取', value: '是' });
  rows.push({ step: s13, enName: 'investPlatformFeePriceStrategy', cnName: '平台手续费-价格策略', value: '常规' });

  rows.push({ step: s13, enName: 'investMiscFeeName', cnName: '杂费-息费名称', value: '杂费' });
  rows.push({ step: s13, enName: 'investMiscFeeCalcMethod', cnName: '杂费-计算方式', value: '固定金额' });
  rows.push({ step: s13, enName: 'investMiscFeeYearDays', cnName: '杂费-年计算天数', value: '360' });
  rows.push({ step: s13, enName: 'investMiscFeeTieredPricing', cnName: '杂费-是否分级定价', value: '否' });
  rows.push({ step: s13, enName: 'investMiscFeeRate', cnName: '杂费-息费率', value: '100' });
  rows.push({ step: s13, enName: 'investMiscFeeMinAmount', cnName: '杂费-最小收取金额', value: '0' });
  rows.push({ step: s13, enName: 'investMiscFeeBuyerCharge', cnName: '杂费-买方付息是否收取', value: '是' });
  rows.push({ step: s13, enName: 'investMiscFeePriceStrategy', cnName: '杂费-价格策略', value: '常规' });

  rows.push({ step: s13, enName: 'investHistoryPlan', cnName: '历史方案', value: '需写入！！' });
  rows.push({ step: s13, enName: 'investRepaymentAccount', cnName: '还款账户', value: receiveAccount.accountNumber });
  rows.push({ step: s13, enName: 'investRepaymentAccountName', cnName: '还款账户名称', value: receiveAccount.accountName });
  rows.push({ step: s13, enName: 'investRepaymentBank', cnName: '开户支行', value: receiveAccount.bankName.trim() });
  rows.push({ step: s13, enName: 'investRepaymentUnionCode', cnName: '联行号', value: receiveAccount.unionCode });
  rows.push({ step: s13, enName: 'investExceptionCoreList', cnName: '例外核心企业清单', value: '' });
  rows.push({ step: s13, enName: 'investExceptionSupplierList', cnName: '例外供应商清单', value: '' });

  // 操作信息
  rows.push({ step: s13, enName: 'operator', cnName: '操作信息-经办人', value: 'BOT' });
  rows.push({ step: s13, enName: 'reviewer', cnName: '操作信息-审核人', value: '风控审核人' });
  rows.push({ step: s13, enName: 'source', cnName: '操作信息-来源', value: 'BOT+后台' });
  rows.push({ step: s13, enName: 'investPlanNo', cnName: '操作信息-投资方案编号', value: '现有逻辑生成！！' });

  // ===== 补充参数（11.协议方案）=====
  const s14 = '14.协议方案';
  const agreementPlanName = bankInfo.branchProvince === '北京市' || bankInfo.branchProvince === '青海省'
    ? '交通银行-北京部分支行、青海分行-带补充说明'
    : bankInfo.branchProvince === '山西省'
      ? '交通银行-山西省分行'
      : '交通银行-通用2期（之前号已满）';
  rows.push({ step: s14, enName: 'agreementPlanName', cnName: '协议方案名称', value: agreementPlanName });
  rows.push({ step: s14, enName: 'agreementInvestorName', cnName: '投资人名称', value: bankInfo.branchName });
  rows.push({ step: s14, enName: 'agreementProductAttrPlan', cnName: '产品属性方案', value: productAttrPlanName });
  rows.push({ step: s14, enName: 'agreementQuotaInitiator', cnName: '额度发起方', value: '全部' });

  // ===== 补充参数（12.投资人信息）=====
  const s10 = '10.投资人信息';
  const investorAddress = bankInfo.branchArea && bankInfo.branchAddress
    ? `${bankInfo.branchArea}-${bankInfo.branchAddress}`
    : bankInfo.branchAddress || bankInfo.branchArea || '';
  rows.push({ step: s10, enName: 'investorOrgType', cnName: '机构属性', value: '银行投资者' });
  rows.push({ step: s10, enName: 'investorCreditCode', cnName: '统一社会信用代码', value: bankInfo.branchCreditCode });
  rows.push({ step: s10, enName: 'investorOrgName', cnName: '机构名称', value: bankInfo.branchName });
  rows.push({ step: s10, enName: 'investorBusinessName', cnName: '业务名称', value: bankInfo.branchName });
  rows.push({ step: s10, enName: 'investorBankCategory', cnName: '银行分类', value: '交通银行' });
  rows.push({ step: s10, enName: 'investorBankCode', cnName: '银行机构号(邮储）', value: '' });
  rows.push({ step: s10, enName: 'investorProvince', cnName: '经营地址-省', value: bankInfo.branchProvince });
  rows.push({ step: s10, enName: 'investorCity', cnName: '经营地址-市', value: bankInfo.branchCity });
  rows.push({ step: s10, enName: 'investorAddress', cnName: '经营地址-详细地址', value: investorAddress });
  rows.push({ step: s10, enName: 'investorProductLine', cnName: '产品线', value: '云信' });
  rows.push({ step: s10, enName: 'investorIsManageBranch', cnName: '是否管户行', value: '是' });
  rows.push({ step: s10, enName: 'investorOrgCode', cnName: '组织机构代码', value: bankInfo.branchCreditCode.substring(8, 17) });
  rows.push({ step: s10, enName: 'investorLicenseNo', cnName: '营业执照号', value: bankInfo.branchCreditCode });
  rows.push({ step: s10, enName: 'investorTaxRegNo', cnName: '税务登记号', value: bankInfo.branchCreditCode });
  rows.push({ step: s10, enName: 'investorAccountSeq', cnName: '账户信息-序号', value: '固定值：自动生成！！' });
  rows.push({ step: s10, enName: 'investorAccountNo', cnName: '账户信息-银行账号', value: receiveAccount.accountNumber });
  rows.push({ step: s10, enName: 'investorAccountName', cnName: '账户信息-账户名称', value: receiveAccount.accountName });
  rows.push({ step: s10, enName: 'investorAccountBankCategory', cnName: '账户信息-银行分类', value: '交通银行' });
  rows.push({ step: s10, enName: 'investorAccountBank', cnName: '账户信息-开户支行', value: receiveAccount.bankName.trim() });
  rows.push({ step: s10, enName: 'investorAccountUnionCode', cnName: '账户信息-联行号', value: receiveAccount.unionCode });
  rows.push({ step: s10, enName: 'investorAccountStatus', cnName: '账户信息-状态', value: '开启' });
  rows.push({ step: s10, enName: 'investorAccountRemark', cnName: '账户信息-备注', value: '还款账户' });
  rows.push({ step: s10, enName: 'investorUserSeq', cnName: '银行用户-序号', value: '固定值：自动生成！！' });
  rows.push({ step: s10, enName: 'investorUserStatus', cnName: '银行用户-状态', value: '开启' });
  rows.push({ step: s10, enName: 'investorUserName', cnName: '银行用户-用户名称', value: bankInfo.managerName });
  rows.push({ step: s10, enName: 'investorUserPhone', cnName: '银行用户-手机号', value: bankInfo.managerPhone });
  rows.push({ step: s10, enName: 'investorUserEmail', cnName: '银行用户-邮箱', value: '' });
  rows.push({ step: s10, enName: 'investorUserIdCard', cnName: '银行用户-身份证号', value: '' });
  rows.push({ step: s10, enName: 'investorUserPosition', cnName: '银行用户-职务', value: '' });
  rows.push({ step: s10, enName: 'investorUserCity', cnName: '银行用户-所在城市', value: '' });
  rows.push({ step: s10, enName: 'investorUserIsAdmin', cnName: '银行用户-管理员', value: '否' });

  // ===== 补充参数（13.额度发起企业）=====
  const s8 = '8.额度发起企业';
  rows.push({ step: s8, enName: 'initiatorEnterpriseName', cnName: '发起企业名称', value: coreInfo.initiatorName });

  // ===== 补充参数（14.授信主体管理）=====
  const s11 = '11.授信主体管理';
  const isGroupModeYes = coreInfo.isGroupMode === '是';
  const addInterestPayer = !isGroupModeYes
    ? ''
    : coreInfo.interestPayer === '需要买方付息'
      ? '是'
      : '否';

  // 确权方名称list：取有效子公司（含母公司索引0）名称，用顿号隔开
  const effectiveSubCountForConfirmor = getEffectiveSubCount(subsidiaries);
  const confirmorNames: string[] = [];
  for (let i = 0; i < effectiveSubCountForConfirmor; i++) {
    if (i === 0) {
      confirmorNames.push(coreInfo.initiatorName);
    } else {
      const sub = subsidiaries[i];
      if (sub && sub.name.trim()) {
        confirmorNames.push(sub.name.trim());
      }
    }
  }


  let jointBuyerInterestList: string;
  if (addInterestPayer !== '是') {
    jointBuyerInterestList = '';
  } else if (coreInfo.buyerInterestDetail === '子公司各自付息费') {
    jointBuyerInterestList = confirmorNames.map(() => '否').join('、') || '';
  } else if (coreInfo.buyerInterestDetail === '集团统一付息') {
    jointBuyerInterestList = confirmorNames.map(() => '是').join('、') || '';
  } else {
    jointBuyerInterestList = '';
  }

  rows.push({ step: s11, enName: 'creditSubjectInitiatorName', cnName: '额度发起企业', value: coreInfo.initiatorName });
  rows.push({ step: s11, enName: 'creditSubjectBankCategory', cnName: '授信银行大类', value: '交通银行' });
  rows.push({ step: s11, enName: 'creditSubjectGroupMode', cnName: '集团模式', value: coreInfo.isGroupMode });
  rows.push({ step: s11, enName: 'creditSubjectAddInterestPayer', cnName: '是否添加付息方', value: addInterestPayer });
  rows.push({ step: s11, enName: 'creditSubjectName', cnName: '授信主体名称', value: coreInfo.initiatorName });
  rows.push({ step: s11, enName: 'creditSubjectCreditCode', cnName: '营业执照注册号/统一社会信用代码', value: coreInfo.creditCode });
  rows.push({ step: s11, enName: 'creditSubjectOrgCode', cnName: '组织机构代码/统一社会信用代码', value: coreInfo.creditCode });
  rows.push({ step: s11, enName: 'creditSubjectConfirmorNameList', cnName: '确权方名称list', value: '返显！！' });
  rows.push({ step: s11, enName: 'creditSubjectJointBuyerInterestList', cnName: '是否共同买方付息list', value: jointBuyerInterestList });

  // ===== 补充参数（15.合同模板变量）=====
  const s15 = '15.合同模板变量';

  // 计算合同模板需要的变量
  const EXEMPT_CLEARING_METHODS = ['推荐：中信清分', '线上：中信过渡户清分'];
  const needRepaymentAccount = !EXEMPT_CLEARING_METHODS.includes(coreInfo.clearingMethod);
  const repaymentLetterAccountName = needRepaymentAccount ? coreInfo.initiatorName : '';
  const repaymentLetterAccount = needRepaymentAccount ? coreInfo.repaymentAccount : '';
  const repaymentLetterBank = needRepaymentAccount ? coreInfo.repaymentBank : '';
  const repaymentLetterUnionCode = needRepaymentAccount ? coreInfo.repaymentUnionCode : '';
  const anchorAccountName = !isGroup || sub0Quota > 0 ? coreInfo.initiatorName : '/';
  const anchorAccountBank = !isGroup || sub0Quota > 0 ? bankInfo.initiatorBank : '/';
  const anchorAccountNo = !isGroup || sub0Quota > 0 ? bankInfo.initiatorAccount : '/';
  const coanchorAccountName = isGroup && sub0Quota < coreInfo.cloudQuota ? coreInfo.initiatorName : '/';
  const coanchorAccountBank = isGroup && sub0Quota < coreInfo.cloudQuota ? bankInfo.initiatorBank : '/';
  const coanchorAccountNo = isGroup && sub0Quota < coreInfo.cloudQuota ? bankInfo.initiatorAccount : '/';

  rows.push({ step: s15, enName: '额度发起方名称', cnName: '额度发起方名称', value: coreInfo.initiatorName });
  rows.push({ step: s15, enName: '统一社会信用代码', cnName: '统一社会信用代码', value: coreInfo.creditCode });
  rows.push({ step: s15, enName: '云信额度', cnName: '云信额度', value: numberToChinese(coreInfo.cloudQuota) });
  rows.push({ step: s15, enName: '是否集团模式', cnName: '是否集团模式', value: coreInfo.isGroupMode });
  rows.push({ step: s15, enName: '清分方式', cnName: '清分方式', value: coreInfo.clearingMethod });
  rows.push({ step: s15, enName: '核企还款账户', cnName: '核企还款账户', value: coreInfo.repaymentAccount });
  rows.push({ step: s15, enName: '还款户开户行', cnName: '还款户开户行', value: coreInfo.repaymentBank });
  rows.push({ step: s15, enName: '还款户联行号', cnName: '还款户联行号', value: coreInfo.repaymentUnionCode });
  rows.push({ step: s15, enName: '付息方', cnName: '付息方', value: coreInfo.interestPayer });
  rows.push({ step: s15, enName: '买方付息详情', cnName: '买方付息详情', value: coreInfo.buyerInterestDetail });
  rows.push({ step: s15, enName: '支行名称', cnName: '支行名称', value: bankInfo.branchName });
  rows.push({ step: s15, enName: '授信起始日', cnName: '授信起始日', value: bankInfo.creditStartDate });
  rows.push({ step: s15, enName: '授信终止日', cnName: '授信终止日', value: bankInfo.creditEndDate });
  rows.push({ step: s15, enName: '最晚业务到期日', cnName: '最晚业务到期日', value: getLatestDueDate(bankInfo.creditEndDate) });
  rows.push({ step: s15, enName: '客户经理姓名', cnName: '客户经理姓名', value: bankInfo.managerName });
  rows.push({ step: s15, enName: '客户经理手机号', cnName: '客户经理手机号', value: bankInfo.managerPhone });
  rows.push({ step: s15, enName: '支行所在省市区', cnName: '支行所在省市区', value: bankInfo.branchRegion });
  rows.push({ step: s15, enName: '支行详细地址', cnName: '支行详细地址', value: bankInfo.branchAddress });
  rows.push({ step: s15, enName: '交行结算账户', cnName: '交行结算账户', value: bankInfo.initiatorAccount });
  rows.push({ step: s15, enName: '结算账户开户行', cnName: '结算账户开户行', value: bankInfo.initiatorBank });
  rows.push({ step: s15, enName: '支行社会信用代码', cnName: '支行社会信用代码', value: bankInfo.branchCreditCode });
  rows.push({ step: s15, enName: '收款户名', cnName: '收款户名', value: receiveAccount.accountName });
  rows.push({ step: s15, enName: '收款账号', cnName: '收款账号', value: receiveAccount.accountNumber });
  rows.push({ step: s15, enName: '开户行_收款户', cnName: '开户行_收款户', value: recvBankName });
  rows.push({ step: s15, enName: '联行号', cnName: '联行号', value: receiveAccount.unionCode });
  rows.push({ step: s15, enName: '银行融资利率', cnName: '银行融资利率', value: `${rateInfo.financingRate}%` });
  rows.push({ step: s15, enName: '银行保理手续费', cnName: '银行保理手续费', value: `${rateInfo.factoringFee}%` });
  rows.push({ step: s15, enName: '平台手续费', cnName: '平台手续费', value: `${rateInfo.platformFee}%` });
  rows.push({ step: s15, enName: '额度简称', cnName: '额度简称', value: getEffectiveQuotaName(state) });
  rows.push({ step: s15, enName: '三方协议版本', cnName: '三方协议版本', value: '三方协议' });
  rows.push({ step: s15, enName: '还款函_抬头前缀', cnName: '还款函_抬头前缀', value: coreInfo.isGroupMode === '是' ? '基于上属集团' : '基于' });
  rows.push({ step: s15, enName: '还款函_清分方式', cnName: '还款函_清分方式', value: coreInfo.clearingMethod });
  rows.push({ step: s15, enName: '还款函_账户名称', cnName: '还款函_账户名称', value: repaymentLetterAccountName });
  rows.push({ step: s15, enName: '还款函_账号', cnName: '还款函_账号', value: repaymentLetterAccount });
  rows.push({ step: s15, enName: '还款函_开户行', cnName: '还款函_开户行', value: repaymentLetterBank });
  rows.push({ step: s15, enName: '还款函_联行号', cnName: '还款函_联行号', value: repaymentLetterUnionCode });
  rows.push({ step: s15, enName: '还款函_日期', cnName: '还款函_日期', value: format(new Date(), 'yyyy-MM-dd') });
  rows.push({ step: s15, enName: '核心企业签约主体', cnName: '核心企业签约主体', value: signatory });
  rows.push({ step: s15, enName: '合同授信起始日', cnName: '合同授信起始日', value: bankInfo.creditStartDate ? format(new Date(bankInfo.creditStartDate), 'yyyy-MM-dd') : '' });
  rows.push({ step: s15, enName: '合同授信终止日', cnName: '合同授信终止日', value: bankInfo.creditEndDate ? format(new Date(bankInfo.creditEndDate), 'yyyy-MM-dd') : '' });
  rows.push({ step: s15, enName: '核心企业账户名称', cnName: '核心企业账户名称', value: anchorAccountName });
  rows.push({ step: s15, enName: '核心企业账户开户行', cnName: '核心企业账户开户行', value: anchorAccountBank });
  rows.push({ step: s15, enName: '核心企业账户账号', cnName: '核心企业账户账号', value: anchorAccountNo });
  rows.push({ step: s15, enName: '共同买方账户名称', cnName: '共同买方账户名称', value: coanchorAccountName });
  rows.push({ step: s15, enName: '共同买方账户开户行', cnName: '共同买方账户开户行', value: coanchorAccountBank });
  rows.push({ step: s15, enName: '共同买方账户账号', cnName: '共同买方账户账号', value: coanchorAccountNo });
  rows.push({ step: s15, enName: 'signatory', cnName: 'signatory', value: signatory });
  rows.push({ step: s15, enName: 'conCreditStartDate', cnName: 'conCreditStartDate', value: bankInfo.creditStartDate ? format(new Date(bankInfo.creditStartDate), 'yyyy-MM-dd') : '' });
  rows.push({ step: s15, enName: 'conCreditEndDate', cnName: 'conCreditEndDate', value: bankInfo.creditEndDate ? format(new Date(bankInfo.creditEndDate), 'yyyy-MM-dd') : '' });
  rows.push({ step: s15, enName: 'anchorAccountName', cnName: 'anchorAccountName', value: anchorAccountName });
  rows.push({ step: s15, enName: 'anchorAccountBank', cnName: 'anchorAccountBank', value: anchorAccountBank });
  rows.push({ step: s15, enName: 'anchorAccountNo', cnName: 'anchorAccountNo', value: anchorAccountNo });
  rows.push({ step: s15, enName: 'coanchorAccountName', cnName: 'coanchorAccountName', value: coanchorAccountName });
  rows.push({ step: s15, enName: 'coanchorAccountBank', cnName: 'coanchorAccountBank', value: coanchorAccountBank });
  rows.push({ step: s15, enName: 'coanchorAccountNo', cnName: 'coanchorAccountNo', value: coanchorAccountNo });
  rows.push({ step: s15, enName: 'initiatorName', cnName: 'initiatorName', value: coreInfo.initiatorName });
  rows.push({ step: s15, enName: 'creditCode', cnName: 'creditCode', value: coreInfo.creditCode });
  rows.push({ step: s15, enName: 'cloudQuota', cnName: 'cloudQuota', value: String(coreInfo.cloudQuota) });
  rows.push({ step: s15, enName: 'cloudQuotaChinese', cnName: 'cloudQuotaChinese', value: numberToChinese(coreInfo.cloudQuota) });
  rows.push({ step: s15, enName: 'isGroupMode', cnName: 'isGroupMode', value: coreInfo.isGroupMode });
  rows.push({ step: s15, enName: 'clearingMethod', cnName: 'clearingMethod', value: coreInfo.clearingMethod });
  rows.push({ step: s15, enName: 'repaymentAccount', cnName: 'repaymentAccount', value: coreInfo.repaymentAccount });
  rows.push({ step: s15, enName: 'repaymentBank', cnName: 'repaymentBank', value: coreInfo.repaymentBank });
  rows.push({ step: s15, enName: 'repaymentUnionCode', cnName: 'repaymentUnionCode', value: coreInfo.repaymentUnionCode });
  rows.push({ step: s15, enName: 'interestPayer', cnName: 'interestPayer', value: coreInfo.interestPayer });
  rows.push({ step: s15, enName: 'buyerInterestDetail', cnName: 'buyerInterestDetail', value: coreInfo.buyerInterestDetail });
  rows.push({ step: s15, enName: 'branchName', cnName: 'branchName', value: bankInfo.branchName });
  rows.push({ step: s15, enName: 'branchCreditCode', cnName: 'branchCreditCode', value: bankInfo.branchCreditCode });
  rows.push({ step: s15, enName: 'creditStartDate', cnName: 'creditStartDate', value: bankInfo.creditStartDate ? format(new Date(bankInfo.creditStartDate), 'yyyy-MM-dd') : '' });
  rows.push({ step: s15, enName: 'creditEndDate', cnName: 'creditEndDate', value: bankInfo.creditEndDate ? format(new Date(bankInfo.creditEndDate), 'yyyy-MM-dd') : '' });
  rows.push({ step: s15, enName: 'latestDueDate', cnName: 'latestDueDate', value: getLatestDueDate(bankInfo.creditEndDate) });
  rows.push({ step: s15, enName: 'managerName', cnName: 'managerName', value: bankInfo.managerName });
  rows.push({ step: s15, enName: 'managerPhone', cnName: 'managerPhone', value: bankInfo.managerPhone });
  rows.push({ step: s15, enName: 'branchRegion', cnName: 'branchRegion', value: bankInfo.branchRegion });
  rows.push({ step: s15, enName: 'branchAddress', cnName: 'branchAddress', value: bankInfo.branchAddress });
  rows.push({ step: s15, enName: 'settlementAccount', cnName: 'settlementAccount', value: bankInfo.initiatorAccount });
  rows.push({ step: s15, enName: 'settlementBank', cnName: 'settlementBank', value: bankInfo.initiatorBank });
  rows.push({ step: s15, enName: 'recvAccountName', cnName: 'recvAccountName', value: receiveAccount.accountName });
  rows.push({ step: s15, enName: 'recvAccountNumber', cnName: 'recvAccountNumber', value: receiveAccount.accountNumber });
  rows.push({ step: s15, enName: 'recvBankName', cnName: 'recvBankName', value: recvBankName });
  rows.push({ step: s15, enName: 'recvUnionCode', cnName: 'recvUnionCode', value: receiveAccount.unionCode });
  rows.push({ step: s15, enName: 'recvIdentifier', cnName: 'recvIdentifier', value: receiveAccount.identifier || '' });
  rows.push({ step: s15, enName: 'financingRate', cnName: 'financingRate', value: `${rateInfo.financingRate}%` });
  rows.push({ step: s15, enName: 'factoringFee', cnName: 'factoringFee', value: `${rateInfo.factoringFee}%` });
  rows.push({ step: s15, enName: 'platformFee', cnName: 'platformFee', value: `${rateInfo.platformFee}%` });
  rows.push({ step: s15, enName: 'quotaShortName', cnName: 'quotaShortName', value: getEffectiveQuotaName(state) });
  rows.push({ step: s15, enName: 'quotaLetterShortName', cnName: 'quotaLetterShortName', value: getEffectiveQuotaName(state) });
  rows.push({ step: s15, enName: 'tempNoQuotaAllocation', cnName: 'tempNoQuotaAllocation', value: String(tempNoQuotaAllocation) });
  rows.push({ step: s15, enName: 'quotaLetterGroupMode', cnName: 'quotaLetterGroupMode', value: isGroup ? '集团企业' : '核心企业' });
  rows.push({ step: s15, enName: '立项类型', cnName: '立项类型', value: otherInfo.projectType });
  rows.push({ step: s15, enName: 'projectType', cnName: 'projectType', value: otherInfo.projectType });
  rows.push({ step: s15, enName: 'protocolVersion', cnName: 'protocolVersion', value: '三方协议' });
  rows.push({ step: s15, enName: 'rlPrefix', cnName: 'rlPrefix', value: coreInfo.isGroupMode === '是' ? '基于上属集团' : '基于' });
  rows.push({ step: s15, enName: 'rlClearingMethod', cnName: 'rlClearingMethod', value: coreInfo.clearingMethod });
  rows.push({ step: s15, enName: 'rlAccountName', cnName: 'rlAccountName', value: repaymentLetterAccountName });
  rows.push({ step: s15, enName: 'rlAccount', cnName: 'rlAccount', value: repaymentLetterAccount });
  rows.push({ step: s15, enName: 'rlBankName', cnName: 'rlBankName', value: repaymentLetterBank });
  rows.push({ step: s15, enName: 'rlUnionCode', cnName: 'rlUnionCode', value: repaymentLetterUnionCode });
  rows.push({ step: s15, enName: 'rlDate', cnName: 'rlDate', value: format(new Date(), 'yyyy-MM-dd') });
  rows.push({ step: s15, enName: 'shitNO', cnName: 'shitNO', value: bankInfo.branchCreditCode.substring(8, 17) });
  rows.push({ step: s15, enName: 'conrecvAccountName', cnName: 'conrecvAccountName', value: receiveAccount.accountNumber });

  return rows;
}

export function getExcelFileName(state: FormState): string {
  const dateStr = format(new Date(), 'yyyyMMdd');
  const shortName = getEffectiveQuotaName(state);
  return `供应链金融立项参数_${shortName}_${dateStr}.xlsx`;
}
