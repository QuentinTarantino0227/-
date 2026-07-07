import Database from 'better-sqlite3';
import fs from 'fs';
import JSZip from 'jszip';

const db = new Database('./data/projects.db');
const row = db.prepare('SELECT state FROM projects WHERE project_id = ?').get('HT-20260705-010756-SLG');
const state = JSON.parse(row.state);

const templateBuffer = fs.readFileSync('server/templates/comm_yunxin/quota_rate_confirmation.docx');
const zip = await JSZip.loadAsync(templateBuffer);

let xml = await zip.file('word/document.xml').async('string');

// mergeSplitVariables
xml = xml.replace(/<w:t[^>]*>\{\{<\/w:t><\/w:r><w:r>(?:<[^>]*>)*<w:t[^>]*>([^}<]+)<\/w:t><\/w:r><w:r>(?:<[^>]*>)*<w:t[^>]*>([^}<]+)<\/w:t><\/w:r><w:r>(?:<[^>]*>)*<w:t[^>]*>\}\}<\/w:t>/g, (_, p1, p2) => '<w:t>{{' + p1.trim() + p2.trim() + '}}</w:t>');
xml = xml.replace(/<w:t[^>]*>\{\{<\/w:t><\/w:r><w:r>(?:<[^>]*>)*<w:t[^>]*>([^}<]+)<\/w:t><\/w:r><w:r>(?:<[^>]*>)*<w:t[^>]*>\}\}<\/w:t>/g, (_, v) => '<w:t>{{' + v.trim() + '}}</w:t>');
xml = xml.replace(/\{\{([^}<]*)<\/w:t><\/w:r><w:r>(?:<[^>]*>)*<w:t[^>]*>([^}<]*)\}\}/g, (_, p1, p2) => '{{' + p1 + p2 + '}}');
xml = xml.replace(/\{\{\s*([^}\s]+)\s*\}\}/g, '{{$1}}');

console.log('=== 动态添加行之后的占位符 ===');
const placeholdersAfterMerge = xml.match(/\{\{[^}]+\}\}/g) || [];
console.log('占位符数量:', placeholdersAfterMerge.length);
console.log('包含 consub12:', placeholdersAfterMerge.some(p => p.includes('consub12')));
console.log('包含 consub19:', placeholdersAfterMerge.some(p => p.includes('consub19')));

// 动态添加行
const actualSubCount = state.subsidiaries.filter((s, i) => i > 0 && s.name.trim()).length;
console.log('\nactualSubCount:', actualSubCount);

if (actualSubCount > 11) {
  const tblStart = xml.indexOf('<w:tbl>');
  const tblEnd = xml.indexOf('</w:tbl>');
  
  if (tblStart > -1 && tblEnd > -1) {
    const consub11Marker = '{{consub11_subName}}';
    const consub11Idx = xml.indexOf(consub11Marker);
    
    if (consub11Idx > -1) {
      const rowStart = xml.lastIndexOf('<w:tr', consub11Idx);
      const rowEnd = xml.indexOf('</w:tr>', rowStart) + '</w:tr>'.length;
      const templateRow = xml.substring(rowStart, rowEnd);
      
      console.log('\ntemplateRow 包含 consub11:', templateRow.includes('consub11'));
      
      let newRows = '';
      for (let i = 12; i <= actualSubCount; i++) {
        let row = templateRow;
        row = row.replace(/>12</, `>${i + 1}<`);
        row = row.replace(/consub11_subName/g, `consub${i}_subName`);
        row = row.replace(/consub11_subQuota/g, `consub${i}_subQuota`);
        row = row.replace(/conrate11/g, `conrate${i}`);
        row = row.replace(/conbankfee11/g, `conbankfee${i}`);
        row = row.replace(/conplatfee11/g, `conplatfee${i}`);
        newRows += row;
      }
      
      xml = xml.substring(0, rowEnd) + newRows + xml.substring(rowEnd);
    }
  }
}

console.log('\n=== 动态添加行之后的占位符 ===');
const placeholdersAfterDynamic = xml.match(/\{\{[^}]+\}\}/g) || [];
console.log('占位符数量:', placeholdersAfterDynamic.length);
console.log('包含 consub12:', placeholdersAfterDynamic.some(p => p.includes('consub12')));
console.log('包含 consub19:', placeholdersAfterDynamic.some(p => p.includes('consub19')));

// 检查第12-19个子公司的数据
console.log('\n=== 子公司数据检查 ===');
for (let i = 12; i <= 19; i++) {
  const sub = state.subsidiaries[i];
  console.log(`subsidiaries[${i}]:`, {
    name: sub?.name,
    quota: sub?.quota,
    exists: !!sub
  });
}

// buildReplacements
const replacements = {};
const subsidiaries = state.subsidiaries;

for (let i = 0; i < 150; i++) {
  if (i === 0) {
    replacements['{{consub0_subName}}'] = state.coreInfo.initiatorName;
    replacements['{{consub0_subQuota}}'] = String(subsidiaries[0]?.quota || 0);
    replacements['{{conrate0}}'] = `${state.rateInfo.financingRate}%`;
    replacements['{{conbankfee0}}'] = `${state.rateInfo.factoringFee}%`;
    replacements['{{conplatfee0}}'] = `${state.rateInfo.platformFee}%`;
  } else {
    const sub = subsidiaries[i];
    replacements[`{{consub${i}_subName}}`] = sub && sub.name.trim() ? sub.name : '-';
    replacements[`{{consub${i}_subQuota}}`] = sub && sub.quota ? String(sub.quota) : '-';
    replacements[`{{conrate${i}}}`] = sub && sub.quota ? `${state.rateInfo.financingRate}%` : '-';
    replacements[`{{conbankfee${i}}}`] = sub && sub.quota ? `${state.rateInfo.factoringFee}%` : '-';
    replacements[`{{conplatfee${i}}}`] = sub && sub.quota ? `${state.rateInfo.platformFee}%` : '-';
  }
}

console.log('\n=== 替换数据检查 ===');
console.log('consub12_subName:', replacements['{{consub12_subName}}']);
console.log('consub12_subQuota:', replacements['{{consub12_subQuota}}']);
console.log('consub19_subName:', replacements['{{consub19_subName}}']);
console.log('consub19_subQuota:', replacements['{{consub19_subQuota}}']);

// applyReplacements
Object.entries(replacements).forEach(([key, value]) => {
  const varName = key.replace(/^\{\{|\}\}$/g, '');
  if (xml.includes(`{{${varName}}}`)) {
    xml = xml.replaceAll(`{{${varName}}}`, String(value));
  }
});

console.log('\n=== 替换之后的占位符 ===');
const placeholdersAfterReplace = xml.match(/\{\{[^}]+\}\}/g) || [];
console.log('剩余占位符数量:', placeholdersAfterReplace.length);
if (placeholdersAfterReplace.length > 0) {
  console.log('剩余占位符:', [...new Set(placeholdersAfterReplace)].slice(0, 10).join(', '));
}

// 检查行内容
console.log('\n=== removeDashRows 之前的行内容 ===');
const rows = xml.match(/<w:tr[^>]*>[\s\S]*?<\/w:tr>/g) || [];
console.log('总行数:', rows.length);

rows.forEach((row, i) => {
  const text = row.replace(/<[^>]+>/g, ' ').trim();
  const stripped = text.replace(/\s/g, '');
  if (stripped.includes('子公司12') || stripped.includes('子公司13') || stripped.includes('子公司19')) {
    console.log(`\nRow ${i}: ${stripped.substring(0, 150)}`);
    console.log(`  stripped === '': ${stripped === ''}`);
    console.log(`  /^[\\d-]+$/.test(stripped): ${/^[\d-]+$/.test(stripped)}`);
    console.log(`  stripped.includes('-'): ${stripped.includes('-')}`);
    console.log(`  会被删除: ${stripped === '' || (/^[\d-]+$/.test(stripped) && stripped.includes('-'))}`);
  }
});
