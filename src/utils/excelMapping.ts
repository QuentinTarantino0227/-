import type { FormState, Subsidiary } from '../types/form.js';
import { format } from 'date-fns';
import { numberToChinese } from './numberToChinese.js';
import { getLatestDueDate } from './branchLogic.js';

export interface ExcelRow {
  step: string;
  enName: string;
  cnName: string;
  value: string;
}

function getEffectiveSubCount(subsidiaries: Subsidiary[]): number {
  if (!subsidiaries || subsidiaries.length === 0) return 1;
  let lastIndex = 0;
  for (let i = subsidiaries.length - 1; i > 0; i--) {
    const s = subsidiaries[i];
    if (s.name.trim() || s.quota) {
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
  const recvBankName = receiveAccount.bankName.trim() || bankInfo.branchName;
  const rows: ExcelRow[] = [];

  // ===== 0.立项信息 =====
  rows.push({ step: '0.立项信息', enName: 'projectId', cnName: '业务编号', value: state.projectId || '' });
  rows.push({ step: '0.立项信息', enName: 'createdAt', cnName: '创建时间', value: state.createdAt || '' });
  rows.push({ step: '0.立项信息', enName: 'feeSchemeNo', cnName: '费用方案编号', value: feeSchemeNo || '' });
  rows.push({ step: '0.立项信息', enName: 'projectCreator', cnName: '立项人', value: creator || '' });
  rows.push({ step: '0.立项信息', enName: 'projectInstitution', cnName: '立项机构', value: creatorAffiliation || '' });

  // ===== 1.核企信息（原 1.额度信息 + 2.核企信息 合并）=====
  const s1 = '1.核企信息';
  rows.push({ step: s1, enName: 'initiatorName', cnName: '额度发起方名称', value: coreInfo.initiatorName });
  rows.push({ step: s1, enName: 'creditCode', cnName: '统一社会信用代码', value: coreInfo.creditCode });
  rows.push({ step: s1, enName: 'cloudQuota', cnName: '云信额度（万元）', value: String(coreInfo.cloudQuota) });
  rows.push({ step: s1, enName: 'isGroupMode', cnName: '是否集团模式', value: coreInfo.isGroupMode });
  rows.push({ step: s1, enName: 'quotaShortName', cnName: '额度简称（自定义）', value: otherInfo.quotaShortName });
  rows.push({ step: s1, enName: 'clearingMethod', cnName: '清分方式', value: coreInfo.clearingMethod });
  rows.push({ step: s1, enName: 'repaymentAccount', cnName: '核企还款账户', value: coreInfo.repaymentAccount });
  rows.push({ step: s1, enName: 'repaymentBank', cnName: '还款户开户行', value: coreInfo.repaymentBank });
  rows.push({ step: s1, enName: 'repaymentUnionCode', cnName: '还款户联行号', value: coreInfo.repaymentUnionCode });
  rows.push({ step: s1, enName: 'interestPayer', cnName: '付息方', value: coreInfo.interestPayer });
  rows.push({ step: s1, enName: 'buyerInterestDetail', cnName: '买方付息详情', value: coreInfo.buyerInterestDetail });
  rows.push({ step: s1, enName: 'projectType', cnName: '立项类型', value: otherInfo.projectType });
  rows.push({ step: s1, enName: 'quotaName', cnName: '额度名称', value: otherInfo.quotaName });
  rows.push({ step: s1, enName: 'mixedQuotaName', cnName: '并入现有混合额度', value: otherInfo.mixedQuotaName });

  // ===== 2.集团模式（原步骤3）=====
  const s2 = '2.集团模式';
  if (coreInfo.isGroupMode === '是') {
    const allocatedQuota = subsidiaries.reduce((sum, s) => sum + (s.quota || 0), 0);
    const tempNoQuotaAllocation = coreInfo.cloudQuota - allocatedQuota;
    rows.push({ step: s2, enName: 'tempNoQuotaAllocation', cnName: '暂不分配额度（万元）', value: String(tempNoQuotaAllocation) });
    subsidiaries.forEach((s, i) => {
      const prefix = `sub${i}`;
      rows.push({ step: s2, enName: `${prefix}_subName`, cnName: `子公司${i}-名称`, value: s.name });
      rows.push({ step: s2, enName: `${prefix}_subQuota`, cnName: `子公司${i}-分配额度（万元）`, value: String(s.quota) });
      rows.push({ step: s2, enName: `${prefix}_subRepaymentAccount`, cnName: `子公司${i}-核企还款账户`, value: s.repaymentAccount });
      rows.push({ step: s2, enName: `${prefix}_subRepaymentBank`, cnName: `子公司${i}-还款户开户行`, value: s.repaymentBank });
      rows.push({ step: s2, enName: `${prefix}_subRepaymentUnionCode`, cnName: `子公司${i}-还款户联行号`, value: s.repaymentUnionCode });
    });
  } else {
    rows.push({ step: s2, enName: 'groupModeSkipped', cnName: '跳过集团模式详情', value: '非集团模式（已跳过）' });
  }

  // ===== 3.银行信息（原步骤4）=====
  const s3 = '3.银行信息';
  rows.push({ step: s3, enName: 'branchName', cnName: '支行名称（投资人）', value: bankInfo.branchName });
  rows.push({ step: s3, enName: 'branchCreditCode', cnName: '支行社会信用代码', value: bankInfo.branchCreditCode });
  rows.push({ step: s3, enName: 'creditStartDate', cnName: '授信起始日', value: bankInfo.creditStartDate });
  rows.push({ step: s3, enName: 'creditEndDate', cnName: '授信终止日', value: bankInfo.creditEndDate });
  rows.push({ step: s3, enName: 'latestDueDate', cnName: '最晚业务到期日', value: getLatestDueDate(bankInfo.creditEndDate) });
  rows.push({ step: s3, enName: 'managerName', cnName: '客户经理姓名', value: bankInfo.managerName });
  rows.push({ step: s3, enName: 'managerPhone', cnName: '客户经理手机号', value: bankInfo.managerPhone });
  rows.push({ step: s3, enName: 'branchRegion', cnName: '支行所在省市区', value: bankInfo.branchRegion });
  rows.push({ step: s3, enName: 'branchProvince', cnName: '支行所在省', value: bankInfo.branchProvince });
  rows.push({ step: s3, enName: 'branchCity', cnName: '支行所在市', value: bankInfo.branchCity });
  rows.push({ step: s3, enName: 'branchArea', cnName: '支行所在区', value: bankInfo.branchArea });
  rows.push({ step: s3, enName: 'branchAddress', cnName: '支行详细地址', value: bankInfo.branchAddress });

  // ===== 4.账户信息（原步骤5收款户 + 一般户）=====
  const s4 = '4.账户信息';
  rows.push({ step: s4, enName: 'initiatorAccountName', cnName: '一般户户名', value: coreInfo.initiatorName });
  rows.push({ step: s4, enName: 'initiatorAccount', cnName: '一般户账号', value: bankInfo.initiatorAccount });
  rows.push({ step: s4, enName: 'initiatorBank', cnName: '一般户开户行', value: bankInfo.initiatorBank });
  rows.push({ step: s4, enName: 'recvAccountName', cnName: '收款户名', value: receiveAccount.accountName });
  rows.push({ step: s4, enName: 'recvAccountNumber', cnName: '收款账号', value: receiveAccount.accountNumber });
  rows.push({ step: s4, enName: 'recvIdentifier', cnName: '识别号', value: receiveAccount.identifier || '' });
  rows.push({ step: s4, enName: 'recvBankName', cnName: '开户行', value: recvBankName });
  rows.push({ step: s4, enName: 'recvUnionCode', cnName: '联行号', value: receiveAccount.unionCode });

  // ===== 5.利率信息（原步骤6）=====
  const s5 = '5.利率信息';
  rows.push({ step: s5, enName: 'financingRate', cnName: '银行融资利率（预计）', value: `${rateInfo.financingRate}%` });
  rows.push({ step: s5, enName: 'financingRateType', cnName: '银行融资利率-类型', value: rateInfo.financingRateType || '年化' });
  rows.push({ step: s5, enName: 'factoringFee', cnName: '银行保理手续费（预计）', value: `${rateInfo.factoringFee}%` });
  rows.push({ step: s5, enName: 'factoringFeeType', cnName: '银行保理手续费-类型', value: rateInfo.factoringFeeType || '非年化' });
  rows.push({ step: s5, enName: 'platformFee', cnName: '中企云链平台手续费平台综合服务费率', value: `${rateInfo.platformFee}%` });
  rows.push({ step: s5, enName: 'platformFeeType', cnName: '平台综合服务费率-类型', value: rateInfo.platformFeeType || '年化' });
  if (rateInfo.sponsorFee !== undefined) {
    rows.push({ step: s5, enName: 'sponsorFee', cnName: '保荐费（如有）', value: `${rateInfo.sponsorFee}%` });
    rows.push({ step: s5, enName: 'sponsorFeeType', cnName: '保荐费-类型', value: rateInfo.sponsorFeeType || '年化' });
  }

  // ===== 6.合同参数（原步骤7）=====
  const s6 = '6.合同参数';
  const sub0Quota = subsidiaries[0]?.quota || 0;
  const isGroup = coreInfo.isGroupMode === '是';

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

  rows.push({ step: s6, enName: 'signatory', cnName: '核心企业签约主体', value: signatory });
  rows.push({ step: s6, enName: 'quotaLetterGroupMode', cnName: '额度函-集团模式', value: isGroup ? '集团企业' : '核心企业' });
  rows.push({ step: s6, enName: 'conCreditStartDate', cnName: '合同授信起始日', value: bankInfo.creditStartDate ? format(new Date(bankInfo.creditStartDate), 'yyyy年MM月dd日') : '' });
  rows.push({ step: s6, enName: 'conCreditEndDate', cnName: '合同授信终止日', value: bankInfo.creditEndDate ? format(new Date(bankInfo.creditEndDate), 'yyyy年MM月dd日') : '' });
  rows.push({ step: s6, enName: 'anchorAccountName', cnName: '核心企业账户名称', value: !isGroup || sub0Quota > 0 ? coreInfo.initiatorName : '/' });
  rows.push({ step: s6, enName: 'anchorAccountBank', cnName: '核心企业账户开户行', value: !isGroup || sub0Quota > 0 ? bankInfo.initiatorBank : '/' });
  rows.push({ step: s6, enName: 'anchorAccountNo', cnName: '核心企业账户账号', value: !isGroup || sub0Quota > 0 ? bankInfo.initiatorAccount : '/' });
  rows.push({ step: s6, enName: 'coanchorAccountName', cnName: '共同买方账户名称', value: isGroup && sub0Quota < coreInfo.cloudQuota ? coreInfo.initiatorName : '/' });
  rows.push({ step: s6, enName: 'coanchorAccountBank', cnName: '共同买方账户开户行', value: isGroup && sub0Quota < coreInfo.cloudQuota ? bankInfo.initiatorBank : '/' });
  rows.push({ step: s6, enName: 'coanchorAccountNo', cnName: '共同买方账户账号', value: isGroup && sub0Quota < coreInfo.cloudQuota ? bankInfo.initiatorAccount : '/' });
  rows.push({ step: s6, enName: 'sumplatfee', cnName: '平台总收费', value: String(Math.round(((rateInfo.platformFee || 0) + (rateInfo.sponsorFee || 0)) * 10000) / 10000) });
  rows.push({ step: s6, enName: 'sumconsubQuota', cnName: '已分配额度', value: String(subsidiaries.reduce((sum, s) => sum + (s.quota || 0), 0)) });
  rows.push({ step: s6, enName: 'cloudQuotaChinese', cnName: '云信额度（大写）', value: numberToChinese(coreInfo.cloudQuota * 10000) + '元' });
  rows.push({ step: s6, enName: 'shitNO', cnName: '投资人组织机构代码', value: bankInfo.branchCreditCode.substring(8, 17) });
  rows.push({ step: s6, enName: 'conrecvAccountName', cnName: '信息表-收款账户', value: receiveAccount.accountName });
  rows.push({ step: s6, enName: 'conrecvAccountNo', cnName: '信息表-收款账号', value: receiveAccount.identifier || receiveAccount.accountNumber });
  rows.push({ step: s6, enName: 'sponsorFeeNotice', cnName: '保荐费说明', value: rateInfo.sponsorFee ? `除上述表格内费用外，上述额度签发的云信业务，我司确认并委托中企云链平台收取保荐费，收费标准${rateInfo.sponsorFeeType || '年化'}${rateInfo.sponsorFee}%。` : ' ' });

  const effectiveSubCount = getEffectiveSubCount(subsidiaries);
  for (let i = 0; i < effectiveSubCount; i++) {
    if (i === 0) {
      rows.push({ step: s6, enName: 'consub0_subName', cnName: '额度函-母公司', value: coreInfo.initiatorName });
    } else {
      const sub = subsidiaries[i];
      rows.push({ step: s6, enName: `consub${i}_subName`, cnName: `额度函-子公司${i}`, value: sub && sub.name.trim() ? sub.name : '-' });
    }

    if (i === 0) {
      rows.push({ step: s6, enName: 'consub0_subQuota', cnName: '额度函-母公司额度', value: isGroup ? String(subsidiaries[0]?.quota || 0) : String(coreInfo.cloudQuota) });
    } else {
      const sub = subsidiaries[i];
      rows.push({ step: s6, enName: `consub${i}_subQuota`, cnName: `额度函-子公司额度${i}`, value: sub && sub.quota ? String(sub.quota) : '-' });
    }

    if (i === 0) {
      rows.push({ step: s6, enName: 'conrate0', cnName: '额度函-银行利率0', value: `${rateInfo.financingRate}%（${rateInfo.financingRateType || '年化'}）` });
    } else {
      const sub = subsidiaries[i];
      rows.push({ step: s6, enName: `conrate${i}`, cnName: `额度函-银行利率${i}`, value: sub && sub.quota ? `${rateInfo.financingRate}%（${rateInfo.financingRateType || '年化'}）` : '-' });
    }

    if (i === 0) {
      rows.push({ step: s6, enName: 'conbankfee0', cnName: '额度函-银行费率0', value: `${rateInfo.factoringFee}%（${rateInfo.factoringFeeType || '非年化'}）` });
    } else {
      const sub = subsidiaries[i];
      rows.push({ step: s6, enName: `conbankfee${i}`, cnName: `额度函-银行费率${i}`, value: sub && sub.quota ? `${rateInfo.factoringFee}%（${rateInfo.factoringFeeType || '非年化'}）` : '-' });
    }

    if (i === 0) {
      rows.push({ step: s6, enName: 'conplatfee0', cnName: '额度函-平台费0', value: `${rateInfo.platformFee}%（${rateInfo.platformFeeType || '年化'}）` });
    } else {
      const sub = subsidiaries[i];
      rows.push({ step: s6, enName: `conplatfee${i}`, cnName: `额度函-平台费${i}`, value: sub && sub.quota ? `${rateInfo.platformFee}%（${rateInfo.platformFeeType || '年化'}）` : '-' });
    }
  }

  rows.push({ step: s6, enName: 'quotaLetterShortName', cnName: '额度函-额度简称', value: getEffectiveQuotaName(state) });



  // ===== 7.合同模板变量（原步骤15）=====
  const s7 = '7.合同模板变量';

  const EXEMPT_CLEARING_METHODS = ['推荐：中信清分', '线上：中信过渡户清分'];
  const needRepaymentAccount = !EXEMPT_CLEARING_METHODS.includes(coreInfo.clearingMethod);
  const repaymentLetterAccountName = needRepaymentAccount ? coreInfo.initiatorName : '';
  const repaymentLetterAccount = needRepaymentAccount ? coreInfo.repaymentAccount : '';
  const repaymentLetterBank = needRepaymentAccount ? coreInfo.repaymentBank : '';
  const repaymentLetterUnionCode = needRepaymentAccount ? coreInfo.repaymentUnionCode : '';
  const tplAnchorName = !isGroup || sub0Quota > 0 ? coreInfo.initiatorName : '/';
  const tplAnchorBank = !isGroup || sub0Quota > 0 ? bankInfo.initiatorBank : '/';
  const tplAnchorNo = !isGroup || sub0Quota > 0 ? bankInfo.initiatorAccount : '/';
  const tplCoanchorName = isGroup && sub0Quota < coreInfo.cloudQuota ? coreInfo.initiatorName : '/';
  const tplCoanchorBank = isGroup && sub0Quota < coreInfo.cloudQuota ? bankInfo.initiatorBank : '/';
  const tplCoanchorNo = isGroup && sub0Quota < coreInfo.cloudQuota ? bankInfo.initiatorAccount : '/';
  const allocatedQuota = subsidiaries.reduce((sum, s) => sum + (s.quota || 0), 0);
  const tempNoQuotaAllocation = coreInfo.cloudQuota - allocatedQuota;

  rows.push({ step: s7, enName: '额度发起方名称', cnName: '额度发起方名称', value: coreInfo.initiatorName });
  rows.push({ step: s7, enName: '统一社会信用代码', cnName: '统一社会信用代码', value: coreInfo.creditCode });
  rows.push({ step: s7, enName: '云信额度', cnName: '云信额度', value: numberToChinese(coreInfo.cloudQuota * 10000) + '元' });
  rows.push({ step: s7, enName: '是否集团模式', cnName: '是否集团模式', value: coreInfo.isGroupMode });
  rows.push({ step: s7, enName: '清分方式', cnName: '清分方式', value: coreInfo.clearingMethod });
  rows.push({ step: s7, enName: '核企还款账户', cnName: '核企还款账户', value: coreInfo.repaymentAccount });
  rows.push({ step: s7, enName: '还款户开户行', cnName: '还款户开户行', value: coreInfo.repaymentBank });
  rows.push({ step: s7, enName: '还款户联行号', cnName: '还款户联行号', value: coreInfo.repaymentUnionCode });
  rows.push({ step: s7, enName: '付息方', cnName: '付息方', value: coreInfo.interestPayer });
  rows.push({ step: s7, enName: '买方付息详情', cnName: '买方付息详情', value: coreInfo.buyerInterestDetail });
  rows.push({ step: s7, enName: '支行名称', cnName: '支行名称', value: bankInfo.branchName });
  rows.push({ step: s7, enName: '授信起始日', cnName: '授信起始日', value: bankInfo.creditStartDate });
  rows.push({ step: s7, enName: '授信终止日', cnName: '授信终止日', value: bankInfo.creditEndDate });
  rows.push({ step: s7, enName: '最晚业务到期日', cnName: '最晚业务到期日', value: getLatestDueDate(bankInfo.creditEndDate) });
  rows.push({ step: s7, enName: '客户经理姓名', cnName: '客户经理姓名', value: bankInfo.managerName });
  rows.push({ step: s7, enName: '客户经理手机号', cnName: '客户经理手机号', value: bankInfo.managerPhone });
  rows.push({ step: s7, enName: '支行所在省市区', cnName: '支行所在省市区', value: bankInfo.branchRegion });
  rows.push({ step: s7, enName: '支行详细地址', cnName: '支行详细地址', value: bankInfo.branchAddress });
  rows.push({ step: s7, enName: '交行结算账户', cnName: '交行结算账户', value: bankInfo.initiatorAccount });
  rows.push({ step: s7, enName: '结算账户开户行', cnName: '结算账户开户行', value: bankInfo.initiatorBank });
  rows.push({ step: s7, enName: '支行社会信用代码', cnName: '支行社会信用代码', value: bankInfo.branchCreditCode });
  rows.push({ step: s7, enName: '收款户名', cnName: '收款户名', value: receiveAccount.accountName });
  rows.push({ step: s7, enName: '收款账号', cnName: '收款账号', value: receiveAccount.accountNumber });
  rows.push({ step: s7, enName: '开户行_收款户', cnName: '开户行_收款户', value: recvBankName });
  rows.push({ step: s7, enName: '联行号', cnName: '联行号', value: receiveAccount.unionCode });
  rows.push({ step: s7, enName: '银行融资利率', cnName: '银行融资利率', value: `${rateInfo.financingRate}%` });
  rows.push({ step: s7, enName: '银行保理手续费', cnName: '银行保理手续费', value: `${rateInfo.factoringFee}%` });
  rows.push({ step: s7, enName: '平台手续费', cnName: '平台手续费', value: `${rateInfo.platformFee}%` });
  rows.push({ step: s7, enName: '额度简称', cnName: '额度简称', value: getEffectiveQuotaName(state) });
  rows.push({ step: s7, enName: '三方协议版本', cnName: '三方协议版本', value: '三方协议' });
  rows.push({ step: s7, enName: '还款函_抬头前缀', cnName: '还款函_抬头前缀', value: coreInfo.isGroupMode === '是' ? '基于上属集团' : '基于' });
  rows.push({ step: s7, enName: '还款函_清分方式', cnName: '还款函_清分方式', value: coreInfo.clearingMethod });
  rows.push({ step: s7, enName: '还款函_账户名称', cnName: '还款函_账户名称', value: repaymentLetterAccountName });
  rows.push({ step: s7, enName: '还款函_账号', cnName: '还款函_账号', value: repaymentLetterAccount });
  rows.push({ step: s7, enName: '还款函_开户行', cnName: '还款函_开户行', value: repaymentLetterBank });
  rows.push({ step: s7, enName: '还款函_联行号', cnName: '还款函_联行号', value: repaymentLetterUnionCode });
  rows.push({ step: s7, enName: '还款函_日期', cnName: '还款函_日期', value: format(new Date(), 'yyyy-MM-dd') });
  rows.push({ step: s7, enName: '核心企业签约主体', cnName: '核心企业签约主体', value: signatory });
  rows.push({ step: s7, enName: '合同授信起始日', cnName: '合同授信起始日', value: bankInfo.creditStartDate ? format(new Date(bankInfo.creditStartDate), 'yyyy-MM-dd') : '' });
  rows.push({ step: s7, enName: '合同授信终止日', cnName: '合同授信终止日', value: bankInfo.creditEndDate ? format(new Date(bankInfo.creditEndDate), 'yyyy-MM-dd') : '' });
  rows.push({ step: s7, enName: '核心企业账户名称', cnName: '核心企业账户名称', value: tplAnchorName });
  rows.push({ step: s7, enName: '核心企业账户开户行', cnName: '核心企业账户开户行', value: tplAnchorBank });
  rows.push({ step: s7, enName: '核心企业账户账号', cnName: '核心企业账户账号', value: tplAnchorNo });
  rows.push({ step: s7, enName: '共同买方账户名称', cnName: '共同买方账户名称', value: tplCoanchorName });
  rows.push({ step: s7, enName: '共同买方账户开户行', cnName: '共同买方账户开户行', value: tplCoanchorBank });
  rows.push({ step: s7, enName: '共同买方账户账号', cnName: '共同买方账户账号', value: tplCoanchorNo });
  rows.push({ step: s7, enName: 'signatory', cnName: 'signatory', value: signatory });
  rows.push({ step: s7, enName: 'conCreditStartDate', cnName: 'conCreditStartDate', value: bankInfo.creditStartDate ? format(new Date(bankInfo.creditStartDate), 'yyyy-MM-dd') : '' });
  rows.push({ step: s7, enName: 'conCreditEndDate', cnName: 'conCreditEndDate', value: bankInfo.creditEndDate ? format(new Date(bankInfo.creditEndDate), 'yyyy-MM-dd') : '' });
  rows.push({ step: s7, enName: 'anchorAccountName', cnName: 'anchorAccountName', value: tplAnchorName });
  rows.push({ step: s7, enName: 'anchorAccountBank', cnName: 'anchorAccountBank', value: tplAnchorBank });
  rows.push({ step: s7, enName: 'anchorAccountNo', cnName: 'anchorAccountNo', value: tplAnchorNo });
  rows.push({ step: s7, enName: 'coanchorAccountName', cnName: 'coanchorAccountName', value: tplCoanchorName });
  rows.push({ step: s7, enName: 'coanchorAccountBank', cnName: 'coanchorAccountBank', value: tplCoanchorBank });
  rows.push({ step: s7, enName: 'coanchorAccountNo', cnName: 'coanchorAccountNo', value: tplCoanchorNo });
  rows.push({ step: s7, enName: 'initiatorName', cnName: 'initiatorName', value: coreInfo.initiatorName });
  rows.push({ step: s7, enName: 'creditCode', cnName: 'creditCode', value: coreInfo.creditCode });
  rows.push({ step: s7, enName: 'cloudQuota', cnName: 'cloudQuota', value: String(coreInfo.cloudQuota) });
  rows.push({ step: s7, enName: 'sumplatfee', cnName: 'sumplatfee', value: String(Math.round(((rateInfo.platformFee || 0) + (rateInfo.sponsorFee || 0)) * 10000) / 10000) });
  rows.push({ step: s7, enName: 'sumconsubQuota', cnName: 'sumconsubQuota', value: String(subsidiaries.reduce((sum, s) => sum + (s.quota || 0), 0)) });
  rows.push({ step: s7, enName: 'cloudQuotaChinese', cnName: 'cloudQuotaChinese', value: numberToChinese(coreInfo.cloudQuota * 10000) + '元' });
  rows.push({ step: s7, enName: 'isGroupMode', cnName: 'isGroupMode', value: coreInfo.isGroupMode });
  rows.push({ step: s7, enName: 'clearingMethod', cnName: 'clearingMethod', value: coreInfo.clearingMethod });
  rows.push({ step: s7, enName: 'repaymentAccount', cnName: 'repaymentAccount', value: coreInfo.repaymentAccount });
  rows.push({ step: s7, enName: 'repaymentBank', cnName: 'repaymentBank', value: coreInfo.repaymentBank });
  rows.push({ step: s7, enName: 'repaymentUnionCode', cnName: 'repaymentUnionCode', value: coreInfo.repaymentUnionCode });
  rows.push({ step: s7, enName: 'interestPayer', cnName: 'interestPayer', value: coreInfo.interestPayer });
  rows.push({ step: s7, enName: 'buyerInterestDetail', cnName: 'buyerInterestDetail', value: coreInfo.buyerInterestDetail });
  rows.push({ step: s7, enName: 'branchName', cnName: 'branchName', value: bankInfo.branchName });
  rows.push({ step: s7, enName: 'branchCreditCode', cnName: 'branchCreditCode', value: bankInfo.branchCreditCode });
  rows.push({ step: s7, enName: 'creditStartDate', cnName: 'creditStartDate', value: bankInfo.creditStartDate ? format(new Date(bankInfo.creditStartDate), 'yyyy-MM-dd') : '' });
  rows.push({ step: s7, enName: 'creditEndDate', cnName: 'creditEndDate', value: bankInfo.creditEndDate ? format(new Date(bankInfo.creditEndDate), 'yyyy-MM-dd') : '' });
  rows.push({ step: s7, enName: 'latestDueDate', cnName: 'latestDueDate', value: getLatestDueDate(bankInfo.creditEndDate) });
  rows.push({ step: s7, enName: 'managerName', cnName: 'managerName', value: bankInfo.managerName });
  rows.push({ step: s7, enName: 'managerPhone', cnName: 'managerPhone', value: bankInfo.managerPhone });
  rows.push({ step: s7, enName: 'branchRegion', cnName: 'branchRegion', value: bankInfo.branchRegion });
  rows.push({ step: s7, enName: 'branchAddress', cnName: 'branchAddress', value: bankInfo.branchAddress });
  rows.push({ step: s7, enName: 'settlementAccount', cnName: 'settlementAccount', value: bankInfo.initiatorAccount });
  rows.push({ step: s7, enName: 'settlementBank', cnName: 'settlementBank', value: bankInfo.initiatorBank });
  rows.push({ step: s7, enName: 'recvAccountName', cnName: 'recvAccountName', value: receiveAccount.accountName });
  rows.push({ step: s7, enName: 'recvAccountNumber', cnName: 'recvAccountNumber', value: receiveAccount.accountNumber });
  rows.push({ step: s7, enName: 'recvBankName', cnName: 'recvBankName', value: recvBankName });
  rows.push({ step: s7, enName: 'recvUnionCode', cnName: 'recvUnionCode', value: receiveAccount.unionCode });
  rows.push({ step: s7, enName: 'recvIdentifier', cnName: 'recvIdentifier', value: receiveAccount.identifier || '' });
  rows.push({ step: s7, enName: 'financingRate', cnName: 'financingRate', value: `${rateInfo.financingRate}%` });
  rows.push({ step: s7, enName: 'factoringFee', cnName: 'factoringFee', value: `${rateInfo.factoringFee}%` });
  rows.push({ step: s7, enName: 'platformFee', cnName: 'platformFee', value: `${rateInfo.platformFee}%` });
  rows.push({ step: s7, enName: 'quotaShortName', cnName: 'quotaShortName', value: getEffectiveQuotaName(state) });
  rows.push({ step: s7, enName: 'quotaLetterShortName', cnName: 'quotaLetterShortName', value: getEffectiveQuotaName(state) });
  rows.push({ step: s7, enName: 'tempNoQuotaAllocation', cnName: 'tempNoQuotaAllocation', value: String(tempNoQuotaAllocation) });
  rows.push({ step: s7, enName: 'quotaLetterGroupMode', cnName: 'quotaLetterGroupMode', value: isGroup ? '集团企业' : '核心企业' });
  rows.push({ step: s7, enName: '立项类型', cnName: '立项类型', value: otherInfo.projectType });
  rows.push({ step: s7, enName: 'projectType', cnName: 'projectType', value: otherInfo.projectType });
  rows.push({ step: s7, enName: 'protocolVersion', cnName: 'protocolVersion', value: '三方协议' });
  rows.push({ step: s7, enName: 'rlPrefix', cnName: 'rlPrefix', value: coreInfo.isGroupMode === '是' ? '基于上属集团' : '基于' });
  rows.push({ step: s7, enName: 'rlClearingMethod', cnName: 'rlClearingMethod', value: coreInfo.clearingMethod });
  rows.push({ step: s7, enName: 'rlAccountName', cnName: 'rlAccountName', value: repaymentLetterAccountName });
  rows.push({ step: s7, enName: 'rlAccount', cnName: 'rlAccount', value: repaymentLetterAccount });
  rows.push({ step: s7, enName: 'rlBankName', cnName: 'rlBankName', value: repaymentLetterBank });
  rows.push({ step: s7, enName: 'rlUnionCode', cnName: 'rlUnionCode', value: repaymentLetterUnionCode });
  rows.push({ step: s7, enName: 'rlDate', cnName: 'rlDate', value: format(new Date(), 'yyyy-MM-dd') });
  rows.push({ step: s7, enName: 'shitNO', cnName: 'shitNO', value: bankInfo.branchCreditCode.substring(8, 17) });
  rows.push({ step: s7, enName: 'conrecvAccountName', cnName: 'conrecvAccountName', value: receiveAccount.accountName });

  return rows;
}

export function getExcelFileName(state: FormState): string {
  const dateStr = format(new Date(), 'yyyyMMdd');
  const shortName = getEffectiveQuotaName(state);
  return `供应链金融立项参数_${shortName}_${dateStr}.xlsx`;
}
