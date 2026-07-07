import { Router } from 'express';
import * as contractGenerator from '../services/contractGenerator.js';
import { logContractGeneration, logBundleGeneration } from '../services/auditLogger.js';

const router = Router();

// POST /api/contract/generate
router.post('/generate', async (req, res) => {
  try {
    const { formState, templateKey, projectCreator } = req.body;
    
    if (!formState || !templateKey) {
      return res.status(400).json({ error: 'Missing formState or templateKey' });
    }

    const generators: Record<string, (state: any, context?: { projectCreator?: string }) => Promise<Buffer>> = {
      contract: contractGenerator.generateContractDocx,
      quotaRate: contractGenerator.generateQuotaRateDocx,
      investor: contractGenerator.generateInvestorInfoDocx,
      buyerInterestNonGroup: contractGenerator.generateBuyerInterestNonGroupDocx,
      buyerInterestGroupSeparate: contractGenerator.generateBuyerInterestGroupSeparateDocx,
      buyerInterestGroupUnified: contractGenerator.generateBuyerInterestGroupUnifiedDocx,
      clearingAccount: contractGenerator.generateClearingAccountDocx,
      coreEnterpriseList: contractGenerator.generateCoreEnterpriseListDocx,
      attachment6: contractGenerator.generateAttachment6Docx,
    };

    const generator = generators[templateKey];
    if (!generator) {
      return res.status(400).json({ error: `Unknown template key: ${templateKey}` });
    }

    const buffer = await generator(formState, { projectCreator });
    
    // 记录成功日志
    logContractGeneration(req, formState.projectId, templateKey, true);
    
    const filename = `${templateKey}_${Date.now()}.docx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Failed to generate contract';
    
    //  logContractGeneration(req, req.body?.formState?.projectId || 'unknown', req.body?.templateKey || 'unknown', false, errorMessage);
    console.error('Generate contract error:', err);
    res.status(500).json({ error: errorMessage });
  }
});

// POST /api/contract/bundle
router.post('/bundle', async (req, res) => {
  try {
    const { formState, projectCreator } = req.body;
    
    if (!formState) {
      return res.status(400).json({ error: 'Missing formState' });
    }

    const buffer = await contractGenerator.generateContractBundle(formState, { projectCreator });
    
    // 记录成功日志
    logBundleGeneration(req, formState.projectId, true);
    
    const filename = encodeURIComponent(`合同文件合集_${Date.now()}.zip`);
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Failed to generate bundle';
  logBundleGeneration(req, req.body?.formState?.projectId || 'unknown', false, errorMessage);
    console.error('Generate bundle error:', err);
    res.status(500).json({ error: errorMessage });
  }
});

export default router;
