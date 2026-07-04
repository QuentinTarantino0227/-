import type { FormState } from '../types/form';
import JSZip from 'jszip';
import { getContractStrategy } from '../business/contract';

/** 根据产品类型与合作银行选择合同模板目录 */
export function getContractTemplatePath(state: FormState, templateKey: string): string {
  return getContractStrategy(state).getTemplatePath(templateKey);
}

export function getContractReplacements(state: FormState): Record<string, string> {
  return getContractStrategy(state).getReplacements(state);
}

export const FULL_CONTRACT_TEMPLATE = `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  body { font-family: "SimSun", serif; font-size: 14px; line-height: 1.8; color: #333; max-width: 800px; margin: 0 auto; padding: 40px; }
  h1 { text-align: center; font-size: 22px; font-weight: bold; margin-bottom: 24px; }
  h2 { font-size: 16px; font-weight: bold; margin-top: 20px; margin-bottom: 12px; }
  .section { margin-bottom: 16px; }
  .field { margin-bottom: 8px; }
  .label { font-weight: bold; }
  table { width: 100%; border-collapse: collapse; margin: 8px 0; }
  th, td { border: 1px solid #333; padding: 6px 8px; text-align: left; }
  th { background: #f5f5f5; }
</style>
</head>
<body>
<h1>供应链金融立项参数确认函</h1>

<div class="section">
  <h2>一、核企信息</h2>
  <div class="field"><span class="label">额度发起方名称：</span>{{额度发起方名称}}</div>
  <div class="field"><span class="label">统一社会信用代码：</span>{{统一社会信用代码}}</div>
  <div class="field"><span class="label">云信额度：</span>{{云信额度}} 万元</div>
  <div class="field"><span class="label">是否集团模式：</span>{{是否集团模式}}</div>
  <div class="field"><span class="label">产品类型：</span>{{产品类型}}</div>
  <div class="field"><span class="label">合作银行：</span>{{合作银行}}</div>
  <div class="field"><span class="label">清分方式：</span>{{清分方式}}</div>
  <div class="field"><span class="label">核企还款账户：</span>{{核企还款账户}}</div>
  <div class="field"><span class="label">还款户开户行：</span>{{还款户开户行}}</div>
  <div class="field"><span class="label">还款户联行号：</span>{{还款户联行号}}</div>
  <div class="field"><span class="label">付息方：</span>{{付息方}}</div>
  <div class="field"><span class="label">买方付息详情：</span>{{买方付息详情}}</div>

</div>

<div class="section">
  <h2>二、集团模式子公司清单</h2>
  {{子公司列表}}
</div>

<div class="section">
  <h2>三、银行信息（投资人）</h2>
  <div class="field"><span class="label">支行名称：</span>{{支行名称}}</div>
  <div class="field"><span class="label">支行社会信用代码：</span>{{支行社会信用代码}}</div>
  <div class="field"><span class="label">授信起始日：</span>{{授信起始日}}</div>
  <div class="field"><span class="label">授信终止日：</span>{{授信终止日}}</div>
  <div class="field"><span class="label">最晚业务到期日：</span>{{最晚业务到期日}}</div>
  <div class="field"><span class="label">客户经理姓名：</span>{{客户经理姓名}}</div>
  <div class="field"><span class="label">客户经理手机号：</span>{{客户经理手机号}}</div>
  <div class="field"><span class="label">支行所在省市区：</span>{{支行所在省市区}}</div>
  <div class="field"><span class="label">支行详细地址：</span>{{支行详细地址}}</div>
  <div class="field"><span class="label">交行结算账户：</span>{{交行结算账户}}</div>
  <div class="field"><span class="label">结算账户开户行：</span>{{结算账户开户行}}</div>
</div>

<div class="section">
  <h2>四、银行收款户信息</h2>
  <div class="field"><span class="label">收款户名：</span>{{收款户名}}</div>
  <div class="field"><span class="label">收款账号：</span>{{收款账号}}</div>
  <div class="field"><span class="label">开户行：</span>{{开户行_收款户}}</div>
  <div class="field"><span class="label">联行号：</span>{{联行号}}</div>
</div>

<div class="section">
  <h2>五、利率信息</h2>
  <div class="field"><span class="label">银行融资利率（预计）：</span>{{银行融资利率}}（年化）</div>
  <div class="field"><span class="label">银行保理手续费（预计）：</span>{{银行保理手续费}}（非年化）</div>
  <div class="field"><span class="label">中企云链平台手续费平台综合服务费率：</span>{{平台手续费}}（年化）</div>
</div>

<div class="section">
  <h2>六、其他</h2>
  <div class="field"><span class="label">额度简称：</span>{{额度简称}}</div>
  <div class="field"><span class="label">落地分行：</span>{{落地分行}}</div>
  <div class="field"><span class="label">三方协议版本：</span>{{三方协议版本}}</div>
</div>

<div class="section">
  <h2>七、还款账户信息确认函</h2>
  <p>{{还款函_抬头前缀}} {{额度发起方名称}} 与贵行开展供应链金融业务，采用 {{还款函_清分方式}} 方式进行清分。</p>
  <p>还款账户信息如下：</p>
  <div class="field"><span class="label">账户名称：</span>{{还款函_账户名称}}</div>
  <div class="field"><span class="label">账号：</span>{{还款函_账号}}</div>
  <div class="field"><span class="label">开户行：</span>{{还款函_开户行}}</div>
  <div class="field"><span class="label">联行号：</span>{{还款函_联行号}}</div>
  <p style="margin-top:16px;text-align:right;">{{还款函_日期}}</p>
</div>

</body>
</html>
`;

export function generateContractHtml(state: FormState): string {
  const replacements = getContractReplacements(state);
  let html = FULL_CONTRACT_TEMPLATE;
  Object.entries(replacements).forEach(([key, value]) => {
    html = html.replaceAll(key, value);
  });
  return html;
}

// 从外部 HTML 模板加载并替换变量
export async function generateRealContractHtml(state: FormState): Promise<string> {
  // 加时间戳绕过浏览器缓存
  const response = await fetch(`${getContractTemplatePath(state, 'contract').replace(/\.docx$/, '.html')}?t=${Date.now()}`);
  let html = await response.text();

  // 清理 Word 导出 HTML：
  // 1. 去掉封面页（Word 封面和正文首页内容重复，中间有 page-break-before:always）
  // 2. 去掉 Word 特定注释和空标签
  // 3. 只保留 <style> 和正文内容
  const firstPageBreak = html.indexOf('page-break-before:always');
  if (firstPageBreak > 0) {
    // 找到分页符后面的下一个 <p> 标签，从那里开始保留（去掉封面页）
    const nextP = html.indexOf('<p', firstPageBreak);
    if (nextP > 0) {
      html = html.substring(nextP);
    }
  }

  // 去掉 Word 注释和空标签
  html = html.replace(/<!--StartFragment-->|<!--EndFragment-->/g, '');
  html = html.replace(/<p\s+class=MsoNormal\s*>(?:<[^>]+>)*\s*(?:<\/[^>]+>)*<\/p>/gi, '');

  const styleMatch = html.match(/<style[^>]*>[\s\S]*?<\/style>/gi);
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  const styles = styleMatch ? styleMatch.join('\n') : '';
  let bodyContent = bodyMatch ? bodyMatch[1].trim() : html;

  // 去掉 body 内开头的空段落
  bodyContent = bodyContent.replace(/^(?:\s*<p[^>]*>\s*<\/p>\s*)+/, '');

  html = `<div class="word-export-wrapper">\n${styles}\n${bodyContent}\n</div>`;

  const replacements = getContractReplacements(state);
  Object.entries(replacements).forEach(([key, value]) => {
    html = html.replaceAll(key, value);
  });
  return html;
}

/**
 * 合并 Word document.xml 中被分割的相邻 <w:t> 文本节点。
 * Word 在格式变化时会把连续文本拆成多个 run，导致 {{varName}} 被拆成
 * <w:t>{{</w:t>...<w:t>varName</w:t>...<w:t>}}</w:t>，使简单字符串替换失效。
 * 此函数按段落（<w:p>）合并相邻的 <w:t>，只合并中间没有其他 <w:t> 的情况。
 */
function mergeWordTextRuns(xml: string): string {
  const paragraphPattern = /(<w:p(?:\s[^>]*)?>)([\s\S]*?)(<\/w:p>)/g;

  let result = xml.replace(paragraphPattern, (_match, pStart, content, pEnd) => {
    let merged = content;
    let changed = true;

    while (changed) {
      changed = false;
      // 匹配 </w:t> ... <w:t>，中间不包含其他 <w:t> 标签
      // 将断开处彻底删除，使相邻文本合并到同一个 <w:t> 中
      merged = merged.replace(
        /<\/w:t>((?:(?!<w:t[ >]|<\/w:r>|<w:r[ >])[\s\S])*)<w:t(?:[^>]*)>/g,
        (m: string, between: string) => {
          // 如果中间有其他 w:t 标签，或跨了 <w:r> 边界，不合并
          if (/<w:t[ >]/.test(between)) {
            return m;
          }
          changed = true;
          // 返回空字符串，彻底去掉 </w:t>...<w:t> 断开
          return '';
        }
      );
    }

    return pStart + merged + pEnd;
  });

  // 修复：合并后若 <w:t> 内容包含前导/尾随空格或连续空格，
  // 必须保留 xml:space="preserve"，否则 Word 会删除这些空格
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

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** 提取 docx 文件的纯文本内容 */
export async function extractDocxText(file: File | ArrayBuffer): Promise<string> {
  const arrayBuffer = file instanceof File ? await file.arrayBuffer() : file;
  const zip = await JSZip.loadAsync(arrayBuffer);
  const xml = await zip.file('word/document.xml')!.async('string');
  // 去掉 XML 标签，保留文本内容
  return xml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

/** 计算字符串的 SHA-256 hash */
export async function sha256(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/** 获取系统生成合同的文本 hash */
export async function getContractTextHash(state: FormState): Promise<string> {
  const response = await fetch(`${getContractTemplatePath(state, 'contract')}?t=${Date.now()}`);
  const arrayBuffer = await response.arrayBuffer();
  const zip = await JSZip.loadAsync(arrayBuffer);
  let xml = await zip.file('word/document.xml')!.async('string');
  xml = mergeWordTextRuns(xml);

  const replacements = getContractReplacements(state);
  Object.entries(replacements).forEach(([key, value]) => {
    const varName = key.replace(/^\{\{|\}\}$/g, '');
    if (xml.includes(`{{${varName}}}`)) {
      xml = xml.replaceAll(`{{${varName}}}`, escapeXml(String(value)));
    }
  });

  const text = xml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  return sha256(text);
}

/** 基于 docx 模板生成合同文档 */
export async function generateContractDocx(state: FormState): Promise<Blob> {
  const response = await fetch(`${getContractTemplatePath(state, 'contract')}?t=${Date.now()}`);
  const arrayBuffer = await response.arrayBuffer();
  const zip = await JSZip.loadAsync(arrayBuffer);

  let xml = await zip.file('word/document.xml')!.async('string');
  xml = mergeWordTextRuns(xml);

  const replacements = getContractReplacements(state);
  Object.entries(replacements).forEach(([key, value]) => {
    const varName = key.replace(/^\{\{|\}\}$/g, '');
    if (xml.includes(`{{${varName}}}`)) {
      xml = xml.replaceAll(`{{${varName}}}`, escapeXml(String(value)));
    }
  });

  xml = removeDashRows(xml);

  zip.file('word/document.xml', xml);

  return zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
}

/** 基于投资者信息表模板生成文档 */
export async function generateInvestorInfoDocx(state: FormState): Promise<Blob> {
  const response = await fetch(`${getContractTemplatePath(state, 'investor')}?t=${Date.now()}`);
  const arrayBuffer = await response.arrayBuffer();
  const zip = await JSZip.loadAsync(arrayBuffer);

  let xml = await zip.file('word/document.xml')!.async('string');
  xml = mergeWordTextRuns(xml);
  xml = mergeSplitVariables(xml);

  // 修复：将"银行盖章处"和"日期"合并到同一 run，避免排版换行时"日期"被拆开
  xml = xml.replace(
    /<w:r><w:t>银行盖章处<\/w:t><\/w:r><w:r><w:rPr><w:spacing w:val="-19"\/><\/w:rPr><w:t>日期<\/w:t><\/w:r>/,
    '<w:r><w:t xml:space="preserve">银行盖章处 日期</w:t></w:r>'
  );

  const replacements = getContractReplacements(state);
  Object.entries(replacements).forEach(([key, value]) => {
    const varName = key.replace(/^\{\{|\}\}$/g, '');
    if (xml.includes(`{{${varName}}}`)) {
      xml = xml.replaceAll(`{{${varName}}}`, escapeXml(String(value)));
    }
  });

  xml = removeDashRows(xml);

  zip.file('word/document.xml', xml);

  return zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
}

/**
 * 删除 Word 表格中所有数据字段均为 "-" 的空数据行。
 * 遍历每一行 <w:tr>，提取纯文本后判断：
 * 若整行仅剩数字（序号列）与 "-"，则视为空数据行并移除。
 */
function removeDashRows(xml: string): string {
  return xml.replace(/<w:tr(?:\s[^>]*)?>[\s\S]*?<\/w:tr>/g, (row) => {
    const text = row.replace(/<[^>]+>/g, ' ').trim();
    const stripped = text.replace(/\s/g, '');
    // 空内容，或仅由数字与 "-" 组成且包含至少一个 "-"，则删除
    if (stripped === '' || (/^[\d-]+$/.test(stripped) && stripped.includes('-'))) {
      return '';
    }
    return row;
  });
}

/**
 * 额度利率确认函表格拓行：根据子公司数量动态克隆模板行。
 * 模板默认包含 consub0~11 共12行，若 subsidiaries.length > 12 则自动克隆生成 consub12~N 的行。
 */
function expandQuotaRateRows(xml: string, state: FormState): string {
  const { subsidiaries } = state;
  const totalRowsNeeded = subsidiaries.length;
  if (totalRowsNeeded <= 12) return xml;

  const rows = xml.match(/<w:tr[\s\S]*?<\/w:tr>/g);
  if (!rows) return xml;

  let templateRow = '';
  let lastDataRow = '';
  for (let i = 0; i < rows.length; i++) {
    if (rows[i].includes('consub1_subName')) {
      templateRow = rows[i];
    }
    if (rows[i].includes('consub11_subName')) {
      lastDataRow = rows[i];
    }
  }
  if (!templateRow) return xml;

  let extraRows = '';
  for (let idx = 12; idx < totalRowsNeeded; idx++) {
    let row = templateRow;
    row = row.replace(/\bconsub1_subName\b/g, `consub${idx}_subName`);
    row = row.replace(/\bconsub1_subQuota\b/g, `consub${idx}_subQuota`);
    row = row.replace(/\bconrate1\b/g, `conrate${idx}`);
    row = row.replace(/\bconbankfee1\b/g, `conbankfee${idx}`);
    row = row.replace(/\bconplatfee1\b/g, `conplatfee${idx}`);
    // 模板行序号固定为 2（consub1），扩展行需更新为实际序号（idx + 1）
    row = row.replace(/<w:t[^>]*>2<\/w:t>/, `<w:t>${idx + 1}</w:t>`);
    row = row.replace(/w14:paraId="[^"]*"/g, '');
    extraRows += row;
  }

  // 扩展行插入到最后一行数据（consub11）之后，保持顺序
  const insertPos = xml.indexOf(lastDataRow || templateRow) + (lastDataRow || templateRow).length;
  return xml.substring(0, insertPos) + extraRows + xml.substring(insertPos);
}

/** 基于额度利率确认函模板生成文档 */
export async function generateQuotaRateDocx(state: FormState): Promise<Blob> {
  const response = await fetch(`${getContractTemplatePath(state, 'quotaRate')}?t=${Date.now()}`);
  const arrayBuffer = await response.arrayBuffer();
  const zip = await JSZip.loadAsync(arrayBuffer);

  let xml = await zip.file('word/document.xml')!.async('string');
  xml = mergeWordTextRuns(xml);
  xml = mergeSplitVariables(xml);

  // 拓行：根据实际子公司数量动态扩展表格行
  xml = expandQuotaRateRows(xml, state);

  // 非集团模式，或暂不分配额度为 0 时，隐藏额度利率确认函中的对应行
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

  const replacements = getContractReplacements(state);
  Object.entries(replacements).forEach(([key, value]) => {
    const varName = key.replace(/^\{\{|\}\}$/g, '');
    if (xml.includes(`{{${varName}}}`)) {
      xml = xml.replaceAll(`{{${varName}}}`, escapeXml(String(value)));
    }
  });

  xml = removeDashRows(xml);

  zip.file('word/document.xml', xml);

  return zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
}

/**
 * 核心企业清单表格拓行：根据子公司数量动态克隆模板行。
 * 模板默认包含 consub1~11 共11个数据行，若 subsidiaries.length - 1 > 11 则自动克隆生成 consub12~N 的行。
 */
function expandCoreEnterpriseRows(xml: string, state: FormState): string {
  const subCount = state.subsidiaries.length - 1; // 排除母公司
  if (subCount <= 11) return xml;

  const rows = xml.match(/<w:tr[\s\S]*?<\/w:tr>/g);
  if (!rows) return xml;

  let templateRow = '';
  for (let i = 0; i < rows.length; i++) {
    if (rows[i].includes('consub1_subName')) {
      templateRow = rows[i];
      break;
    }
  }
  if (!templateRow) return xml;

  let extraRows = '';
  for (let idx = 12; idx <= subCount; idx++) {
    let row = templateRow;
    row = row.replace(/\bconsub1_subName\b/g, `consub${idx}_subName`);
    row = row.replace(/\bconsub1_subCreditCode\b/g, `consub${idx}_subCreditCode`);
    row = row.replace(/w14:paraId="[^"]*"/g, '');
    extraRows += row;
  }

  const insertPos = xml.indexOf(templateRow) + templateRow.length;
  return xml.substring(0, insertPos) + extraRows + xml.substring(insertPos);
}

/** 基于附件5-核心企业清单模板生成文档 */
export async function generateCoreEnterpriseListDocx(state: FormState): Promise<Blob> {
  const response = await fetch(`${getContractTemplatePath(state, 'coreEnterpriseList')}?t=${Date.now()}`);
  const arrayBuffer = await response.arrayBuffer();
  const zip = await JSZip.loadAsync(arrayBuffer);

  let xml = await zip.file('word/document.xml')!.async('string');
  xml = mergeWordTextRuns(xml);
  xml = mergeSplitVariables(xml);

  // 拓行：根据实际子公司数量动态扩展表格行
  xml = expandCoreEnterpriseRows(xml, state);

  const replacements = getContractReplacements(state);
  Object.entries(replacements).forEach(([key, value]) => {
    const varName = key.replace(/^\{\{|\}\}$/g, '');
    if (xml.includes(`{{${varName}}}`)) {
      xml = xml.replaceAll(`{{${varName}}}`, escapeXml(String(value)));
    }
  });

  xml = removeDashRows(xml);

  zip.file('word/document.xml', xml);

  return zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
}

/** 基于附件6-保理融资利息及保理费支付确认函模板生成文档 */
export async function generateAttachment6Docx(state: FormState): Promise<Blob> {
  const response = await fetch(`${getContractTemplatePath(state, 'attachment6')}?t=${Date.now()}`);
  const arrayBuffer = await response.arrayBuffer();
  const zip = await JSZip.loadAsync(arrayBuffer);

  let xml = await zip.file('word/document.xml')!.async('string');
  // 先尝试把被 Word 拆分的 {{变量}} 合并成完整字符串，再合并相邻文本
  xml = mergeSplitVariables(xml);
  xml = mergeWordTextRuns(xml);

  const replacements = getContractReplacements(state);
  Object.entries(replacements).forEach(([key, value]) => {
    const varName = key.replace(/^\{\{|\}\}$/g, '');
    if (xml.includes(`{{${varName}}}`)) {
      xml = xml.replaceAll(`{{${varName}}}`, escapeXml(String(value)));
    }
  });

  zip.file('word/document.xml', xml);

  return zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
}

/** 基于买方付息说明模板（非集团/核心企业模式）生成文档 */
export async function generateBuyerInterestNonGroupDocx(state: FormState): Promise<Blob> {
  const response = await fetch(`${getContractTemplatePath(state, 'buyerInterestNonGroup')}?t=${Date.now()}`);
  if (!response.ok) throw new Error(`模板文件获取失败: ${response.status} ${response.statusText}`);
  const arrayBuffer = await response.arrayBuffer();
  const zip = await JSZip.loadAsync(arrayBuffer);

  let xml = await zip.file('word/document.xml')!.async('string');
  xml = mergeWordTextRuns(xml);
  xml = mergeSplitVariables(xml);

  const replacements = getContractReplacements(state);
  Object.entries(replacements).forEach(([key, value]) => {
    const varName = key.replace(/^\{\{|\}\}$/g, '');
    if (xml.includes(`{{${varName}}}`)) {
      xml = xml.replaceAll(`{{${varName}}}`, escapeXml(String(value)));
    }
  });

  zip.file('word/document.xml', xml);

  return zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
}

/**
 * 买方付息说明（集团-各自付息）段落扩展：根据子公司数量动态扩展 consub 列表。
 * 模板默认包含 consub1~11，若 subsidiaries.length - 1 > 11 则用 allSubsidiaryNames 替换整个列表。
 */
function expandBuyerInterestSubsidiaryList(xml: string, state: FormState): string {
  const subCount = state.subsidiaries.length - 1;
  if (subCount <= 11) return xml;

  const paraPattern = /(<w:p(?:\s[^>]*)?>)([\s\S]*?)(<\/w:p>)/g;
  return xml.replace(paraPattern, (match, pStart, content, pEnd) => {
    if (!content.includes('consub1_subName')) return match;
    const newContent = content.replace(
      /\{\{consub1_subName\}\}[\s\S]*?\{\{consub11_subName\}\}、?/,
      '{{allSubsidiaryNames}}、'
    );
    return pStart + newContent + pEnd;
  });
}

/**
 * 重建买方付息说明（集团-各自付息）的落款段落，避免空子公司产生多余顿号。
 * 模板签名段落为：{{consub1_subName}}、...、{{consub11_subName}}（子公司盖章）
 * 空子公司替换后会留下连续顿号，且 Word XML 中顿号与“（子公司盖章）”可能被拆分到不同 run，
 * 导致后续正则清理失效。这里直接按非空子公司名称重新构建该段落文本。
 */
function rebuildBuyerInterestSignatureParagraph(xml: string, state: FormState): string {
  const subNames = state.subsidiaries
    .slice(1)
    .map(s => s.name.trim())
    .filter(n => n);
  const signatureText = subNames.length > 0
    ? `${subNames.join('、')}（子公司盖章）`
    : '（子公司盖章）';

  const paraPattern = /(<w:p(?:\s[^>]*)?>)([\s\S]*?)(<\/w:p>)/g;
  return xml.replace(paraPattern, (match, pStart, content, pEnd) => {
    if (!content.includes('（子公司盖章）')) return match;
    const pPrMatch = content.match(/<w:pPr>[\s\S]*?<\/w:pPr>/);
    const pPr = pPrMatch ? pPrMatch[0] : '';
    const runMatch = content.match(/<w:r>[\s\S]*?<\/w:r>/);
    let runProps = '';
    if (runMatch) {
      const rPrMatch = runMatch[0].match(/<w:rPr>[\s\S]*?<\/w:rPr>/);
      runProps = rPrMatch ? rPrMatch[0] : '';
    }
    const newRun = `<w:r>${runProps}<w:t xml:space="preserve">${escapeXml(signatureText)}</w:t></w:r>`;
    return pStart + pPr + newRun + pEnd;
  });
}

/** 基于买方付息说明模板（集团模式-子公司各自付息）生成文档 */
export async function generateBuyerInterestGroupSeparateDocx(state: FormState): Promise<Blob> {
  const response = await fetch(`${getContractTemplatePath(state, 'buyerInterestGroupSeparate')}?t=${Date.now()}`);
  if (!response.ok) throw new Error(`模板文件获取失败: ${response.status} ${response.statusText}`);
  const arrayBuffer = await response.arrayBuffer();
  const zip = await JSZip.loadAsync(arrayBuffer);

  let xml = await zip.file('word/document.xml')!.async('string');

  // 使用 mergeSplitVariables 处理被严重拆分的 {{变量}}（比 mergeWordTextRuns 更适合此模板）
  xml = mergeSplitVariables(xml);

  // 扩展子公司列表（超过11家时）
  xml = expandBuyerInterestSubsidiaryList(xml, state);

  const replacements = getContractReplacements(state);

  // 买方付息集团各自付息模板：没有子公司的名称显示为空，不显示 -
  Object.keys(replacements).forEach(key => {
    if (/^\{\{consub\d+_subName\}\}$/.test(key) && replacements[key] === '-') {
      replacements[key] = '';
    }
  });

  Object.entries(replacements).forEach(([key, value]) => {
    const varName = key.replace(/^\{\{|\}\}$/g, '');
    if (xml.includes(`{{${varName}}}`)) {
      xml = xml.replaceAll(`{{${varName}}}`, escapeXml(String(value)));
    }
  });

  // 再次合并相邻文本节点，把 "、" 和空文本合并到同一个 <w:t> 中
  xml = mergeWordTextRuns(xml);

  // 重建落款段落，彻底消除空子公司导致的多余顿号
  xml = rebuildBuyerInterestSignatureParagraph(xml, state);

  // 清理多余的顿号：连续 "、" 合并，去掉 "（" 前的 "、"
  xml = xml.replace(/、+/g, '、');
  xml = xml.replace(/、+（/g, '（');

  zip.file('word/document.xml', xml);

  return zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
}

/** 基于买方付息说明模板（集团模式-统一付息）生成文档 */
export async function generateBuyerInterestGroupUnifiedDocx(state: FormState): Promise<Blob> {
  const response = await fetch(`${getContractTemplatePath(state, 'buyerInterestGroupUnified')}?t=${Date.now()}`);
  if (!response.ok) throw new Error(`模板文件获取失败: ${response.status} ${response.statusText}`);
  const arrayBuffer = await response.arrayBuffer();
  const zip = await JSZip.loadAsync(arrayBuffer);

  let xml = await zip.file('word/document.xml')!.async('string');
  // 先合并被拆分的变量，再合并相邻文本
  xml = mergeSplitVariables(xml);
  xml = mergeWordTextRuns(xml);

  // 模板中部分变量带有空格，统一为无空格格式
  xml = xml.replace(/\{\{\s*([^}\s]+)\s*\}\}/g, '{{$1}}');

  const replacements = getContractReplacements(state);
  Object.entries(replacements).forEach(([key, value]) => {
    const varName = key.replace(/^\{\{|\}\}$/g, '');
    if (xml.includes(`{{${varName}}}`)) {
      xml = xml.replaceAll(`{{${varName}}}`, escapeXml(String(value)));
    }
  });

  zip.file('word/document.xml', xml);

  return zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
}

/** 把被 Word 拆分的 {{变量}} 合并成完整字符串，不碰其他 run */
function mergeSplitVariables(xml: string): string {
  return xml.replace(/\{\{([\s\S]*?)\}\}/g, (_match, inner) => {
    const text = inner.replace(/<[^>]+>/g, '').trim();
    return `{{${text}}}`;
  });
}

/**
 * 删除清分账户说明模板中空的子公司页面。
 * 模板结构：每个子公司的内容块以 "还款账户信息确认函" 标题段落开始，
 * 后跟空段落、正文段落、空段落、签名段落、分页符空段落（最后一个子公司的分页符段落为空段落）。
 * 标题段落索引：[0]=文档总标题, [1]=sub1标题, ..., [11]=sub11标题。
 */
function removeEmptySubsidiaryPages(xml: string, state: FormState): string {
  const subsidiaries = state.subsidiaries || [];

  // 收集所有段落边界
  const paragraphs: { start: number; end: number }[] = [];
  let p = xml.indexOf('<w:p ');
  while (p !== -1) {
    const end = xml.indexOf('</w:p>', p);
    if (end === -1) break;
    paragraphs.push({ start: p, end: end + 6 });
    p = xml.indexOf('<w:p ', end + 6);
  }

  // 找到包含 "还款账户信息确认函" 的段落索引
  const titleIndices: number[] = [];
  for (let i = 0; i < paragraphs.length; i++) {
    const text = xml.substring(paragraphs[i].start, paragraphs[i].end);
    if (text.includes('还款账户信息确认函')) {
      titleIndices.push(i);
    }
  }

  // 标题[0] 是文档总标题（核心企业区域），标题[1~149] 对应 sub1~149
  if (titleIndices.length < 2) return xml;

  // 从后往前删除，避免索引偏移
  for (let subIdx = 149; subIdx >= 1; subIdx--) {
    const sub = subsidiaries[subIdx];
    const isEmpty = !sub || !sub.name || !sub.name.trim();
    if (!isEmpty) continue;

    const titlePos = titleIndices[subIdx];
    if (titlePos === undefined) continue;

    const nextTitlePos = titleIndices[subIdx + 1];
    const startPos = paragraphs[titlePos].start;
    const endPos = nextTitlePos !== undefined
      ? paragraphs[nextTitlePos - 1].end
      : paragraphs[paragraphs.length - 1].end;

    xml = xml.substring(0, startPos) + xml.substring(endPos);
  }

  return xml;
}

/**
 * 清分账户说明页面拓行：根据子公司数量动态克隆 sub1 页面块。
 * 模板默认包含 sub1~11 共11个子公司页面，若 subsidiaries.length - 1 > 11 则自动克隆生成 sub12~N 的页面。
 */
function expandClearingAccountPages(xml: string, state: FormState): string {
  const { subsidiaries } = state;
  const subCount = subsidiaries.length - 1;
  if (subCount <= 11) return xml;

  const paragraphs: { start: number; end: number }[] = [];
  let p = xml.indexOf('<w:p ');
  while (p !== -1) {
    const end = xml.indexOf('</w:p>', p);
    if (end === -1) break;
    paragraphs.push({ start: p, end: end + 6 });
    p = xml.indexOf('<w:p ', end + 6);
  }

  const titleIndices: number[] = [];
  for (let i = 0; i < paragraphs.length; i++) {
    const text = xml.substring(paragraphs[i].start, paragraphs[i].end);
    if (text.includes('还款账户信息确认函')) {
      titleIndices.push(i);
    }
  }

  if (titleIndices.length < 2) return xml;

  const sub1Start = paragraphs[titleIndices[1]].start;
  const sub1End = titleIndices[2] !== undefined
    ? paragraphs[titleIndices[2] - 1].end
    : paragraphs[paragraphs.length - 1].end;
  const templateBlock = xml.substring(sub1Start, sub1End);

  const insertPos = titleIndices[12] !== undefined
    ? paragraphs[titleIndices[12]].start
    : paragraphs[paragraphs.length - 1].end;

  let extraBlocks = '';
  for (let idx = 12; idx <= subCount; idx++) {
    let block = templateBlock;
    block = block.replace(/\bsub1_subName\b/g, `sub${idx}_subName`);
    block = block.replace(/\bsub1_subRepaymentAccount\b/g, `sub${idx}_subRepaymentAccount`);
    block = block.replace(/\bsub1_subRepaymentBank\b/g, `sub${idx}_subRepaymentBank`);
    block = block.replace(/\bsub1_subRepaymentUnionCode\b/g, `sub${idx}_subRepaymentUnionCode`);
    // 扩展页面标题启用分页符，使每个子公司页面独立成页
    block = block.replace(/<w:pageBreakBefore w:val="0"\/>/, '<w:pageBreakBefore w:val="1"/>');
    extraBlocks += block;
  }

  return xml.substring(0, insertPos) + extraBlocks + xml.substring(insertPos);
}

/** 基于清分账户说明模板生成文档 */
export async function generateClearingAccountDocx(state: FormState): Promise<Blob> {
  const response = await fetch(`${getContractTemplatePath(state, 'clearingAccount')}?t=${Date.now()}`);
  if (!response.ok) throw new Error(`模板文件获取失败: ${response.status} ${response.statusText}`);
  const arrayBuffer = await response.arrayBuffer();
  const zip = await JSZip.loadAsync(arrayBuffer);

  let xml = await zip.file('word/document.xml')!.async('string');

  // 不清分账户说明模板格式统一，不能用 mergeWordTextRuns（会整段合并成一个 run）
  // 改用 mergeSplitVariables，只合并被拆分的 {{变量}} 占位符
  xml = mergeSplitVariables(xml);

  // 模板中部分变量带有空格，统一为无空格格式
  xml = xml.replace(/\{\{\s*([^}\s]+)\s*\}\}/g, '{{$1}}');

  // 拓页面：根据实际子公司数量动态扩展页面块
  xml = expandClearingAccountPages(xml, state);

  // 删除空的子公司页面（在变量替换前，根据 state 判断）
  xml = removeEmptySubsidiaryPages(xml, state);

  const replacements = getContractReplacements(state);
  Object.entries(replacements).forEach(([key, value]) => {
    const varName = key.replace(/^\{\{|\}\}$/g, '');
    if (xml.includes(`{{${varName}}}`)) {
      xml = xml.replaceAll(`{{${varName}}}`, escapeXml(String(value)));
    }
  });

  zip.file('word/document.xml', xml);

  return zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
}
