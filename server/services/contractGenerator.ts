import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import JSZip from 'jszip';
import { fileURLToPath } from 'url';
import type { FormState } from '../../src/types/form.js';

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
/**
 * 合并被拆分的 {{变量}}
 * 处理 Word 将 {{、变量名、}} 拆分到不同 run 的情况
 */
function mergeSplitVariables(xml: string): string {
  // 通用处理：将跨多个 run 的 {{...}} 变量合并为单个 run
  // 检测 <w:t> 内容以 {{ 开头但不含 }}，向后查找包含 }} 的后续 run
  xml = xml.replace(
    /(<w:t[^>]*>)\{\{([^}<]*)<\/w:t><\/w:r>([\s\S]*?)<w:t[^>]*>([^}<]*)\}\}<\/w:t>/g,
    (match, tStart, prefix, middle, suffix) => {
      // 提取中间所有 <w:t>...</w:t> 的文本
      const texts: string[] = [];
      middle.replace(/<w:t[^>]*>([^<]*)<\/w:t>/g, (_, t) => { texts.push(t); return ''; });
      return `${tStart}{{${prefix}${texts.join('')}${suffix}}}</w:t>`;
    }
  );
  // 4-run split: {{</w:t></w:r><w:r>...<w:t>part1</w:t></w:r><w:r>...<w:t>part2</w:t></w:r><w:r>...<w:t>}}</w:t>
  xml = xml.replace(
    /<w:t[^>]*>\{\{<\/w:t><\/w:r><w:r>[\s\S]*?<w:t[^>]*>([^}<]+)<\/w:t><\/w:r><w:r>[\s\S]*?<w:t[^>]*>([^}<]+)<\/w:t><\/w:r><w:r>[\s\S]*?<w:t[^>]*>\}\}<\/w:t>/g,
    (_, part1, part2) => `<w:t>{{${part1.trim()}${part2.trim()}}}</w:t>`
  );
  // 3-run split: <w:t...>{{</w:t></w:r><w:r>...<w:t...>varName</w:t></w:r><w:r>...<w:t...>}}</w:t>
  xml = xml.replace(
    /<w:t[^>]*>\{\{<\/w:t><\/w:r><w:r>[\s\S]*?<w:t[^>]*>([^}<]+)<\/w:t><\/w:r><w:r>[\s\S]*?<w:t[^>]*>\}\}<\/w:t>/g,
    (_, varName) => `<w:t>{{${varName.trim()}}}</w:t>`
  );
  // 2-run split: {{part1</w:t></w:r><w:r>...<w:t>part2}}
  xml = xml.replace(
    /\{\{([^}<]*)<\/w:t><\/w:r><w:r>[\s\S]*?<w:t[^>]*>([^}<]*)\}\}/g,
    (_, part1, part2) => `{{${part1}${part2}}}`
  );
  return xml;
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
 * 数字转中文大写（支持到万亿级）
 * 将 4 位以内的数字转换为中文大写
 */
function convertFourDigits(numStr: string): string {
  const CN_NUMBERS = ['零', '壹', '贰', '叁', '肆', '伍', '陆', '柒', '捌', '玖'];
  const CN_UNITS = ['', '拾', '佰', '仟'];
  let result = '';
  let hasNonZero = false;
  let lastWasZero = false;

  for (let i = 0; i < numStr.length; i++) {
    const digit = parseInt(numStr[i]);
    const unit = CN_UNITS[numStr.length - 1 - i];

    if (digit === 0) {
      if (hasNonZero && !lastWasZero) {
        result += CN_NUMBERS[0];
        lastWasZero = true;
      }
    } else {
      hasNonZero = true;
      lastWasZero = false;
      result += CN_NUMBERS[digit] + unit;
    }
  }

  return result.replace(/零+$/, '');
}

/**
 * 将阿拉伯数字转换为中文大写金额（元）
 * 输入单位为"万元"，内部乘以 10000 转为元后转换
 */
function numberToChinese(amountWan: number): string {
  if (amountWan === 0) return '零元';

  const num = amountWan * 10000;
  const numStr = Math.floor(num).toString();

  // 补零到 4 的倍数
  const padLength = (4 - (numStr.length % 4)) % 4;
  const padded = '0'.repeat(padLength) + numStr;

  const groups: string[] = [];
  for (let i = 0; i < padded.length; i += 4) {
    groups.push(padded.substring(i, i + 4));
  }

  const bigUnits = ['', '万', '亿', '万亿'];
  let result = '';

  for (let i = 0; i < groups.length; i++) {
    const groupValue = parseInt(groups[i]);
    const groupText = convertFourDigits(groups[i]);
    const bigUnit = bigUnits[groups.length - 1 - i];

    if (groupValue === 0) {
      if (result && !result.endsWith('零')) {
        result += '零';
      }
    } else {
      if (result && groups[i].startsWith('0')) {
        result += '零';
      }
      result += groupText + bigUnit;
    }
  }

  return (result.replace(/零+$/, '') || '零') + '元';
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
function getEffectiveQuotaName(state: FormState, context?: { projectCreator?: string }): string {
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
function buildReplacements(state: FormState, context?: { projectCreator?: string }): Record<string, string> {
  const { coreInfo, subsidiaries, bankInfo, receiveAccount, rateInfo } = state;
  const projectCreator = context?.projectCreator;

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
    // --- 三方协议 ---
    '{{signatory}}': signatory,
    '{{conCreditStartDate}}': conCreditStartDate,
    '{{conCreditEndDate}}': conCreditEndDate,
    '{{anchorAccountName}}': anchorAccountName,
    '{{anchorAccountBank}}': anchorAccountBank,
    '{{anchorAccountNo}}': anchorAccountNo,
    '{{coanchorAccountName}}': coanchorAccountName,
    '{{coanchorAccountBank}}': coanchorAccountBank,
    '{{coanchorAccountNo}}': coanchorAccountNo,
    '{{sumplatfee}}': String(Math.round(((rateInfo.platformFee || 0) + (rateInfo.sponsorFee || 0)) * 10000) / 10000),
    '{{sumconsubQuota}}': String(state.subsidiaries.reduce((sum, s) => sum + (s.quota || 0), 0)),
    '{{cloudQuotaChinese}}': numberToChinese(coreInfo.cloudQuota),
    '{{recvAccountName}}': receiveAccount.accountName,
    '{{recvIdentifier}}': receiveAccount.identifier || '',

    // --- 投资者信息表 ---
    '{{creditCode}}': coreInfo.creditCode,
    '{{isGroupMode}}': coreInfo.isGroupMode,
    '{{branchCreditCode}}': bankInfo.branchCreditCode,
    '{{creditStartDate}}': formatDateYmd(bankInfo.creditStartDate),
    '{{creditEndDate}}': formatDateYmd(bankInfo.creditEndDate),
    '{{latestDueDate}}': latestDueDate || '',
    '{{managerPhone}}': bankInfo.managerPhone,
    '{{branchRegion}}': bankInfo.branchRegion,
    '{{branchAddress}}': bankInfo.branchAddress,
    '{{financingRate}}': `${rateInfo.financingRate}%`,
    '{{recvUnionCode}}': receiveAccount.unionCode,
    '{{shitNO}}': bankInfo.branchCreditCode.substring(8, 17),
    '{{conrecvAccountName}}': receiveAccount.accountName,
    '{{conrecvAccountNo}}': receiveAccount.identifier || receiveAccount.accountNumber,

    // --- 清分账户说明 ---
    '{{clearingMethod}}': coreInfo.clearingMethod,
    '{{repaymentAccount}}': coreInfo.repaymentAccount,
    '{{repaymentBank}}': coreInfo.repaymentBank,
    '{{repaymentUnionCode}}': coreInfo.repaymentUnionCode,

    // --- 附件6 ---
    '{{settlementAccount}}': bankInfo.initiatorAccount,
    '{{settlementBank}}': bankInfo.initiatorBank,

    // --- 额度利率确认函 ---
    '{{cloudQuota}}': String(coreInfo.cloudQuota),
    '{{quotaLetterShortName}}': getEffectiveQuotaName(state),
    '{{quotaLetterGroupMode}}': isGroup ? '集团企业' : '核心企业',
    '{{tempNoQuotaAllocation}}': String(tempNoQuotaAllocation),

    // --- 附件6 + 投资者信息表 ---
    '{{factoringFee}}': `${rateInfo.factoringFee}%`,
    '{{factoringFeeType}}': rateInfo.factoringFeeType || '非年化',
    '{{financingRateType}}': rateInfo.financingRateType || '年化',
    '{{platformFeeType}}': rateInfo.platformFeeType || '年化',
    '{{sponsorFeeNotice}}': rateInfo.sponsorFee ? `除上述表格内费用外，上述额度签发的云信业务，我司确认并委托中企云链平台收取保荐费，收费标准${rateInfo.sponsorFeeType || '年化'}${rateInfo.sponsorFee}%。` : '',

    // --- 所有模板共用 ---
    '{{initiatorName}}': coreInfo.initiatorName,
    '{{sub}}': '',
    '{{projectCreator}}': projectCreator || '',
    '{{branchName}}': bankInfo.branchName,
    '{{managerName}}': bankInfo.managerName,
    '{{recvAccountNumber}}': receiveAccount.accountNumber,
    '{{recvBankName}}': recvBankName,
  };

  // 子公司变量（额度利率确认函、核心企业清单、清分账户说明）
  const MAX_SUBS = 150;
  for (let i = 0; i < MAX_SUBS; i++) {
    // consub_subName（额度利率确认函、核心企业清单、买方付息-各自付息）
    if (i === 0) {
      result[`{{consub0_subName}}`] = coreInfo.initiatorName;
    } else {
      const sub = subsidiaries[i];
      result[`{{consub${i}_subName}}`] = sub && sub.name.trim() ? sub.name : '-';
    }

    // consub_subQuota（额度利率确认函）
    if (i === 0) {
      result[`{{consub0_subQuota}}`] = isGroup ? String(subsidiaries[0]?.quota || 0) : String(coreInfo.cloudQuota);
    } else {
      const sub = subsidiaries[i];
      result[`{{consub${i}_subQuota}}`] = sub && sub.quota ? String(sub.quota) : '-';
    }

    // conrate（额度利率确认函）— 表头已带%，数据行只填数字
    if (i === 0) {
      result[`{{conrate0}}`] = `${rateInfo.financingRate}`;
    } else {
      const sub = subsidiaries[i];
      result[`{{conrate${i}}}`] = sub && sub.quota ? `${rateInfo.financingRate}` : '-';
    }

    // conbankfee（额度利率确认函）— 表头已带%，数据行只填数字
    if (i === 0) {
      result[`{{conbankfee0}}`] = `${rateInfo.factoringFee}`;
    } else {
      const sub = subsidiaries[i];
      result[`{{conbankfee${i}}}`] = sub && sub.quota ? `${rateInfo.factoringFee}` : '-';
    }

    // conplatfee（额度利率确认函）— 表头已带%，数据行只填数字
    if (i === 0) {
      result[`{{conplatfee0}}`] = `${rateInfo.platformFee}`;
    } else {
      const sub = subsidiaries[i];
      result[`{{conplatfee${i}}}`] = sub && sub.quota ? `${rateInfo.platformFee}` : '-';
    }
  }

  // sub_sub*（清分账户说明）
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
export async function generateContractDocx(state: FormState, context?: { projectCreator?: string }): Promise<Buffer> {
  const templateBuffer = readTemplate('contract');
  const zip = await JSZip.loadAsync(templateBuffer);

  let xml = await zip.file('word/document.xml')!.async('string');
  xml = mergeWordTextRuns(xml);
  xml = mergeSplitVariables(xml);

  const replacements = buildReplacements(state, context);
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
export async function generateQuotaRateDocx(state: FormState, context?: { projectCreator?: string }): Promise<Buffer> {
  const templateBuffer = readTemplate('quotaRate');
  const zip = await JSZip.loadAsync(templateBuffer);

  let xml = await zip.file('word/document.xml')!.async('string');
  xml = mergeWordTextRuns(xml);
  xml = mergeSplitVariables(xml);

  // 统计实际子公司数量（索引 > 0 且有名称的）
  const actualSubCount = state.subsidiaries.filter((s, i) => i > 0 && s.name.trim()).length;
  
  // 如果超过 11 个子公司，需要动态添加表格行
  if (actualSubCount > 11) {
    const tblStart = xml.indexOf('<w:tbl>');
    const tblEnd = xml.indexOf('</w:tbl>');
    
    if (tblStart > -1 && tblEnd > -1) {
      // 找到 consub11 行作为模板
      const consub11Marker = '{{consub11_subName}}';
      const consub11Idx = xml.indexOf(consub11Marker);
      
      if (consub11Idx > -1) {
        // 查找 consub11 行的 <w:tr> 起始位置（注意区分 <w:tr 和 <w:trPr/<w:trHeight）
        let searchPos = consub11Idx;
        let rowStart = -1;
        while (searchPos > 0) {
          const pos = xml.lastIndexOf('<w:tr', searchPos - 1);
          if (pos === -1) break;
          // 确保是 <w:tr 后跟空格或 >，而不是 <w:trPr 或 <w:trHeight
          const nextChar = xml[pos + 5];
          if (nextChar === ' ' || nextChar === '>' || nextChar === undefined) {
            rowStart = pos;
            break;
          }
          searchPos = pos;
        }
        
        if (rowStart > -1) {
          const rowEnd = xml.indexOf('</w:tr>', rowStart) + '</w:tr>'.length;
          const templateRow = xml.substring(rowStart, rowEnd);
        
          // 生成新的表格行
          let newRows = '';
          for (let i = 12; i <= actualSubCount; i++) {
            let row = templateRow;
            // 替换序号（模板中 consub11 行的序号是 12）
            row = row.replace(/>12</, `>${i + 1}<`);
            // 替换占位符
            row = row.replace(/consub11_subName/g, `consub${i}_subName`);
            row = row.replace(/consub11_subQuota/g, `consub${i}_subQuota`);
            row = row.replace(/conrate11/g, `conrate${i}`);
            row = row.replace(/conbankfee11/g, `conbankfee${i}`);
            row = row.replace(/conplatfee11/g, `conplatfee${i}`);
            newRows += row;
          }
          
          // 插入新行到 consub11 行之后
          xml = xml.substring(0, rowEnd) + newRows + xml.substring(rowEnd);
        }
      }
    }
  }

  // 第一行额度为 0 时，隐藏该行
  const isGroup = state.coreInfo.isGroupMode === '是';
  const firstRowQuota = isGroup ? (state.subsidiaries[0]?.quota || 0) : state.coreInfo.cloudQuota;
  if (firstRowQuota === 0) {
    const marker = '{{consub0_subQuota}}';
    const idx = xml.indexOf(marker);
    if (idx !== -1) {
      // 向前查找 <w:tr，跳过 <w:trHeight、<w:trPr 等
      let searchPos = idx;
      let trStart = -1;
      while (searchPos > 0) {
        const pos = xml.lastIndexOf('<w:tr', searchPos - 1);
        if (pos === -1) break;
        const nextChar = xml[pos + 5];
        if (nextChar === ' ' || nextChar === '>' || nextChar === undefined) {
          trStart = pos;
          break;
        }
        searchPos = pos;
      }
      const trEnd = xml.indexOf('</w:tr>', idx);
      if (trStart !== -1 && trEnd !== -1) {
        xml = xml.substring(0, trStart) + xml.substring(trEnd + '</w:tr>'.length);

        // 序号从 1 重新编排
        const tblEnd = xml.indexOf('</w:tbl>');
        if (tblEnd !== -1) {
          const tblXml = xml.substring(0, tblEnd);
          let seq = 0;
          const newTbl = tblXml.replace(/<w:tr\s[^>]*>[\s\S]*?<\/w:tr>/g, (row) => {
            return row.replace(/<w:t>(\d+)<\/w:t>/, (_m, num) => {
              const n = parseInt(num, 10);
              // 只处理表格第一列（序号列），跳过其他列的数字
              // 用 <w:tc> 或 <w:tc 加空格匹配，避免误匹配 <w:tcMar> 等标签
              const beforeNum = row.substring(0, row.indexOf(`<w:t>${num}</w:t>`));
              const cellIdx = (beforeNum.match(/<w:tc(?:\s|>)/g) || []).length - 1;
              if (cellIdx === 0 && n >= 1 && n <= 200) {
                seq++;
                return `<w:t>${seq}</w:t>`;
              }
              return _m;
            });
          });
          xml = newTbl + xml.substring(tblEnd);
        }
      }
    }
  }

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

  const replacements = buildReplacements(state, context);
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
export async function generateInvestorInfoDocx(state: FormState, context?: { projectCreator?: string }): Promise<Buffer> {
  const templateBuffer = readTemplate('investor');
  const zip = await JSZip.loadAsync(templateBuffer);

  let xml = await zip.file('word/document.xml')!.async('string');
  xml = mergeWordTextRuns(xml);
  xml = mergeSplitVariables(xml);

  const replacements = buildReplacements(state, context);
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
export async function generateBuyerInterestNonGroupDocx(state: FormState, context?: { projectCreator?: string }): Promise<Buffer> {
  const templateBuffer = readTemplate('buyerInterestNonGroup');
  const zip = await JSZip.loadAsync(templateBuffer);

  let xml = await zip.file('word/document.xml')!.async('string');
  xml = mergeWordTextRuns(xml);
  xml = mergeSplitVariables(xml);

  const replacements = buildReplacements(state, context);
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
export async function generateBuyerInterestGroupSeparateDocx(state: FormState, context?: { projectCreator?: string }): Promise<Buffer> {
  const templateBuffer = readTemplate('buyerInterestGroupSeparate');
  const zip = await JSZip.loadAsync(templateBuffer);

  let xml = await zip.file('word/document.xml')!.async('string');
  xml = mergeSplitVariables(xml);

  // 统计实际子公司数量
  const actualSubCount = state.subsidiaries.filter((s, i) => i > 0 && s.name.trim()).length;

  // 找到分页符位置
  const pageBreaks: number[] = [];
  let searchStart = 0;
  while (true) {
    const idx = xml.indexOf('<w:br w:type="page"', searchStart);
    if (idx === -1) break;
    pageBreaks.push(idx);
    searchStart = idx + 1;
  }

  if (pageBreaks.length === 0) {
    throw new Error('买方付息说明模板缺少分页符');
  }

  // 找到包含分页符的段落
  function findParaStart(breakIdx: number): number {
    let pos = breakIdx;
    while (pos > 0) {
      const pStart = xml.lastIndexOf('<w:p', pos - 1);
      if (pStart === -1) return 0;
      const nextChar = xml[pStart + 4];
      if (nextChar === ' ' || nextChar === '>' || nextChar === '/') {
        const pEnd = xml.indexOf('</w:p>', pStart);
        if (pEnd > breakIdx) return pStart;
      }
      pos = pStart;
    }
    return 0;
  }

  const bodyStartIdx = xml.indexOf('<w:body>') + '<w:body>'.length;
  const bodyEndIdx = xml.indexOf('</w:body>');
  const templatePageEnd = findParaStart(pageBreaks[0]);
  const pageBreakParaEnd = xml.indexOf('</w:p>', pageBreaks[0]) + '</w:p>'.length;

  // 提取两页内容
  const page1Content = xml.substring(bodyStartIdx, templatePageEnd); // 子公司模板页
  const page2Content = xml.substring(pageBreakParaEnd, bodyEndIdx); // 集团签字确认页

  // 重新组装：集团签字页在前，子公司页在后
  let newXml = xml.substring(0, bodyStartIdx); // 保留头部
  newXml += page2Content; // 集团签字确认页

  // 为每个子公司生成页面
  for (let i = 1; i <= actualSubCount; i++) {
    newXml += '<w:p><w:r><w:br w:type="page"/></w:r></w:p>'; // 分页符
    
    // 复制模板页内容，替换占位符
    let pageContent = page1Content;
    pageContent = pageContent.replace(/consub1_sub/g, `consub${i}_sub`);
    newXml += pageContent;
  }

  newXml += xml.substring(bodyEndIdx); // 保留尾部

  // 应用变量替换
  const replacements = buildReplacements(state, context);

  // 没有子公司的名称显示为空
  Object.keys(replacements).forEach(key => {
    if (/^{{consubd+_subName}}$/.test(key) && replacements[key] === '-') {
      replacements[key] = '';
    }
  });

  newXml = applyReplacements(newXml, replacements);
  newXml = mergeWordTextRuns(newXml);
  validateReplacements(newXml);

  zip.file('word/document.xml', newXml);

  return await zip.generateAsync({
    type: 'nodebuffer',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
}

/**
 * 生成买方付息说明（集团-统一付息）
 */
export async function generateBuyerInterestGroupUnifiedDocx(state: FormState, context?: { projectCreator?: string }): Promise<Buffer> {
  const templateBuffer = readTemplate('buyerInterestGroupUnified');
  const zip = await JSZip.loadAsync(templateBuffer);

  let xml = await zip.file('word/document.xml')!.async('string');
  xml = mergeSplitVariables(xml);
  xml = mergeWordTextRuns(xml);

  xml = xml.replace(/\{\{\s*([^}\s]+)\s*\}\}/g, '{{$1}}');

  const replacements = buildReplacements(state, context);
  xml = applyReplacements(xml, replacements);

  validateReplacements(xml);

  zip.file('word/document.xml', xml);

  return await zip.generateAsync({
    type: 'nodebuffer',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
}

/**
 * 动态生成清分账户说明的子公司页面
 * 模板结构：第1页=核心企业信息，第2页=sub1模板页，第3-12页=sub2-sub11（将被删除）
 * 根据实际子公司数量，复制第2页结构并替换占位符，支持最多149个子公司
 */
function generateDynamicSubPages(
  xml: string, 
  actualSubCount: number,
  options: { templatePage?: number; useConsub?: boolean; keepTrailingPages?: number } = {}
): string {
  const { templatePage = 2, useConsub = false, keepTrailingPages = 0 } = options;
  
  // 找到所有分页符位置
  const pageBreaks: number[] = [];
  let searchStart = 0;
  while (true) {
    const idx = xml.indexOf('<w:br w:type="page"', searchStart);
    if (idx === -1) break;
    pageBreaks.push(idx);
    searchStart = idx + 1;
  }
  
  // 如果没有分页符，无法生成动态页面
  if (pageBreaks.length === 0) return xml;
  
  // 如果模板页索引超出分页符数量，无法生成动态页面
  const templatePageIdx = templatePage - 1;
  if (templatePageIdx >= pageBreaks.length) return xml;
  
  // 找到包含分页符的段落起始位置
  // 注意：必须区分 <w:p 和 <w:pPr（段落属性），后者也以 <w:p 开头
  function findParaStart(breakIdx: number): number {
    let pos = breakIdx;
    while (pos > 0) {
      const pStart = xml.lastIndexOf('<w:p', pos - 1);
      if (pStart === -1) return 0;
      // 确保是 <w:p 后跟空格、> 或 /，而不是 <w:pPr 等
      const nextChar = xml[pStart + 4];
      if (nextChar === ' ' || nextChar === '>' || nextChar === '/') {
        const pEnd = xml.indexOf('</w:p>', pStart);
        if (pEnd > breakIdx) return pStart;
      }
      pos = pStart;
    }
    return 0;
  }
  
  const bodyEndIdx = xml.indexOf('</w:body>');
  
  // 找到 <w:body> 标签结束位置（跳过 XML 声明和 <w:body> 标签）
  const bodyStartIdx = xml.indexOf('<w:body>') + '<w:body>'.length;
  
  // 模板页的结束位置 = 分页符所在段落的开始位置（不包含分页符段落）
  const templatePageEnd = findParaStart(pageBreaks[templatePageIdx]);
  
  // 提取模板页内容（从 <w:body> 之后开始，避免包含 XML 声明和 <w:body> 标签）
  const contentStart = templatePageIdx === 0 ? bodyStartIdx : (
    templatePageIdx > 0 ? xml.indexOf('</w:p>', pageBreaks[templatePageIdx - 1]) + '</w:p>'.length : 0
  );
  const templatePageContent = xml.substring(contentStart, templatePageEnd);
  
  // 确定占位符前缀
  const prefix = useConsub ? 'consub' : 'sub';
  
  // 如果只有 0 或 1 个子公司
  if (actualSubCount <= 1) {
    let newXml = xml.substring(0, templatePageEnd); // 保留到模板页结束（不含分页符）
    if (keepTrailingPages > 0 && templatePageIdx < pageBreaks.length) {
      const trailingBreakParaEnd = xml.indexOf('</w:p>', pageBreaks[templatePageIdx]) + '</w:p>'.length;
      newXml += '<w:p><w:r><w:br w:type="page"/></w:r></w:p>';
      newXml += xml.substring(trailingBreakParaEnd, bodyEndIdx);
    }
    newXml += xml.substring(bodyEndIdx);
    return newXml;
  }
  
  // 构建新文档
  let newXml = xml.substring(0, templatePageEnd); // 保留到模板页结束（不含分页符）
  
  // 在模板页后添加分页符（因为后面还有新页面）
  newXml += '<w:p><w:r><w:br w:type="page"/></w:r></w:p>';
  
  // 为 sub2 到 subN 生成页面
  for (let i = 2; i <= actualSubCount; i++) {
    // 复制模板页内容，替换 sub1/consub1 -> sub{i}/consub{i}
    let pageContent = templatePageContent;
    pageContent = pageContent.replace(new RegExp(`${prefix}1_sub`, 'g'), `${prefix}${i}_sub`);
    
    newXml += pageContent;
    
    // 添加分页符段落（放在内容之后，作为页面之间的分隔）
    // 如果不是最后一个页面，或者后面还有 trailing pages，就加分页符
    if (i < actualSubCount || keepTrailingPages > 0) {
      newXml += '<w:p><w:r><w:br w:type="page"/></w:r></w:p>';
    }
  }
  
  // 保留模板页之后的页面（如果 keepTrailingPages > 0）
  if (keepTrailingPages > 0 && templatePageIdx < pageBreaks.length) {
    const trailingBreakParaEnd = xml.indexOf('</w:p>', pageBreaks[templatePageIdx]) + '</w:p>'.length;
    newXml += xml.substring(trailingBreakParaEnd, bodyEndIdx);
  }
  
  // 添加文档结尾
  newXml += xml.substring(bodyEndIdx);
  
  return newXml;
}

/**
 * 生成清分账户说明
 * 模板结构：第1页=核心企业信息，第2页=sub1模板页，第3-12页=sub2-sub11（将被动态替换）
 * 根据实际子公司数量，复制第2页结构并替换占位符，支持最多149个子公司
 */
export async function generateClearingAccountDocx(state: FormState, context?: { projectCreator?: string }): Promise<Buffer> {
  const templateBuffer = readTemplate('clearingAccount');
  const zip = await JSZip.loadAsync(templateBuffer);

  let xml = await zip.file('word/document.xml')!.async('string');
  xml = mergeSplitVariables(xml);

  xml = xml.replace(/\{\{\s*([^}\s]+)\s*\}\}/g, '{{$1}}');

  // 统计实际子公司数量（索引 > 0 且有名称的）
  const actualSubCount = state.subsidiaries.filter((s, i) => i > 0 && s.name.trim()).length;

  // 动态生成子公司页面（在变量替换之前执行，确保 sub{i} 占位符正确生成）
  xml = generateDynamicSubPages(xml, actualSubCount);

  // 变量替换
  const replacements = buildReplacements(state, context);
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
export async function generateCoreEnterpriseListDocx(state: FormState, context?: { projectCreator?: string }): Promise<Buffer> {
  const templateBuffer = readTemplate('coreEnterpriseList');
  const zip = await JSZip.loadAsync(templateBuffer);

  let xml = await zip.file('word/document.xml')!.async('string');
  xml = mergeWordTextRuns(xml);
  xml = mergeSplitVariables(xml);

  // 统计实际子公司数量（索引 > 0 且有名称的）
  const actualSubCount = state.subsidiaries.filter((s, i) => i > 0 && s.name.trim()).length;
  
  // 如果超过 11 个子公司，需要动态添加表格行
  if (actualSubCount > 11) {
    const tblStart = xml.indexOf('<w:tbl>');
    const tblEnd = xml.indexOf('</w:tbl>');
    
    if (tblStart > -1 && tblEnd > -1) {
      // 提取最后一个数据行作为模板（row 11，即 consub11）
      const tableXml = xml.substring(tblStart, tblEnd);
      
      // 查找最后一行的 <w:tr> 起始位置（注意区分 <w:tr 和 <w:trPr/<w:trHeight）
      let searchPos = tableXml.length;
      let lastRowStart = -1;
      while (searchPos > 0) {
        const pos = tableXml.lastIndexOf('<w:tr', searchPos - 1);
        if (pos === -1) break;
        // 确保是 <w:tr 后跟空格或 >，而不是 <w:trPr 或 <w:trHeight
        const nextChar = tableXml[pos + 5];
        if (nextChar === ' ' || nextChar === '>' || nextChar === undefined) {
          lastRowStart = pos;
          break;
        }
        searchPos = pos;
      }
      
      if (lastRowStart > -1) {
        const lastRowEnd = tableXml.indexOf('</w:tr>', lastRowStart) + '</w:tr>'.length;
        const templateRow = tableXml.substring(lastRowStart, lastRowEnd);
      
        // 生成新的表格行
        let newRows = '';
        for (let i = 12; i <= actualSubCount; i++) {
          let row = templateRow;
          // 替换序号
          row = row.replace(/<w:t[^>]*>11<\/w:t>/, `<w:t>${i}</w:t>`);
          // 替换占位符
          row = row.replace(/consub11_subName/g, `consub${i}_subName`);
          newRows += row;
        }
        
        // 插入新行到表格末尾（在 </w:tbl> 之前）
        xml = xml.substring(0, tblEnd) + newRows + xml.substring(tblEnd);
      }
    }
  }

  const replacements = buildReplacements(state, context);
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
export async function generateAttachment6Docx(state: FormState, context?: { projectCreator?: string }): Promise<Buffer> {
  const templateBuffer = readTemplate('attachment6');
  const zip = await JSZip.loadAsync(templateBuffer);

  let xml = await zip.file('word/document.xml')!.async('string');
  xml = mergeSplitVariables(xml);
  xml = mergeWordTextRuns(xml);

  const replacements = buildReplacements(state, context);
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
export async function generateContractBundle(state: FormState, context?: { projectCreator?: string }): Promise<Buffer> {
  const zip = new JSZip();
  const group = state.coreInfo.isGroupMode === '是';
  const buyerInterest = state.coreInfo.interestPayer === '需要买方付息';
  const detail = state.coreInfo.buyerInterestDetail;
  const hideParamModifyContracts = state.otherInfo.projectType === '原有额度-参数修改（不涉及额度、期限）';

  if (!hideParamModifyContracts) {
    const contractBlob = await generateContractDocx(state, context);
    zip.file('三方协议.docx', contractBlob);

    const quotaRateBlob = await generateQuotaRateDocx(state, context);
    zip.file('额度利率确认函.docx', quotaRateBlob);
  }

  const investorBlob = await generateInvestorInfoDocx(state, context);
  zip.file('投资者信息表.docx', investorBlob);

  if (buyerInterest) {
    let buyerBlob: Buffer;
    if (!group) {
      buyerBlob = await generateBuyerInterestNonGroupDocx(state, context);
    } else if (detail === '子公司各自付息费') {
      buyerBlob = await generateBuyerInterestGroupSeparateDocx(state, context);
    } else if (detail === '集团统一付息') {
      buyerBlob = await generateBuyerInterestGroupUnifiedDocx(state, context);
    } else {
      throw new Error('请先选择买方付息详情');
    }
    zip.file('买方付息说明.docx', buyerBlob);
  }

  if (!EXEMPT_CLEARING_METHODS.includes(state.coreInfo.clearingMethod)) {
    const clearingBlob = await generateClearingAccountDocx(state, context);
    zip.file('清分账户说明.docx', clearingBlob);
  }

  if (group) {
    const coreListBlob = await generateCoreEnterpriseListDocx(state, context);
    zip.file('附件5-核心企业清单.docx', coreListBlob);
  }

  if (buyerInterest) {
    const attachment6Blob = await generateAttachment6Docx(state, context);
    zip.file('附件6-保理融资利息及保理费支付确认函.docx', attachment6Blob);
  }

  return await zip.generateAsync({ type: 'nodebuffer' });
}
