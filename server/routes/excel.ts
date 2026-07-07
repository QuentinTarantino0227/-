import { Router } from 'express';
import XLSX from 'xlsx';
import { generateExcelData } from '../../src/utils/excelMapping.js';
import { getEffectiveQuotaName } from '../../src/utils/excelMapping.js';
import { logExcelExport } from '../services/auditLogger.js';

const router = Router();

// POST /api/excel/export
router.post('/export', (req, res) => {
  try {
    const { formState, creator, creatorAffiliation, feeSchemeNo } = req.body;
    
    if (!formState) {
      return res.status(400).json({ error: 'Missing formState' });
    }

    const rows = generateExcelData(formState, creator, creatorAffiliation, feeSchemeNo);
    
    // 创建工作簿
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, '立项参数');
    
    // 生成 Excel 文件
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    
    // 记录成功日志
    logExcelExport(req, formState.projectId, true);
    
    const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const shortName = getEffectiveQuotaName(formState);
    const filename = encodeURIComponent(`供应链金融立项参数_${shortName}_${dateStr}.xlsx`);
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Failed to export excel';
    logExcelExport(req, req.body?.formState?.projectId || 'unknown', false, errorMessage);
    console.error('Export excel error:', err);
    res.status(500).json({ error: errorMessage });
  }
});

export default router;
