import { useEffect } from 'react';
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

  // 进入结果页时，用新 projectId 保存为正式合同记录（与暂存区分）
  useEffect(() => {
    const now = new Date();
    const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    const timeStr = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    const contractState = {
      ...state,
      projectId: `HT-${dateStr}-${timeStr}-${random}`,
      createdAt: now.toISOString(),
    };
    saveProject(contractState);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRestart = () => {
    if (confirm('确定要清除所有数据并重新开始吗？')) {
      clearState();
      navigate('/');
    }
  };

  const handleBundleDownload = async () => {
    const dateStr = format(new Date(), 'yyyyMMdd');
    const shortName = getEffectiveQuotaName(state);

    try {
      const blob = await generateBundle(state);
      const zipFileName = `合同文件合集_${shortName}_${dateStr}.zip`;
      saveAs(blob, zipFileName);
    } catch (err) {
      console.error('批量下载失败:', err);
      alert('下载失败：' + (err instanceof Error ? err.message : String(err)));
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <span className="text-primary-600 font-bold text-lg">交通银行云信合同生成器</span>
          <div className="flex items-center gap-4">
            {user && (
              <div className="text-xs text-gray-500">
                <span className="font-medium">{user.display_name}</span>
                <span className="text-gray-400 mx-1">|</span>
                <span>{user.affiliation}</span>
              </div>
            )}
            <button onClick={handleRestart} className="text-sm text-red-600 hover:text-red-700 px-3">
              开启新立项
            </button>
            {user && (
              <button
                onClick={() => {
                  logout();
                  navigate('/login');
                }}
                className="text-xs text-gray-500 hover:text-red-600 transition"
              >
                退出登录
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-5">
        {/* 项目摘要条 */}
        <div className="flex items-center gap-3 text-sm text-gray-600 bg-white rounded-lg border border-gray-200 px-5 py-3 shadow-sm">
          <svg className="w-4 h-4 text-primary-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
          </svg>
          <span className="font-medium text-gray-800">{getEffectiveQuotaName(state)}</span>
          <span className="text-gray-300">|</span>
          <span>{state.coreInfo.initiatorName}</span>
          <span className="text-gray-300">|</span>
          <span className="text-gray-400">{state.projectId}</span>
        </div>

        {/* 合同文件卡片 */}
        <div className="card">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
            <h3 className="text-base font-bold text-gray-900">合同文件</h3>
            <div className="flex gap-2">
              <ExcelExport state={state} />
              <button onClick={handleBundleDownload} className="btn-primary text-sm">
                <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                下载所有合同
              </button>
            </div>
          </div>
          <ProtocolList state={state} />
        </div>
      </main>
    </div>
  );
}
