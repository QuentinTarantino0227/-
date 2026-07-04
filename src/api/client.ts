import type { FormState } from '../types/form';

const API_BASE = '/api';

/**
 * 获取认证请求头
 */
function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('token');
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

/**
 * 处理认证错误（401）
 */
function handleAuthError(response: Response) {
  if (response.status === 401) {
    localStorage.removeItem('token');
    window.location.href = '/login';
  }
}

/**
 * 生成单个合同文档
 */
export async function generateContract(formState: FormState, templateKey: string): Promise<Blob> {
  const response = await fetch(`${API_BASE}/contract/generate`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ formState, templateKey }),
  });

  handleAuthError(response);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return await response.blob();
}

/**
 * 生成合同包（ZIP）
 */
export async function generateBundle(formState: FormState): Promise<Blob> {
  const response = await fetch(`${API_BASE}/contract/bundle`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ formState }),
  });

  handleAuthError(response);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return await response.blob();
}

/**
 * 导出 Excel
 */
export async function exportExcel(
  formState: FormState,
  options?: { creator?: string; creatorAffiliation?: string; feeSchemeNo?: string }
): Promise<Blob> {
  const response = await fetch(`${API_BASE}/excel/export`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ formState, ...options }),
  });

  handleAuthError(response);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return await response.blob();
}

/**
 * 保存项目
 */
export async function saveProject(formState: FormState): Promise<string> {
  const response = await fetch(`${API_BASE}/project/save`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ formState }),
  });

  handleAuthError(response);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  const data = await response.json();
  return data.projectId;
}

/**
 * 获取项目列表
 */
export async function listProjects(): Promise<any[]> {
  const response = await fetch(`${API_BASE}/project/list`, {
    headers: getAuthHeaders(),
  });

  handleAuthError(response);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return await response.json();
}

/**
 * 获取单个项目
 */
export async function getProject(projectId: string): Promise<any> {
  const response = await fetch(`${API_BASE}/project/${projectId}`, {
    headers: getAuthHeaders(),
  });

  handleAuthError(response);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return await response.json();
}

/**
 * 删除项目
 */
export async function deleteProject(projectId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/project/${projectId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });

  handleAuthError(response);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }
}

/**
 * 复制项目
 */
export async function duplicateProject(projectId: string): Promise<FormState | null> {
  const response = await fetch(`${API_BASE}/project/duplicate`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ projectId }),
  });

  handleAuthError(response);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return await response.json();
}

/**
 * 切换项目置顶状态
 */
export async function togglePin(projectId: string): Promise<boolean> {
  const response = await fetch(`${API_BASE}/project/pin`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ projectId }),
  });

  handleAuthError(response);

  if (!response.ok) {
    return false;
  }

  return true;
}

/**
 * 健康检查
 */
export async function healthCheck(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/health`);
    return response.ok;
  } catch {
    return false;
  }
}
