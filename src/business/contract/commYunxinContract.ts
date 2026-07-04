import type { FormState } from '../../types/form';
import { numberToChinese } from '../../utils/numberToChinese';
import { getEffectiveQuotaName } from '../../utils/excelMapping';
import { getLatestDueDate } from '../../utils/branchLogic';
import { formatDateYmd } from './common';
import type { ContractStrategy, ContractTemplateKey, ProtocolItemConfig } from './types';

const TEMPLATE_FILES: Record<ContractTemplateKey, string> = {
  contract: 'contract_template.docx',
  quotaRate: 'quota_rate_confirmation.docx',
  investor: 'investor_info_template.docx',
  buyerInterestNonGroup: 'buyer_interest_non_group.docx',
  buyerInterestGroupSeparate: 'buyer_interest_group_separate.docx',
  buyerInterestGroupUnified: 'buyer_interest_group_unified.docx',
  clearingAccount: 'clearing_account_template.docx',
  coreEnterpriseList: 'core_enterprise_list.docx',
  attachment6: 'attachment6_template.docx',
};

const EXEMPT_CLEARING_METHODS = ['推荐：中信清分', '线上：中信过渡户清分'];

function generateSubsidiaryTable(subsidiaries: FormState['subsidiaries']): string {
  if (subsidiaries.length === 0) return '无';
  const rows = subsidiaries.map(s => `
    <tr>
      <td style="border:1px solid #333;padding:6px;">${s.name}</td>
      <td style="border:1px solid #333;padding:6px;">${s.quota}</td>
      <td style="border:1px solid #333;padding:6px;">${s.creditCode}</td>
      <td style="border:1px solid #333;padding:6px;">${s.repaymentAccount}</td>
      <td style="border:1px solid #333;padding:6px;">${s.repaymentBank}</td>
      <td style="border:1px solid #333;padding:6px;">${s.repaymentUnionCode}</td>
    </tr>
  `).join('');

  return `
    <table style="border-collapse:collapse;width:100%;margin-top:8px;">
      <thead>
        <tr>
          <th style="border:1px solid #333;padding:6px;background:#f5f5f5;">子公司名称</th>
          <th style="border:1px solid #333;padding:6px;background:#f5f5f5;">分配额度（万元）</th>
          <th style="border:1px solid #333;padding:6px;background:#f5f5f5;">社会信用代码</th>
          <th style="border:1px solid #333;padding:6px;background:#f5f5f5;">核企还款账户</th>
          <th style="border:1px solid #333;padding:6px;background:#f5f5f5;">还款户开户行</th>
          <th style="border:1px solid #333;padding:6px;background:#f5f5f5;">还款户联行号</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function buildReplacements(state: FormState): Record<string, string> {
  const { coreInfo, subsidiaries, bankInfo, receiveAccount, rateInfo, otherInfo } = state;

  const needRepaymentAccount = !EXEMPT_CLEARING_METHODS.includes(coreInfo.clearingMethod);

  const repaymentLetterAccountName = needRepaymentAccount ? coreInfo.initiatorName : '';
  const repaymentLetterAccount = needRepaymentAccount ? coreInfo.repaymentAccount : '';
  const repaymentLetterBank = needRepaymentAccount ? coreInfo.repaymentBank : '';
  const repaymentLetterUnionCode = needRepaymentAccount ? coreInfo.repaymentUnionCode : '';

  const today = formatDateYmd(new Date());

  const sub0Quota = subsidiaries[0]?.quota || 0;
  const isGroup = coreInfo.isGroupMode === '是';

  let signatory: string;
  if (!isGroup || sub0Quota === coreInfo.cloudQuota) {
    signatory = '√核心企业/×共同买方';
  } else if (sub0Quota === 0) {
    signatory = '×核心企业/√共同买方';
  } else {
    signatory = '√核心企业/√共同买方';
  }

  const conCreditStartDate = formatDateYmd(bankInfo.creditStartDate);
  const conCreditEndDate = formatDateYmd(bankInfo.creditEndDate);
  const latestDueDate = getLatestDueDate(bankInfo.creditEndDate);

  const anchorAccountName = !isGroup || sub0Quota > 0 ? coreInfo.initiatorName : '/';
  const anchorAccountBank = !isGroup || sub0Quota > 0 ? bankInfo.initiatorBank : '/';
  const anchorAccountNo = !isGroup || sub0Quota > 0 ? bankInfo.initiatorAccount : '/';

  const coanchorAccountName = isGroup && sub0Quota < coreInfo.cloudQuota ? coreInfo.initiatorName : '/';
  const coanchorAccountBank = isGroup && sub0Quota < coreInfo.cloudQuota ? bankInfo.initiatorBank : '/';
  const coanchorAccountNo = isGroup && sub0Quota < coreInfo.cloudQuota ? bankInfo.initiatorAccount : '/';

  const recvBankName = receiveAccount.bankName.trim() || bankInfo.branchName;

  const allocatedQuota = subsidiaries.reduce((sum, s) => sum + (s.quota || 0), 0);
  const tempNoQuotaAllocation = coreInfo.cloudQuota - allocatedQuota;

  const result: Record<string, string> = {
    '{{额度发起方名称}}': coreInfo.initiatorName,
    '{{统一社会信用代码}}': coreInfo.creditCode,
    '{{云信额度}}': numberToChinese(coreInfo.cloudQuota),
    '{{是否集团模式}}': coreInfo.isGroupMode,

    '{{清分方式}}': coreInfo.clearingMethod,
    '{{核企还款账户}}': coreInfo.repaymentAccount,
    '{{还款户开户行}}': coreInfo.repaymentBank,
    '{{还款户联行号}}': coreInfo.repaymentUnionCode,
    '{{付息方}}': coreInfo.interestPayer,
    '{{买方付息详情}}': coreInfo.buyerInterestDetail,

    '{{子公司列表}}': generateSubsidiaryTable(subsidiaries),
    '{{支行名称}}': bankInfo.branchName,
    '{{授信起始日}}': formatDateYmd(bankInfo.creditStartDate),
    '{{授信终止日}}': bankInfo.creditEndDate || '',
    '{{最晚业务到期日}}': latestDueDate || '',
    '{{客户经理姓名}}': bankInfo.managerName,
    '{{客户经理手机号}}': bankInfo.managerPhone,
    '{{支行所在省市区}}': bankInfo.branchRegion,

    '{{支行详细地址}}': bankInfo.branchAddress,
    '{{交行结算账户}}': bankInfo.initiatorAccount,
    '{{结算账户开户行}}': bankInfo.initiatorBank,
    '{{支行社会信用代码}}': bankInfo.branchCreditCode,
    '{{收款户名}}': receiveAccount.accountName,
    '{{收款账号}}': receiveAccount.accountNumber,
    '{{开户行_收款户}}': recvBankName,
    '{{联行号}}': receiveAccount.unionCode,
    '{{银行融资利率}}': `${rateInfo.financingRate}%（${rateInfo.financingRateType || '年化'}）`,
    '{{银行保理手续费}}': `${rateInfo.factoringFee}%（${rateInfo.factoringFeeType || '非年化'}）`,
    '{{平台手续费}}': `${rateInfo.platformFee}%（${rateInfo.platformFeeType || '年化'}）`,
    '{{额度简称}}': getEffectiveQuotaName(state),
    '{{三方协议版本}}': '三方协议',
    '{{还款函_抬头前缀}}': coreInfo.isGroupMode === '是' ? '基于上属集团' : '基于',
    '{{还款函_清分方式}}': coreInfo.clearingMethod,
    '{{还款函_账户名称}}': repaymentLetterAccountName,
    '{{还款函_账号}}': repaymentLetterAccount,
    '{{还款函_开户行}}': repaymentLetterBank,
    '{{还款函_联行号}}': repaymentLetterUnionCode,
    '{{还款函_日期}}': today,
    '{{核心企业签约主体}}': signatory,
    '{{合同授信起始日}}': conCreditStartDate,
    '{{合同授信终止日}}': conCreditEndDate,
    '{{核心企业账户名称}}': anchorAccountName,
    '{{核心企业账户开户行}}': anchorAccountBank,
    '{{核心企业账户账号}}': anchorAccountNo,
    '{{共同买方账户名称}}': coanchorAccountName,
    '{{共同买方账户开户行}}': coanchorAccountBank,
    '{{共同买方账户账号}}': coanchorAccountNo,
    '{{signatory}}': signatory,
    '{{conCreditStartDate}}': conCreditStartDate,
    '{{conCreditEndDate}}': conCreditEndDate,
    '{{anchorAccountName}}': anchorAccountName,
    '{{anchorAccountBank}}': anchorAccountBank,
    '{{anchorAccountNo}}': anchorAccountNo,
    '{{coanchorAccountName}}': coanchorAccountName,
    '{{coanchorAccountBank}}': coanchorAccountBank,
    '{{coanchorAccountNo}}': coanchorAccountNo,
    '{{initiatorName}}': coreInfo.initiatorName,
    '{{creditCode}}': coreInfo.creditCode,
    '{{cloudQuota}}': String(coreInfo.cloudQuota),
    '{{cloudQuotaChinese}}': numberToChinese(coreInfo.cloudQuota),
    '{{isGroupMode}}': coreInfo.isGroupMode,


    '{{clearingMethod}}': coreInfo.clearingMethod,
    '{{repaymentAccount}}': coreInfo.repaymentAccount,
    '{{repaymentBank}}': coreInfo.repaymentBank,
    '{{repaymentUnionCode}}': coreInfo.repaymentUnionCode,
    '{{interestPayer}}': coreInfo.interestPayer,
    '{{buyerInterestDetail}}': coreInfo.buyerInterestDetail,

    '{{branchName}}': bankInfo.branchName,
    '{{branchCreditCode}}': bankInfo.branchCreditCode,
    '{{creditStartDate}}': formatDateYmd(bankInfo.creditStartDate),
    '{{creditEndDate}}': bankInfo.creditEndDate || '',
    '{{latestDueDate}}': latestDueDate || '',
    '{{managerName}}': bankInfo.managerName,
    '{{managerPhone}}': bankInfo.managerPhone,
    '{{branchRegion}}': bankInfo.branchRegion,
    '{{branchAddress}}': bankInfo.branchAddress,
    '{{settlementAccount}}': bankInfo.initiatorAccount,
    '{{settlementBank}}': bankInfo.initiatorBank,
    '{{recvAccountName}}': receiveAccount.accountName,
    '{{recvAccountNumber}}': receiveAccount.accountNumber,
    '{{recvIdentifier}}': receiveAccount.identifier || '',
    '{{recvBankName}}': recvBankName,
    '{{recvUnionCode}}': receiveAccount.unionCode,
    '{{financingRate}}': `${rateInfo.financingRate}%（${rateInfo.financingRateType || '年化'}）`,
    '{{factoringFee}}': `${rateInfo.factoringFee}%（${rateInfo.factoringFeeType || '非年化'}）`,
    '{{platformFee}}': `${rateInfo.platformFee}%（${rateInfo.platformFeeType || '年化'}）`,
    '{{quotaShortName}}': getEffectiveQuotaName(state),
    '{{quotaLetterShortName}}': getEffectiveQuotaName(state),
    '{{tempNoQuotaAllocation}}': String(tempNoQuotaAllocation),
    '{{quotaLetterGroupMode}}': isGroup ? '集团企业' : '核心企业',
    '{{立项类型}}': otherInfo.projectType,
    '{{projectType}}': otherInfo.projectType,
    '{{protocolVersion}}': '三方协议',
    '{{rlPrefix}}': coreInfo.isGroupMode === '是' ? '基于上属集团' : '基于',
    '{{rlClearingMethod}}': coreInfo.clearingMethod,
    '{{rlAccountName}}': repaymentLetterAccountName,
    '{{rlAccount}}': repaymentLetterAccount,
    '{{rlBankName}}': repaymentLetterBank,
    '{{rlUnionCode}}': repaymentLetterUnionCode,
    '{{rlDate}}': today,
    '{{shitNO}}': bankInfo.branchCreditCode.substring(8, 17),
    '{{conrecvAccountName}}': receiveAccount.accountNumber,
  };

  const MAX_SUBS = 150;

  for (let i = 0; i < MAX_SUBS; i++) {
    if (i === 0) {
      result[`{{consub0_subName}}`] = coreInfo.initiatorName;
    } else {
      const sub = subsidiaries[i];
      result[`{{consub${i}_subName}}`] = sub && sub.name.trim() ? sub.name : '-';
    }

    if (i === 0) {
      result[`{{consub0_subQuota}}`] = isGroup ? String(subsidiaries[0]?.quota || 0) : String(coreInfo.cloudQuota);
    } else {
      const sub = subsidiaries[i];
      result[`{{consub${i}_subQuota}}`] = sub && sub.quota ? String(sub.quota) : '-';
    }

    if (i === 0) {
      result[`{{conrate0}}`] = `${rateInfo.financingRate}%`;
    } else {
      const sub = subsidiaries[i];
      result[`{{conrate${i}}}`] = sub && sub.quota ? `${rateInfo.financingRate}%` : '-';
    }

    if (i === 0) {
      result[`{{conbankfee0}}`] = `${rateInfo.factoringFee}%`;
    } else {
      const sub = subsidiaries[i];
      result[`{{conbankfee${i}}}`] = sub && sub.quota ? `${rateInfo.factoringFee}%` : '-';
    }

    if (i === 0) {
      result[`{{conplatfee0}}`] = `${rateInfo.platformFee}%`;
    } else {
      const sub = subsidiaries[i];
      result[`{{conplatfee${i}}}`] = sub && sub.quota ? `${rateInfo.platformFee}%` : '-';
    }
  }

  const subNames = subsidiaries.slice(1)
    .map(s => s.name.trim())
    .filter(n => n);
  result['{{allSubsidiaryNames}}'] = subNames.join('、');

  for (let i = 1; i <= 149; i++) {
    const sub = subsidiaries[i];
    result[`{{consub${i}_subCreditCode}}`] = sub && sub.creditCode ? sub.creditCode : '-';
  }

  for (let i = 1; i <= 149; i++) {
    const sub = subsidiaries[i];
    result[`{{sub${i}_subName}}`] = sub && sub.name.trim() ? sub.name : '';
    result[`{{sub${i}_subRepaymentAccount}}`] = sub && sub.repaymentAccount.trim() ? sub.repaymentAccount : '';
    result[`{{sub${i}_subRepaymentBank}}`] = sub && sub.repaymentBank.trim() ? sub.repaymentBank : '';
    result[`{{sub${i}_subRepaymentUnionCode}}`] = sub && sub.repaymentUnionCode.trim() ? sub.repaymentUnionCode : '';
  }

  return result;
}

function getProtocolList(state: FormState): ProtocolItemConfig[] {
  const coreInfo = state.coreInfo;
  const buyerInterest = coreInfo.interestPayer === '需要买方付息';
  const hideParamModifyContracts = state.otherInfo.projectType === '原有额度-参数修改（不涉及额度、期限）';

  return [
    { name: '三方协议', status: '未签署', statusColor: 'bg-orange-100 text-orange-700', signatory: '额度发起方、银行、平台三方签署', condition: !hideParamModifyContracts },
    { name: '额度利率确认函', status: '未签署', statusColor: 'bg-orange-100 text-orange-700', signatory: '额度发起方（集团）盖章', condition: !hideParamModifyContracts },
    { name: '投资者信息表', status: '未签署', statusColor: 'bg-orange-100 text-orange-700', signatory: '银行邮件确认' },
    { name: '买方付息说明', status: '未签署', statusColor: 'bg-orange-100 text-orange-700', signatory: '所有核企都要签署', condition: buyerInterest },
    { name: '清分账户说明', status: '未签署', statusColor: 'bg-orange-100 text-orange-700', signatory: '非中信清分/中信过渡户时需签署', condition: !EXEMPT_CLEARING_METHODS.includes(coreInfo.clearingMethod) },
  ].filter(i => i.condition !== false);
}

export const commYunxinContractStrategy: ContractStrategy = {
  displayName: '交通银行云信',
  templateDir: 'comm_yunxin',
  getTemplatePath(templateKey: string): string {
    return `/ContractForm/comm_yunxin/${TEMPLATE_FILES[templateKey as ContractTemplateKey] || ''}`;
  },
  getReplacements(state: FormState): Record<string, string> {
    return buildReplacements(state);
  },
  getProtocolList(state: FormState): ProtocolItemConfig[] {
    return getProtocolList(state);
  },
  requiresClearingAccountDoc(clearingMethod: string): boolean {
    return !EXEMPT_CLEARING_METHODS.includes(clearingMethod);
  },
};
