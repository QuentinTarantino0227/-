import type { QuotaItem } from '../../utils/quotaQuery';

interface QuotaSelectProps {
  label: string;
  value: string;
  options: QuotaItem[];
  loading: boolean;
  disabled?: boolean;
  error?: string;
  placeholder?: string;
  loadingText?: string;
  emptyText?: string;
  onChange: (value: string) => void;
}

export default function QuotaSelect({
  label,
  value,
  options,
  loading,
  disabled = false,
  error,
  placeholder = '请选择',
  loadingText = '查询中...',
  emptyText = '未找到匹配项',
  onChange,
}: QuotaSelectProps) {
  const isDisabled = disabled || loading || options.length === 0;

  return (
    <>
      <label className="form-label">{label} <span className="text-red-500">*</span></label>
      <select
        className={`form-input ${error ? 'form-input-error' : ''}`}
        value={value}
        onChange={e => onChange(e.target.value)}
        disabled={isDisabled}
      >
        <option value="">{loading ? loadingText : options.length === 0 ? emptyText : placeholder}</option>
        {options.map(opt => (
          <option key={opt.name} value={opt.name}>{opt.name}</option>
        ))}
      </select>
      {error && <p className="form-error-msg">{error}</p>}
    </>
  );
}
