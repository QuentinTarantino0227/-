import { useState, useEffect } from 'react';
import type { FormState } from '../../types/form';
import { listProjects, togglePin } from '../../api/client';

interface Props {
  onLoadData: (state: FormState) => void;
}

interface ProjectOption {
  projectId: string;
  name: string;
  lastSaved: string;
  state: FormState;
  pinned: boolean;
}

export default function HistoryReference({ onLoadData }: Props) {
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    setLoading(true);
    try {
      const data = await listProjects();
      const sorted = [...data].sort((a, b) => {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        return new Date(b.lastSaved).getTime() - new Date(a.lastSaved).getTime();
      });
      setProjects(sorted);
    } catch (err) {
      console.error('Failed to load projects:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePin = async (projectId: string) => {
    const success = await togglePin(projectId);
    if (!success) {
      alert('置顶数量已达上限（最多5条）');
    }
    loadProjects();
  };

  const handleLoad = (project: ProjectOption) => {
    onLoadData(project.state);
    setOpen(false);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-center gap-2 text-blue-700">
          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="text-sm">加载历史合同...</span>
        </div>
      </div>
    );
  }

  if (projects.length === 0) {
    return null;
  }

  const pinnedProjects = projects.filter(p => p.pinned);
  const unpinnedProjects = projects.filter(p => !p.pinned).slice(0, 20);
  const pinnedCount = pinnedProjects.length;

  return (
    <div className="border border-gray-200 rounded-lg p-5 mb-6">
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-100">
        <h3 className="text-base font-semibold text-gray-800">历史合同-选择后引用历史数据</h3>
        <button
          onClick={() => setOpen(!open)}
          className="text-sm text-indigo-600 hover:text-indigo-800 transition"
        >
          {open ? '收起' : '选择历史数据'}
        </button>
      </div>

      {open && (
        <div className="space-y-1 max-h-80 overflow-y-auto">
          {pinnedProjects.length > 0 && (
            <>
              <div className="text-xs text-gray-500 font-medium px-2 py-1 sticky top-0 bg-white">
                ⭐ 置顶（{pinnedCount}/5）
              </div>
              {pinnedProjects.map(project => (
                <div key={project.projectId} className="flex items-center justify-between px-3 py-2 bg-yellow-50 rounded-md hover:bg-yellow-100 transition">
                  <span className="text-sm text-gray-700 truncate flex-1">
                    {project.state.coreInfo.initiatorName || project.name}-{project.state.coreInfo.cloudQuota || 0}万元-{formatDate(project.lastSaved)}
                  </span>
                  <div className="flex gap-2 ml-3 flex-shrink-0">
                    <button
                      onClick={() => handleLoad(project)}
                      className="px-2 py-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700 transition"
                    >
                      引用
                    </button>
                    <button
                      onClick={() => handleTogglePin(project.projectId)}
                      className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition"
                    >
                      取消置顶
                    </button>
                  </div>
                </div>
              ))}
            </>
          )}

          {pinnedProjects.length > 0 && unpinnedProjects.length > 0 && (
            <div className="text-xs text-gray-500 font-medium px-2 py-1 mt-2 sticky top-0 bg-white">
              最近记录
            </div>
          )}

          {unpinnedProjects.map(project => (
            <div key={project.projectId} className="flex items-center justify-between px-3 py-2 rounded-md hover:bg-gray-50 transition">
              <span className="text-sm text-gray-700 truncate flex-1">
                {project.state.coreInfo.initiatorName || project.name}-{project.state.coreInfo.cloudQuota || 0}万元-{formatDate(project.lastSaved)}
              </span>
              <div className="flex gap-2 ml-3 flex-shrink-0">
                <button
                  onClick={() => handleLoad(project)}
                  className="px-2 py-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700 transition"
                >
                  引用
                </button>
                <button
                  onClick={() => handleTogglePin(project.projectId)}
                  className="px-2 py-1 text-xs text-gray-500 border border-gray-300 rounded hover:bg-gray-50 transition"
                >
                  置顶
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
