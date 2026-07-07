import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFormState, saveProject } from '../hooks/useFormState';
import { useAuth } from '../contexts/AuthContext';
import ProtocolList from '../components/result/ProtocolList';
import ExcelExport from '../components/result/ExcelExport';
import { generateBundle } from '../api/client';
import { saveAs } from 'file-saver';
import { format } from 'date-fns';
import { getEffectiveQuotaName } from '../utils/excelMapping';

export default function Result() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { state, clearState } = useFormState();
  const [contractState] = useState(() => {
    const now = new Date();
    const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    const timeStr = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    return {
      ...state,
      projectId: `HT-${dateStr}-${timeStr}-${random}`,
      createdAt: now.toISOString(),
    };
  });

  // 进入结果页时，用新 projectId 保存为正式合同记录（与暂存区分）
  useEffect(() => {
    saveProject(contractState);
  }, [contractState]);

  const handleRestart = () => {
    if (confirm('确定要清除所有数据并重新开始吗？')) {
      clearState();
      navigate('/');
    }
  };

  const handleBundleDownload = async () => {
    const dateStr = format(new Date(), 'yyyyMMdd');
    const shortName = getEffectiveQuotaName(contractState);

    try {
      const blob = await generateBundle(contractState, user?.display_name);
      const zipFileName = `合同文件合集_${shortName}_${dateStr}.zip`;
      saveAs(blob, zipFileName);
    } catch (err) {
      console.error('批量下载失败:', err);
      alert('下载失败：' + (err instanceof Error ? err.message : String(err)));
    }
  };

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <span className="brand-mark">云</span>
            <div>
              <div className="text-base font-bold text-slate-900">交通银行云信合同生成器</div>
              <div className="text-xs text-slate-500">合同文件生成结果</div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {user && (
              <div className="hidden text-right text-xs text-slate-500 sm:block">
                <span className="font-semibold text-slate-700">{user.display_name}</span>
                <span className="mx-1 text-slate-300">|</span>
                <span>{user.affiliation}</span>
              </div>
            )}
            <button onClick={handleRestart} className="rounded-lg px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 hover:text-red-700">
              开启新立项
            </button>
            {user && (
              <button
                onClick={() => {
                  logout();
                  navigate('/login');
                }}
                className="text-xs font-medium text-slate-500 transition hover:text-red-600"
              >
                退出登录
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-5 px-4 py-8">
        {/* 项目摘要条 */}
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-white px-5 py-3 text-sm text-slate-600 shadow-sm shadow-slate-200/70">
          <svg className="w-4 h-4 text-primary-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
          </svg>
          <span className="font-semibold text-slate-800">{getEffectiveQuotaName(contractState)}</span>
          <span className="text-slate-300">|</span>
          <span>{contractState.coreInfo.initiatorName}</span>
          <span className="text-slate-300">|</span>
          <span className="font-mono text-xs text-slate-500">{contractState.projectId}</span>
        </div>

        {/* 合同文件卡片 */}
        <div className="card">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <h3 className="text-base font-bold text-slate-900">合同文件</h3>
            <div className="flex gap-2">
              <ExcelExport state={contractState} creator={user?.display_name} creatorAffiliation={user?.affiliation} />
              <button onClick={handleBundleDownload} className="btn-primary text-sm">
                <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                下载所有合同
              </button>
            </div>
          </div>
          <ProtocolList state={contractState} projectCreator={user?.display_name} />
        </div>
      </main>
    </div>
  );
}
