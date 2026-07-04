import { useState } from 'react';
import type { FormState } from '../../types/form';
import { isGroupMode } from '../../utils/branchLogic';
import { getContractStrategy } from '../../business/contract';
import { generateContract } from '../../api/client';
import type { ProtocolItemConfig } from '../../business/contract/types';
import { getEffectiveQuotaName } from '../../utils/excelMapping';
import { saveAs } from 'file-saver';

interface Props {
  state: FormState;
}

// 通用下载按钮
function DownloadButton({ onClick, loading }: { onClick: () => void; loading: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary-700 bg-primary-50 rounded-md border border-primary-200 hover:bg-primary-100 hover:border-primary-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {loading ? (
        <>
          <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          生成中...
        </>
      ) : (
        <>
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          下载
        </>
      )}
    </button>
  );
}

// 文件图标
function DocIcon() {
  return (
    <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center flex-shrink-0">
      <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    </div>
  );
}

function ContractDownloadButton({ state }: { state: FormState }) {
  const [loading, setLoading] = useState(false);
  const handleDownload = async () => {
    setLoading(true);
    try {
      const blob = await generateContract(state, 'contract');
      const initiatorName = state.coreInfo.initiatorName || getEffectiveQuotaName(state);
      saveAs(blob, `三方协议-${initiatorName}.docx`);
    } catch (err) {
      console.error('合同下载失败:', err);
      alert('下载失败：' + (err instanceof Error ? err.message : String(err)));
    } finally { setLoading(false); }
  };
  return <DownloadButton onClick={handleDownload} loading={loading} />;
}

function QuotaRateDownloadButton({ state }: { state: FormState }) {
  const [loading, setLoading] = useState(false);
  const handleDownload = async () => {
    setLoading(true);
    try {
      const blob = await generateContract(state, 'quotaRate');
      saveAs(blob, `额度利率确认函-${state.coreInfo.initiatorName}.docx`);
    } catch (err) {
      console.error('额度利率确认函下载失败:', err);
      alert('下载失败：' + (err instanceof Error ? err.message : String(err)));
    } finally { setLoading(false); }
  };
  return <DownloadButton onClick={handleDownload} loading={loading} />;
}

function InvestorInfoDownloadButton({ state }: { state: FormState }) {
  const [loading, setLoading] = useState(false);
  const handleDownload = async () => {
    setLoading(true);
    try {
      const blob = await generateContract(state, 'investor');
      saveAs(blob, `银行投资者信息表-${state.coreInfo.initiatorName}.docx`);
    } catch (err) {
      console.error('投资者信息表下载失败:', err);
      alert('下载失败：' + (err instanceof Error ? err.message : String(err)));
    } finally { setLoading(false); }
  };
  return <DownloadButton onClick={handleDownload} loading={loading} />;
}

function CoreEnterpriseListDownloadButton({ state }: { state: FormState }) {
  const [loading, setLoading] = useState(false);
  const handleDownload = async () => {
    setLoading(true);
    try {
      const blob = await generateContract(state, 'coreEnterpriseList');
      saveAs(blob, `附件5-核心企业清单-${state.coreInfo.initiatorName}.docx`);
    } catch (err) {
      console.error('核心企业清单下载失败:', err);
      alert('下载失败：' + (err instanceof Error ? err.message : String(err)));
    } finally { setLoading(false); }
  };
  return <DownloadButton onClick={handleDownload} loading={loading} />;
}

function Attachment6DownloadButton({ state }: { state: FormState }) {
  const [loading, setLoading] = useState(false);
  const handleDownload = async () => {
    setLoading(true);
    try {
      const blob = await generateContract(state, 'attachment6');
      saveAs(blob, `附件6-保理融资利息及保理费支付确认函-${state.coreInfo.initiatorName}.docx`);
    } catch (err) {
      console.error('附件6下载失败:', err);
      alert('下载失败：' + (err instanceof Error ? err.message : String(err)));
    } finally { setLoading(false); }
  };
  return <DownloadButton onClick={handleDownload} loading={loading} />;
}

function ClearingAccountDownloadButton({ state }: { state: FormState }) {
  const [loading, setLoading] = useState(false);
  const handleDownload = async () => {
    setLoading(true);
    try {
      const blob = await generateContract(state, 'clearingAccount');
      saveAs(blob, `清分账户说明-${state.coreInfo.initiatorName}.docx`);
    } catch (err) {
      console.error('清分账户说明下载失败:', err);
      alert('下载失败：' + (err instanceof Error ? err.message : String(err)));
    } finally { setLoading(false); }
  };
  return <DownloadButton onClick={handleDownload} loading={loading} />;
}

function BuyerInterestDownloadButton({ state }: { state: FormState }) {
  const [loading, setLoading] = useState(false);
  const group = isGroupMode(state);
  const detail = state.coreInfo.buyerInterestDetail;

  const getTemplateKey = () => {
    if (!group) return 'buyerInterestNonGroup';
    if (detail === '子公司各自付息费') return 'buyerInterestGroupSeparate';
    if (detail === '集团统一付息') return 'buyerInterestGroupUnified';
    return null;
  };

  const handleDownload = async () => {
    setLoading(true);
    try {
      const templateKey = getTemplateKey();
      if (!templateKey) {
        alert('请先选择买方付息详情');
        throw new Error('未选择买方付息详情');
      }
      const blob = await generateContract(state, templateKey);
      saveAs(blob, `买方付息说明-${state.coreInfo.initiatorName}.docx`);
    } catch (err) {
      console.error('买方付息说明下载失败:', err);
      if (err instanceof Error && !err.message.includes('未选择')) {
        alert('下载失败：' + err.message);
      }
    } finally { setLoading(false); }
  };

  return <DownloadButton onClick={handleDownload} loading={loading} />;
}

function getDownloadButton(item: ProtocolItemConfig, state: FormState) {
  switch (item.name) {
    case '三方协议': return <ContractDownloadButton state={state} />;
    case '额度利率确认函': return <QuotaRateDownloadButton state={state} />;
    case '投资者信息表': return <InvestorInfoDownloadButton state={state} />;
    case '买方付息说明': return <BuyerInterestDownloadButton state={state} />;
    case '清分账户说明': return <ClearingAccountDownloadButton state={state} />;
    default:
      return (
        <button
          onClick={() => alert('模板暂未提供')}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary-700 bg-primary-50 rounded-md border border-primary-200 hover:bg-primary-100 hover:border-primary-300 transition-all"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          下载
        </button>
      );
  }
}

export default function ProtocolList({ state }: Props) {
  const group = isGroupMode(state);
  const items: ProtocolItemConfig[] = getContractStrategy(state).getProtocolList(state);

  // 合并所有文件项
  const allItems: { name: string; signatory?: string; element: React.JSX.Element }[] = items.map(item => ({
    name: item.name,
    signatory: item.signatory,
    element: getDownloadButton(item, state),
  }));

  if (group) {
    allItems.push({
      name: '附件5-核心企业清单',
      signatory: '与额度利率确认函相同',
      element: <CoreEnterpriseListDownloadButton state={state} />,
    });
  }
  allItems.push({
    name: '附件6-保理融资利息及保理费支付确认函',
    signatory: '与额度利率确认函相同',
    element: <Attachment6DownloadButton state={state} />,
  });

  return (
    <div className="divide-y divide-gray-100">
      {allItems.map((item, idx) => (
        <div key={item.name} className="flex items-center gap-4 py-3.5 px-1 first:pt-1 last:pb-1 hover:bg-gray-50 rounded-lg transition-colors">
          <span className="w-6 text-center text-xs font-medium text-gray-400">{idx + 1}</span>
          <DocIcon />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-gray-800">{item.name}</div>
            {item.signatory && <div className="text-xs text-gray-400 mt-0.5">{item.signatory}</div>}
          </div>
          {item.element}
        </div>
      ))}
    </div>
  );
}
