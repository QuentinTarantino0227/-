import Database from 'better-sqlite3';
import fs from 'fs';
import JSZip from 'jszip';

const db = new Database('./data/projects.db');
const row = db.prepare('SELECT state FROM projects WHERE project_id = ?').get('HT-20260705-010756-SLG');
const state = JSON.parse(row.state);

// 读取生成的文档
const buffer = fs.readFileSync('./test-quota-rate.docx');
const zip = await JSZip.loadAsync(buffer);
const xml = await zip.file('word/document.xml').async('string');

console.log('=== 生成的文档结构分析 ===');

// 提取所有表格
const tables = xml.match(/<w:tbl>[\s\S]*?<\/w:tbl>/g) || [];
console.log('表格数量:', tables.length);

tables.forEach((table, tableIdx) => {
  console.log(`\n=== 表格 ${tableIdx + 1} ===`);
  
  // 提取所有行
  const rows = table.match(/<w:tr[^>]*>[\s\S]*?<\/w:tr>/g) || [];
  console.log('行数:', rows.length);
  
  rows.forEach((row, rowIdx) => {
    // 提取单元格文本
    const cells = row.match(/<w:tc>[\s\S]*?<\/w:tc>/g) || [];
    const cellTexts = cells.map(cell => {
      const text = cell.replace(/<[^>]+>/g, '').trim();
      return text.replace(/\s+/g, ' ');
    });
    
    // 只显示包含子公司或序号的行
    const fullText = cellTexts.join(' | ');
    if (fullText.match(/\d+/) && (fullText.includes('子公司') || fullText.includes('中铁') || fullText.includes('暂不分配') || fullText.includes('合计'))) {
      console.log(`Row ${rowIdx}: ${fullText}`);
    }
  });
});

// 检查是否有分页符
const pageBreaks = (xml.match(/<w:br w:type="page"/g) || []).length;
console.log('\n分页符数量:', pageBreaks);

// 检查是否有 section breaks
const sectionBreaks = (xml.match(/<w:sectPr/g) || []).length;
console.log('Section breaks 数量:', sectionBreaks);
