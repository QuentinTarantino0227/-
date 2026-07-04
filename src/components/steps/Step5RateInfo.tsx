import { useState, useEffect } from 'react';
import type { RateInfo, FeeType } from '../../types/form';

interface Props {
  data: RateInfo;
  errors: Record<string, string>;
  onChange: (patch: Partial<RateInfo>) => void;
}

// number 转显示字符串：undefined/null 显示空，其他按原值显示
function numToStr(n: number | undefined | null): string {
  if (n === undefined || n === null) return '';
  return String(n);
}

function FeeTypeSelect({ value, onChange }: { value: FeeType; onChange: (v: FeeType) => void }) {
  return (
    <select
      className="form-input w-24 flex-shrink-0"
      value={value || '年化'}
      onChange={e => onChange(e.target.value as FeeType)}
    >
      <option value="年化">年化</option>
      <option value="非年化">非年化</option>
    </select>
  );
}

export default function Step5RateInfo({ data, errors, onChange }: Props) {
  // 本地字符串输入状态，避免输入小数点过程中被 number 转换打断
  const [raw, setRaw] = useState({
    financingRate: numToStr(data.financingRate),
    factoringFee: numToStr(data.factoringFee),
    platformFee: numToStr(data.platformFee),
    sponsorFee: numToStr(data.sponsorFee),
  });

  // 外部 data 变化时同步（如重置、回显），保留以 '.' 结尾的中间输入态
  useEffect(() => {
    setRaw(prev => ({
      financingRate: prev.financingRate.endsWith('.') ? prev.financingRate : numToStr(data.financingRate),
      factoringFee: prev.factoringFee.endsWith('.') ? prev.factoringFee : numToStr(data.factoringFee),
      platformFee: prev.platformFee.endsWith('.') ? prev.platformFee : numToStr(data.platformFee),
      sponsorFee: prev.sponsorFee?.endsWith('.') ? prev.sponsorFee : numToStr(data.sponsorFee),
    }));
  }, [data.financingRate, data.factoringFee, data.platformFee, data.sponsorFee]);

  const handleChange = (field: keyof RateInfo, value: string) => {
    // 只允许数字和最多一个小数点
    if (value !== '' && !/^\d*\.?\d*$/.test(value)) return;

    setRaw(prev => ({ ...prev, [field]: value }));

    if (value === '' || value === '.') {
      onChange({ [field]: (field === 'platformFee' || field === 'sponsorFee') ? 0 : undefined });
    } else {
      onChange({ [field]: parseFloat(value) });
    }
  };

  return (
    <div className="space-y-5">
      <h2 className="text-lg font-bold text-gray-900">步骤5：利率信息</h2>

      {/* 银行息费 */}
      <div className="border border-gray-200 rounded-lg p-5">
        <h3 className="text-base font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-100">银行息费</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-5">
          <div>
            <label className="form-label">银行融资利率（预计） <span className="text-red-500">*</span></label>
            <div className="flex gap-2 items-center">
              <FeeTypeSelect
                value={data.financingRateType || '年化'}
                onChange={v => onChange({ financingRateType: v })}
              />
              <div className="relative w-28">
                <input
                  type="text"
                  inputMode="decimal"
                  className={`form-input pr-8 ${errors.financingRate ? 'form-input-error' : ''}`}
                  value={raw.financingRate}
                  onChange={e => handleChange('financingRate', e.target.value)}
                  placeholder="0.00"
                />
                <span className="absolute right-3 top-2 text-sm text-gray-500">%</span>
              </div>
            </div>
            {errors.financingRate && <p className="form-error-msg">{errors.financingRate}</p>}
          </div>

          <div>
            <label className="form-label">银行保理手续费（预计） <span className="text-red-500">*</span></label>
            <div className="flex gap-2 items-center">
              <FeeTypeSelect
                value={data.factoringFeeType || '非年化'}
                onChange={v => onChange({ factoringFeeType: v })}
              />
              <div className="relative w-28">
                <input
                  type="text"
                  inputMode="decimal"
                  className={`form-input pr-8 ${errors.factoringFee ? 'form-input-error' : ''}`}
                  value={raw.factoringFee}
                  onChange={e => handleChange('factoringFee', e.target.value)}
                  placeholder="0.00"
                />
                <span className="absolute right-3 top-2 text-sm text-gray-500">%</span>
              </div>
            </div>
            {errors.factoringFee && <p className="form-error-msg">{errors.factoringFee}</p>}
          </div>
        </div>
      </div>

      {/* 平台收费 */}
      <div className="border border-gray-200 rounded-lg p-5">
        <h3 className="text-base font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-100">平台收费</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-5">
          <div>
            <label className="form-label">平台综合服务费率 <span className="text-red-500">*</span></label>
            <div className="flex gap-2 items-center">
              <FeeTypeSelect
                value={data.platformFeeType || '年化'}
                onChange={v => onChange({ platformFeeType: v })}
              />
              <div className="relative w-28">
                <input
                  type="text"
                  inputMode="decimal"
                  className={`form-input pr-8 ${errors.platformFee ? 'form-input-error' : ''}`}
                  value={raw.platformFee}
                  onChange={e => handleChange('platformFee', e.target.value)}
                  placeholder="0.20"
                />
                <span className="absolute right-3 top-2 text-sm text-gray-500">%</span>
              </div>
            </div>
            {errors.platformFee && <p className="form-error-msg">{errors.platformFee}</p>}
          </div>

          <div>
            <label className="form-label">保荐费（如有）</label>
            <div className="flex gap-2 items-center">
              <FeeTypeSelect
                value={data.sponsorFeeType || '年化'}
                onChange={v => onChange({ sponsorFeeType: v })}
              />
              <div className="relative w-28">
                <input
                  type="text"
                  inputMode="decimal"
                  className={`form-input pr-8 ${errors.sponsorFee ? 'form-input-error' : ''}`}
                  value={raw.sponsorFee ?? ''}
                  onChange={e => handleChange('sponsorFee', e.target.value)}
                  placeholder="0.00"
                />
                <span className="absolute right-3 top-2 text-sm text-gray-500">%</span>
              </div>
            </div>
            {errors.sponsorFee && <p className="form-error-msg">{errors.sponsorFee}</p>}
          </div>
        </div>

        <div className="mt-5">
          <label className="form-label">杂费</label>
          <div className="flex gap-2 items-center">
            <div className="relative w-28">
              <input
                type="text"
                className="form-input pr-8 bg-gray-100 cursor-not-allowed"
                value="100"
                disabled
              />
              <span className="absolute right-3 top-2 text-sm text-gray-500">元</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
