import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ES module 中获取 __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LOG_DIR = path.join(__dirname, '../logs');

// 确保日志目录存在
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

function getLogFilename(): string {
  const date = new Date().toISOString().split('T')[0];
  return path.join(LOG_DIR, `audit-${date}.log`);
}

export interface AuditLogEntry {
  timestamp: string;
  projectId: string;
  action: string;
  templateKey?: string;
  success: boolean;
  error?: string;
  userAgent?: string;
  ip?: string;
}

export function logAudit(entry: AuditLogEntry): void {
  const logLine = JSON.stringify(entry) + '\n';
  const logFile = getLogFilename();
  
  try {
    fs.appendFileSync(logFile, logLine, 'utf-8');
  } catch (err) {
    console.error('Failed to write audit log:', err);
  }
}

export function logContractGeneration(
  req: any,
  projectId: string,
  templateKey: string,
  success: boolean,
  error?: string
): void {
  logAudit({
    timestamp: new Date().toISOString(),
    projectId,
    action: 'contract_generate',
    templateKey,
    success,
    error,
    userAgent: req.headers['user-agent'],
    ip: req.ip || req.connection?.remoteAddress,
  });
}

export function logBundleGeneration(
  req: any,
  projectId: string,
  success: boolean,
  error?: string
): void {
  logAudit({
    timestamp: new Date().toISOString(),
    projectId,
    action: 'bundle_generate',
    success,
    error,
    userAgent: req.headers['user-agent'],
    ip: req.ip || req.connection?.remoteAddress,
  });
}

export function logExcelExport(
  req: any,
  projectId: string,
  success: boolean,
  error?: string
): void {
  logAudit({
    timestamp: new Date().toISOString(),
    projectId,
    action: 'excel_export',
    success,
    error,
    userAgent: req.headers['user-agent'],
    ip: req.ip || req.connection?.remoteAddress,
  });
}
