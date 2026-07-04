import type { FormState } from '../../types/form';
import { exportExcel } from '../../api/client';
import { getExcelFileName } from '../../utils/excelMapping';
import { saveAs } from 'file-saver';

interface Props {
  state: FormState;
  creator?: string;
  creatorAffiliation?: string;
  feeSchemeNo?: string;
}

export default function ExcelExport({ state, creator, creatorAffiliation, feeSchemeNo }: Props) {
  const handleDownload = async () => {
    try {
      const blob = await exportExcel(state, { creator, creatorAffiliation, feeSchemeNo });
      saveAs(blob, getExcelFileName(state));
    } catch (err) {
      console.error('Excel export failed:', err);
      alert('Excel 导出失败：' + (err instanceof Error ? err.message : String(err)));
    }
  };

  return (
    <button onClick={handleDownload} className="btn-primary">
      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      下载参数表
    </button>
  );
}
