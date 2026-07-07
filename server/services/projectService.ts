import db from '../db/database.js';
import type { FormState } from '../../src/types/form.js';

export interface ProjectRecord {
  project_id: string;
  user_id: number;
  created_at: string;
  name: string;
  state: string; // JSON string
  last_saved: string;
  pinned: number;
}

export interface ProjectRecordParsed {
  projectId: string;
  createdAt: string;
  name: string;
  state: FormState;
  lastSaved: string;
  pinned: boolean;
}

export function saveProject(state: FormState, userId: number): string {
  const now = new Date().toISOString();
  const name = state.coreInfo.initiatorName || state.projectId;
  
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO projects (project_id, user_id, created_at, name, state, last_saved)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  
  stmt.run(
    state.projectId,
    userId,
    state.createdAt,
    name,
    JSON.stringify(state),
    now
  );
  
  return state.projectId;
}

export function listProjects(userId: number): ProjectRecordParsed[] {
  const stmt = db.prepare('SELECT * FROM projects WHERE user_id = ? ORDER BY last_saved DESC');
  const rows = stmt.all(userId) as ProjectRecord[];
  
  return rows.map(row => ({
    projectId: row.project_id,
    createdAt: row.created_at,
    name: row.name,
    state: JSON.parse(row.state),
    lastSaved: row.last_saved,
    pinned: row.pinned === 1
  }));
}

/**
 * 切换项目置顶状态（最多5条置顶）
 */
export function togglePin(projectId: string, userId: number): boolean {
  const current = db.prepare('SELECT pinned FROM projects WHERE project_id = ? AND user_id = ?').get(projectId, userId) as ProjectRecord | undefined;
  if (!current) return false;

  if (current.pinned === 1) {
    // 取消置顶
    db.prepare('UPDATE projects SET pinned = 0 WHERE project_id = ? AND user_id = ?').run(projectId, userId);
  } else {
    // 检查是否已达5条上限
    const pinnedCount = db.prepare('SELECT COUNT(*) as cnt FROM projects WHERE user_id = ? AND pinned = 1').get(userId) as { cnt: number };
    if (pinnedCount.cnt >= 5) return false;
    db.prepare('UPDATE projects SET pinned = 1 WHERE project_id = ? AND user_id = ?').run(projectId, userId);
  }
  return true;
}

export function getProject(projectId: string, userId: number): ProjectRecordParsed | null {
  const stmt = db.prepare('SELECT * FROM projects WHERE project_id = ? AND user_id = ?');
  const row = stmt.get(projectId, userId) as ProjectRecord | undefined;
  
  if (!row) return null;
  
  return {
    projectId: row.project_id,
    createdAt: row.created_at,
    name: row.name,
    state: JSON.parse(row.state),
    lastSaved: row.last_saved,
    pinned: row.pinned === 1
  };
}

export function deleteProject(projectId: string, userId: number): boolean {
  const stmt = db.prepare('DELETE FROM projects WHERE project_id = ? AND user_id = ?');
  const result = stmt.run(projectId, userId);
  return result.changes > 0;
}

/**
 * 清理超过指定天数的历史项目（跳过置顶项目）
 * @param daysToKeep 保留天数，默认 30 天
 * @returns 删除的记录数
 */
export function cleanupOldProjects(daysToKeep: number = 30): number {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - daysToKeep);
  const cutoffStr = cutoff.toISOString();

  // 只删除未置顶且超过保留期限的项目
  const stmt = db.prepare('DELETE FROM projects WHERE last_saved < ? AND pinned = 0');
  const result = stmt.run(cutoffStr);

  if (result.changes > 0) {
    console.log(`🗑️  自动清理：删除了 ${result.changes} 条超过 ${daysToKeep} 天的历史项目（置顶项目已跳过）`);
  }

  return result.changes;
}

export function duplicateProject(projectId: string, userId: number): FormState | null {
  const original = getProject(projectId, userId);
  if (!original) return null;
  
  // 生成新的 projectId
  const now = new Date();
  const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const timeStr = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
  const random = Math.random().toString(36).substring(2, 5).toUpperCase();
  const newProjectId = `LX-${dateStr}-${timeStr}-${random}`;
  
  // 复制并更新 ID
  const newState: FormState = {
    ...original.state,
    projectId: newProjectId,
    createdAt: now.toISOString()
  };
  
  return newState;
}
