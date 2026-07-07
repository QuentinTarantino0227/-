import Database from 'better-sqlite3';
import fs from 'fs';
import * as contractGenerator from './server/services/contractGenerator.ts';

const db = new Database('./data/projects.db');
const stmt = db.prepare('SELECT state FROM projects WHERE project_id = ?');
const row = stmt.get('HT-20260705-010756-SLG');

if (!row) {
  console.log('Project not found');
  process.exit(1);
}

const state = JSON.parse(row.state);
console.log('Project ID:', state.projectId);
console.log('Subsidiaries count:', state.subsidiaries?.length || 0);

// Generate clearing account
console.log('\n=== Generating clearing account ===');
try {
  const buffer = await contractGenerator.generateClearingAccountDocx(state);
  fs.writeFileSync('./test-clearing.docx', buffer);
  console.log('✓ Generated ./test-clearing.docx');
} catch (err) {
  console.error('Error:', err.message);
}

// Generate buyer interest (if applicable)
if (state.coreInfo.interestPayer === '需要买方付息') {
  const detail = state.coreInfo.buyerInterestDetail;
  console.log('\n=== Generating buyer interest (集团模式) ===');
  try {
    let buffer;
    if (detail === '子公司各自付息费') {
      buffer = await contractGenerator.generateBuyerInterestGroupSeparateDocx(state);
    } else if (detail === '集团统一付息') {
      buffer = await contractGenerator.generateBuyerInterestGroupUnifiedDocx(state);
    }
    if (buffer) {
      fs.writeFileSync('./test-buyer-interest.docx', buffer);
      console.log('✓ Generated ./test-buyer-interest.docx');
    }
  } catch (err) {
    console.error('Error:', err.message);
  }
}

// Generate core enterprise list (if group mode)
if (state.coreInfo.isGroupMode === '是') {
  console.log('\n=== Generating core enterprise list ===');
  try {
    const buffer = await contractGenerator.generateCoreEnterpriseListDocx(state);
    fs.writeFileSync('./test-core-enterprise-list.docx', buffer);
    console.log('✓ Generated ./test-core-enterprise-list.docx');
  } catch (err) {
    console.error('Error:', err.message);
  }
}

// Generate quota rate confirmation
console.log('\n=== Generating quota rate confirmation ===');
try {
  const buffer = await contractGenerator.generateQuotaRateDocx(state);
  fs.writeFileSync('./test-quota-rate.docx', buffer);
  console.log('✓ Generated ./test-quota-rate.docx');
} catch (err) {
  console.error('Error:', err.message);
}

console.log('\n=== Done ===');
