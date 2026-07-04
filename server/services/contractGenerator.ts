import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import JSZip from 'jszip';
import { fileURLToPath } from 'url';
import type { FormState } from '../../src/types/form';

// ES module 中获取 __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 模板目录
const TEMPLATE_DIR = path.join(__dirname, '../templates/comm_yunxin');

// 模板文件映射
const TEMPLATE_FILES: Record<string, string> = {
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

// 豁免清分方式
const EXEMPT_CLEARING_METHODS = ['推荐：中信清分', '线上：中信过渡户清分'];

/**
 * 读取模板文件
 */
function readTemplate(templateKey: string): Buffer {
  const filename = TEMPLATE_FILES[templateKey];
  if (!filename) {
    throw new Error(`Unknown template key: ${templateKey}`);
  }
  const filepath = path.join(TEMPLATE_DIR, filename);
  if (!fs.existsSync(filepath)) {
    throw new Error(`Template file not found: ${filepath}`);
  }
  return fs.readFileSync(filepath);
}

/**
 * XML 转义
 */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * 合并 Word 文档中被拆分的相邻 <w:t> 文本节点
 */
function mergeWordTextRuns(xml: string): string {
  const paragraphPattern = /(<w:p(?:\s[^>]*)?>)([\s\S]*?)(<\/w:p>)/g;

  let result = xml.replace(paragraphPattern, (_match, pStart, content, pEnd) => {
    let merged = content;
    let changed = true;

    while (changed) {
      changed = false;
      merged = merged.replace(
        /<\/w:t>((?:(?!<w:t[ >]|<\/w:r>|<w:r[ >])[\s\S])*)<w:t(?:[^>]*)>/g,
        (m: string, between: string) => {
          if (/<w:t[ >]/.test(between)) {
            return m;
          }
          changed = true;
          return '';
        }
      );
    }

    return pStart + merged + pEnd;
  });

  // 保留 xml:space="preserve"
  result = result.replace(
    /<w:t(?![^>]*xml:space="preserve")([^>]*)>([^<]*?)<\/w:t>/g,
    (match, attrs, text) => {
      if (/^\s|\s$|\s{2,}/.test(text)) {
        return `<w:t xml:space="preserve"${attrs}>${text}</w:t>`;
      }
      return match;
    }
  );

  return result;
}

/**
 * 合并被拆分的 {{变量}}
 */
function mergeSplitVariables(xml: string): string {
  return xml.replace(/\{\{([\s\S]*?)\}\}/g, (_match, inner) => {
    const text = inner.replace(/<[^>]+>/g, '').trim();
    return `{{${text}}}`;
  });
}

/**
 * 删除表格中所有数据字段均为 "-" 的空数据行
 */
function removeDashRows(xml: string): string {
  return xml.replace(/<w:tr(?:\s[^>]*)?>[\s\S]*?<\/w:tr>/g, (row) => {
    const text = row.replace(/<[^>]+>/g, ' ').trim();
    const stripped = text.replace(/\s/g, '');
    if (stripped === '' || (/^[\d-]+$/.test(stripped) && stripped.includes('-'))) {
      return '';
    }
    return row;
  });
}

/**
 * 验证替换后的 XML，检查是否有残留的未替换变量
 * 返回残留变量列表（不阻断生成，仅记录警告）
 */
function validateReplacements(xml: string): string[] {
  const remaining = xml.match(/\{\{[^}]+\}\}/g);
  if (remaining && remaining.length > 0) {
    const unique = [...new Set(remaining)];
    console.warn('⚠️  合同模板中存在以下未替换变量:', unique.join(', '));
    return unique;
  }
  return [];
}

/**
 * 生成子公司表格 HTML（用于 HTML 预览）
 */
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

/**
 * 数字转中文大写
 */
function numberToChinese(num: number): string {
  const digits = ['零', '壹', '贰', '叁', '肆', '伍', '陆', '柒', '捌', '玖'];
  const units = ['', '拾', '佰', '仟'];
  const bigUnits = ['', '万', '亿'];

  if (num === 0) return '零';

  let result = '';
  let unitIndex = 0;
  let bigUnitIndex = 0;
  let needZero = false;

  while (num > 0) {
    const digit = num % 10;
    if (digit !== 0) {
      if (needZero) {
        result = digits[0] + result;
      }
      result = digits[digit] + units[unitIndex] + result;
      needZero = false;
    } else {
      needZero = true;
    }

    unitIndex++;
    if (unitIndex === 4) {
      unitIndex = 0;
      result = bigUnits[bigUnitIndex] + result;
      bigUnitIndex++;
      needZero = false;
    }

    num = Math.floor(num / 10);
  }

  return result;
}

/**
 * 获取最晚业务到期日（授信终止日 + 6个月）
 */
function getLatestDueDate(creditEndDate: string): string {
  if (!creditEndDate) return '';
  const date = new Date(creditEndDate);
  date.setMonth(date.getMonth() + 6);
  return date.toISOString().split('T')[0];
}

/**
 * 获取额度分类
 */
function getQuotaCategory(projectType: string): string {
  if (projectType === '新增额度-并入混合额度') return '混合额度';
  if (projectType === '新增额度') return '专属额度';
  return '';
}

/**
 * 获取清分方案名称
 */
function getClearingPlanName(clearingMethod: string): string {
  return clearingMethod.replace(/^[^：:]+[：:]/, '');
}

/**
 * 格式化日期
 */
function formatDateYmd(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * 获取有效额度名称
 */
function getEffectiveQuotaName(state: FormState): string {
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

  return quotaShortName.trim() || quotaName.trim() || mixedQuotaName.trim() || '未命名';
}

/**
 * 构建替换变量映射
 */
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
    '{{授信终止日}}': formatDateYmd(bankInfo.creditEndDate),
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
    '{{银行融资利率}}': `${rateInfo.financingRate}%`,
    '{{银行保理手续费}}': `${rateInfo.factoringFee}%`,
    '{{平台手续费}}': `${rateInfo.platformFee}%`,
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
    '{{creditEndDate}}': formatDateYmd(bankInfo.creditEndDate),
    '{{latestDueDate}}': latestDueDate || '',
    '{{managerName}}': bankInfo.managerName,
    '{{managerPhone}}': bankInfo.managerPhone,
    '{{branchRegion}}': bankInfo.branchRegion,
    '{{branchAddress}}': bankInfo.branchAddress,
    '{{settlementAccount}}': bankInfo.initiatorAccount,
    '{{settlementBank}}': bankInfo.initiatorBank,
    '{{recvAccountName}}': receiveAccount.accountName,
    '{{recvAccountNumber}}': receiveAccount.accountNumber,
    '{{recvBankName}}': recvBankName,
    '{{recvUnionCode}}': receiveAccount.unionCode,
    '{{recvIdentifier}}': receiveAccount.identifier || '',
    '{{financingRate}}': `${rateInfo.financingRate}%`,
    '{{factoringFee}}': `${rateInfo.factoringFee}%`,
    '{{platformFee}}': `${rateInfo.platformFee}%`,
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

  // 子公司变量
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

  const subNames = subsidiaries.slice(1).map(s => s.name.trim()).filter(n => n);
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

/**
 * 应用替换
 */
function applyReplacements(xml: string, replacements: Record<string, string>): string {
  Object.entries(replacements).forEach(([key, value]) => {
    const varName = key.replace(/^\{\{|\}\}$/g, '');
    if (xml.includes(`{{${varName}}}`)) {
      xml = xml.replaceAll(`{{${varName}}}`, escapeXml(String(value)));
    }
  });
  return xml;
}

/**
 * 生成合同文档
 */
export async function generateContractDocx(state: FormState): Promise<Buffer> {
  const templateBuffer = readTemplate('contract');
  const zip = await JSZip.loadAsync(templateBuffer);

  let xml = await zip.file('word/document.xml')!.async('string');
  xml = mergeWordTextRuns(xml);

  const replacements = buildReplacements(state);
  xml = applyReplacements(xml, replacements);

  xml = removeDashRows(xml);

  validateReplacements(xml);

  zip.file('word/document.xml', xml);

  return await zip.generateAsync({
    type: 'nodebuffer',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
}

/**
 * 生成额度利率确认函
 */
export async function generateQuotaRateDocx(state: FormState): Promise<Buffer> {
  const templateBuffer = readTemplate('quotaRate');
  const zip = await JSZip.loadAsync(templateBuffer);

  let xml = await zip.file('word/document.xml')!.async('string');
  xml = mergeWordTextRuns(xml);
  xml = mergeSplitVariables(xml);

  // 非集团模式或暂不分配额度为 0 时，隐藏对应行
  const allocatedQuota = state.subsidiaries.reduce((sum, s) => sum + (s.quota || 0), 0);
  const tempNoQuotaAllocation = state.coreInfo.cloudQuota - allocatedQuota;
  if (state.coreInfo.isGroupMode !== '是' || tempNoQuotaAllocation === 0) {
    const marker = '{{tempNoQuotaAllocation}}';
    const idx = xml.indexOf(marker);
    if (idx !== -1) {
      const trStart = xml.lastIndexOf('<w:tr', idx);
      const trEnd = xml.indexOf('</w:tr>', idx);
      if (trStart !== -1 && trEnd !== -1) {
        xml = xml.substring(0, trStart) + xml.substring(trEnd + '</w:tr>'.length);
      }
    }
  }

  const replacements = buildReplacements(state);
  xml = applyReplacements(xml, replacements);

  xml = removeDashRows(xml);

  validateReplacements(xml);

  zip.file('word/document.xml', xml);

  return await zip.generateAsync({
    type: 'nodebuffer',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
}

/**
 * 生成投资者信息表
 */
export async function generateInvestorInfoDocx(state: FormState): Promise<Buffer> {
  const templateBuffer = readTemplate('investor');
  const zip = await JSZip.loadAsync(templateBuffer);

  let xml = await zip.file('word/document.xml')!.async('string');
  xml = mergeWordTextRuns(xml);
  xml = mergeSplitVariables(xml);

  const replacements = buildReplacements(state);
  xml = applyReplacements(xml, replacements);

  xml = removeDashRows(xml);

  validateReplacements(xml);

  zip.file('word/document.xml', xml);

  return await zip.generateAsync({
    type: 'nodebuffer',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
}

/**
 * 生成买方付息说明（非集团）
 */
export async function generateBuyerInterestNonGroupDocx(state: FormState): Promise<Buffer> {
  const templateBuffer = readTemplate('buyerInterestNonGroup');
  const zip = await JSZip.loadAsync(templateBuffer);

  let xml = await zip.file('word/document.xml')!.async('string');
  xml = mergeWordTextRuns(xml);
  xml = mergeSplitVariables(xml);

  const replacements = buildReplacements(state);
  xml = applyReplacements(xml, replacements);

  validateReplacements(xml);

  zip.file('word/document.xml', xml);

  return await zip.generateAsync({
    type: 'nodebuffer',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
}

/**
 * 生成买方付息说明（集团-各自付息）
 */
export async function generateBuyerInterestGroupSeparateDocx(state: FormState): Promise<Buffer> {
  const templateBuffer = readTemplate('buyerInterestGroupSeparate');
  const zip = await JSZip.loadAsync(templateBuffer);

  let xml = await zip.file('word/document.xml')!.async('string');
  xml = mergeSplitVariables(xml);

  const replacements = buildReplacements(state);

  // 没有子公司的名称显示为空
  Object.keys(replacements).forEach(key => {
    if (/^\{\{consub\d+_subName\}\}$/.test(key) && replacements[key] === '-') {
      replacements[key] = '';
    }
  });

  xml = applyReplacements(xml, replacements);

  xml = mergeWordTextRuns(xml);

  validateReplacements(xml);

  zip.file('word/document.xml', xml);

  return await zip.generateAsync({
    type: 'nodebuffer',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
}

/**
 * 生成买方付息说明（集团-统一付息）
 */
export async function generateBuyerInterestGroupUnifiedDocx(state: FormState): Promise<Buffer> {
  const templateBuffer = readTemplate('buyerInterestGroupUnified');
  const zip = await JSZip.loadAsync(templateBuffer);

  let xml = await zip.file('word/document.xml')!.async('string');
  xml = mergeSplitVariables(xml);
  xml = mergeWordTextRuns(xml);

  xml = xml.replace(/\{\{\s*([^}\s]+)\s*\}\}/g, '{{$1}}');

  const replacements = buildReplacements(state);
  xml = applyReplacements(xml, replacements);

  validateReplacements(xml);

  zip.file('word/document.xml', xml);

  return await zip.generateAsync({
    type: 'nodebuffer',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
}

/**
 * 生成清分账户说明
 */
export async function generateClearingAccountDocx(state: FormState): Promise<Buffer> {
  const templateBuffer = readTemplate('clearingAccount');
  const zip = await JSZip.loadAsync(templateBuffer);

  let xml = await zip.file('word/document.xml')!.async('string');
  xml = mergeSplitVariables(xml);

  xml = xml.replace(/\{\{\s*([^}\s]+)\s*\}\}/g, '{{$1}}');

  const replacements = buildReplacements(state);
  xml = applyReplacements(xml, replacements);

  validateReplacements(xml);

  zip.file('word/document.xml', xml);

  return await zip.generateAsync({
    type: 'nodebuffer',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
}

/**
 * 生成核心企业清单
 */
export async function generateCoreEnterpriseListDocx(state: FormState): Promise<Buffer> {
  const templateBuffer = readTemplate('coreEnterpriseList');
  const zip = await JSZip.loadAsync(templateBuffer);

  let xml = await zip.file('word/document.xml')!.async('string');
  xml = mergeWordTextRuns(xml);
  xml = mergeSplitVariables(xml);

  const replacements = buildReplacements(state);
  xml = applyReplacements(xml, replacements);

  xml = removeDashRows(xml);

  validateReplacements(xml);

  zip.file('word/document.xml', xml);

  return await zip.generateAsync({
    type: 'nodebuffer',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
}

/**
 * 生成附件6
 */
export async function generateAttachment6Docx(state: FormState): Promise<Buffer> {
  const templateBuffer = readTemplate('attachment6');
  const zip = await JSZip.loadAsync(templateBuffer);

  let xml = await zip.file('word/document.xml')!.async('string');
  xml = mergeSplitVariables(xml);
  xml = mergeWordTextRuns(xml);

  const replacements = buildReplacements(state);
  xml = applyReplacements(xml, replacements);

  validateReplacements(xml);

  zip.file('word/document.xml', xml);

  return await zip.generateAsync({
    type: 'nodebuffer',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
}

/**
 * 生成合同包（ZIP）
 */
export async function generateContractBundle(state: FormState): Promise<Buffer> {
  const zip = new JSZip();
  const group = state.coreInfo.isGroupMode === '是';
  const buyerInterest = state.coreInfo.interestPayer === '需要买方付息';
  const detail = state.coreInfo.buyerInterestDetail;
  const hideParamModifyContracts = state.otherInfo.projectType === '原有额度-参数修改（不涉及额度、期限）';

  const dateStr = formatDateYmd(new Date()).replace(/-/g, '');
  const shortName = getEffectiveQuotaName(state);

  if (!hideParamModifyContracts) {
    const contractBlob = await generateContractDocx(state);
    zip.file(`供应链金融立项确认函_${shortName}_${dateStr}.docx`, contractBlob);

    const quotaRateBlob = await generateQuotaRateDocx(state);
    zip.file(`额度利率确认函_${shortName}_${dateStr}.docx`, quotaRateBlob);
  }

  const investorBlob = await generateInvestorInfoDocx(state);
  zip.file(`银行投资者信息表_${shortName}_${dateStr}.docx`, investorBlob);

  if (buyerInterest) {
    let buyerBlob: Buffer;
    if (!group) {
      buyerBlob = await generateBuyerInterestNonGroupDocx(state);
    } else if (detail === '子公司各自付息费') {
      buyerBlob = await generateBuyerInterestGroupSeparateDocx(state);
    } else if (detail === '集团统一付息') {
      buyerBlob = await generateBuyerInterestGroupUnifiedDocx(state);
    } else {
      throw new Error('请先选择买方付息详情');
    }
    zip.file(`买方付息说明_${shortName}_${dateStr}.docx`, buyerBlob);
  }

  if (!EXEMPT_CLEARING_METHODS.includes(state.coreInfo.clearingMethod)) {
    const clearingBlob = await generateClearingAccountDocx(state);
    zip.file(`清分账户说明_${shortName}_${dateStr}.docx`, clearingBlob);
  }

  if (group) {
    const coreListBlob = await generateCoreEnterpriseListDocx(state);
    zip.file(`附件5-核心企业清单_${shortName}_${dateStr}.docx`, coreListBlob);
  }

  const attachment6Blob = await generateAttachment6Docx(state);
  zip.file(`附件6-保理融资利息及保理费支付确认函_${shortName}_${dateStr}.docx`, attachment6Blob);

  return await zip.generateAsync({ type: 'nodebuffer' });
}
