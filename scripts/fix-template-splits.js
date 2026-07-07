#!/usr/bin/env node
/**
 * 修复 Word 模板中的变量 run 拆分问题
 * 
 * Word 在编辑过程中可能会将 {{variable}} 拆分成多个 XML run，例如：
 * - 2-run: {{var + name}}
 * - 3-run: {{ + varName + }}
 * - 4-run: {{ + part1 + part2 + }}
 * 
 * 本脚本会合并这些拆分，同时保留文档的其他格式。
 * 
 * 用法: node scripts/fix-template-splits.js <模板文件路径>
 */

import JSZip from 'jszip';
import fs from 'fs';
import path from 'path';

/**
 * 合并被拆分的 {{变量}}
 */
function mergeSplitVariables(xml) {
  let changes = [];
  
  // 4-run split: {{</w:t>...<w:t>part1</w:t>...<w:t>part2</w:t>...<w:t>}}
  const fourRunPattern = /<w:t[^>]*>\{\{<\/w:t><\/w:r><w:r>(?:<[^>]*>)*<w:t[^>]*>([^}<]+)<\/w:t><\/w:r><w:r>(?:<[^>]*>)*<w:t[^>]*>([^}<]+)<\/w:t><\/w:r><w:r>(?:<[^>]*>)*<w:t[^>]*>\}\}<\/w:t>/g;
  xml = xml.replace(fourRunPattern, (_, part1, part2) => {
    const merged = `{{${part1.trim()}${part2.trim()}}}`;
    changes.push(`[4-run] ${part1} + ${part2} -> ${merged}`);
    return `<w:t>${merged}</w:t>`;
  });
  
  // 3-run split: {{</w:t>...<w:t>varName</w:t>...<w:t>}}
  const threeRunPattern = /<w:t[^>]*>\{\{<\/w:t><\/w:r><w:r>(?:<[^>]*>)*<w:t[^>]*>([^}<]+)<\/w:t><\/w:r><w:r>(?:<[^>]*>)*<w:t[^>]*>\}\}<\/w:t>/g;
  xml = xml.replace(threeRunPattern, (_, varName) => {
    const merged = `{{${varName.trim()}}}`;
    changes.push(`[3-run] {{ + ${varName} + }} -> ${merged}`);
    return `<w:t>${merged}</w:t>`;
  });
  
  // 2-run split: {{part1</w:t>...<w:t>part2}}
  const twoRunPattern = /\{\{([^}<]*)<\/w:t><\/w:r><w:r>(?:<[^>]*>)*<w:t[^>]*>([^}<]*)\}\}/g;
  xml = xml.replace(twoRunPattern, (_, part1, part2) => {
    const merged = `{{${part1}${part2}}}`;
    changes.push(`[2-run] {{${part1} + ${part2}}} -> ${merged}`);
    return merged;
  });
  
  return { xml, changes };
}

async function fixTemplate(templatePath) {
  const outputPath = templatePath;
  
  console.log(`\n处理: ${path.basename(templatePath)}`);
  
  // 读取模板
  const buffer = fs.readFileSync(templatePath);
  const zip = await JSZip.loadAsync(buffer);
  
  // 处理 document.xml
  const docXmlFile = zip.file('word/document.xml');
  if (!docXmlFile) {
    console.error('  ✗ 未找到 word/document.xml');
    return false;
  }
  
  let xml = await docXmlFile.async('string');
  const { xml: mergedXml, changes } = mergeSplitVariables(xml);
  
  if (changes.length === 0) {
    console.log('  ✓ 无 run 拆分问题');
    return true;
  }
  
  // 输出修复信息
  console.log(`  发现 ${changes.length} 处 run 拆分:`);
  changes.forEach(change => console.log(`    ${change}`));
  
  // 更新 XML
  zip.file('word/document.xml', mergedXml);
  
  // 写回文件
  const output = await zip.generateAsync({ 
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 }
  });
  
  fs.writeFileSync(outputPath, output);
  console.log(`  ✓ 已修复并保存`);
  
  return true;
}

// 主程序
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('用法: node scripts/fix-template-splits.js <模板文件路径>');
    console.log('示例: node scripts/fix-template-splits.js server/templates/comm_yunxin/investor_info_template.docx');
    process.exit(1);
  }
  
  const templatePath = args[0];
  
  if (!fs.existsSync(templatePath)) {
    console.error(`错误: 文件不存在 - ${templatePath}`);
    process.exit(1);
  }
  
  if (!templatePath.endsWith('.docx')) {
    console.error('错误: 只支持 .docx 文件');
    process.exit(1);
  }
  
  const success = await fixTemplate(templatePath);
  process.exit(success ? 0 : 1);
}

main().catch(err => {
  console.error('错误:', err.message);
  process.exit(1);
});
