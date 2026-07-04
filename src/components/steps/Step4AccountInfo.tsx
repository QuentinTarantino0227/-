import { useEffect } from 'react';
import type { ReceiveAccountInfo, BankInfo, CoreInfo } from '../../types/form';
import { getBusinessLineFromCore, getBankDisplayName } from '../../business/businessLine';
import { getFormStrategy } from '../../business/form';

interface Props {
  data: ReceiveAccountInfo;
  bankInfo: BankInfo;
  errors: Record<string, string>;
  onChange: (patch: Partial<ReceiveAccountInfo>) => void;
  onChangeBank: (patch: Partial<BankInfo>) => void;
  initiatorName?: string;
  defaultBankName?: string;
  productType?: string;
  cooperationBank?: string;
}

export default function Step4AccountInfo({ data, bankInfo, errors, onChange, onChangeBank, initiatorName, defaultBankName, productType, cooperationBank }: Props) {
  const strategy = getFormStrategy(getBusinessLineFromCore({ productType: productType || '云信', cooperationBank: cooperationBank || '' } as CoreInfo));
  const bankDisplayName = getBankDisplayName(cooperationBank || '');
  const settlementLabel = strategy.settlementAccountLabel(initiatorName || '');
  // 若开户行为空且步骤3的支行名称有值，自动带入；支行名称变化时也同步更新
  useEffect(() => {
    if (!data.bankName.trim() && defaultBankName?.trim()) {
      onChange({ bankName: defaultBankName.trim() });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultBankName]);
  // 一般户开户行：若为空且支行名称有值，自动带入
  useEffect(() => {
    if (!bankInfo.initiatorBank.trim() && defaultBankName?.trim()) {
      onChangeBank({ initiatorBank: defaultBankName.trim() });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultBankName]);
  return (
    <div className="space-y-6">
      <h2 className="text-lg font-bold text-gray-900">步骤4：账户信息</h2>

      {/* 子模块1：银行到期收款账户 */}
      <div className="border border-gray-200 rounded-lg p-5">
        <h3 className="text-base font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-100">银行到期收款账户</h3>
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 text-sm text-yellow-800 mb-5">
          <span dangerouslySetInnerHTML={{ __html: strategy.receiveAccountNotice(bankDisplayName) }} />
        </div>

        <div className="space-y-5">
          {/* 收款户名 + 收款账号 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="form-label">银行收款户名 <span className="text-red-500">*</span></label>
              <input
                className={`form-input ${errors.accountName ? 'form-input-error' : ''}`}
                value={data.accountName}
                onChange={e => onChange({ accountName: e.target.value })}
                placeholder="请输入收款户名"
              />
              {errors.accountName && <p className="form-error-msg">{errors.accountName}</p>}
            </div>

            <div>
              <label className="form-label">收款账号 <span className="text-red-500">*</span></label>
              <input
                className={`form-input ${errors.accountNumber ? 'form-input-error' : ''}`}
                value={data.accountNumber}
                onChange={e => onChange({ accountNumber: e.target.value })}
                placeholder="请输入收款账号"
              />
              {errors.accountNumber && <p className="form-error-msg">{errors.accountNumber}</p>}
            </div>
          </div>

          {/* 识别号（条件必填） */}
          <div className="flex items-end gap-4">
            <div className="max-w-xs">
              <label className="form-label">
                识别号 {initiatorName && data.accountName !== initiatorName
                  ? <span className="text-red-500">*</span>
                  : <span className="text-gray-400 text-xs">（如有）</span>}
              </label>
              <input
                className={`form-input ${errors.identifier ? 'form-input-error' : ''}`}
                value={data.identifier || ''}
                onChange={e => onChange({ identifier: e.target.value })}
                placeholder="使用支行内部户时必填"
              />
              {errors.identifier && <p className="form-error-msg">{errors.identifier}</p>}
            </div>
            {initiatorName && data.accountName !== initiatorName && (
              <p className="text-sm text-gray-500 pb-2">
                如有疑问，拿着这个<a href="/identifier-guide.png" target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline">单子</a>问支行柜台
              </p>
            )}
          </div>

          {/* 开户行 + 联行号 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="form-label">开户行 <span className="text-red-500">*</span></label>
              <input
                className={`form-input ${errors.bankName ? 'form-input-error' : ''}`}
                value={data.bankName}
                onChange={e => onChange({ bankName: e.target.value })}
                placeholder={defaultBankName ? `默认：${defaultBankName}` : '请输入开户行'}
              />
              {errors.bankName && <p className="form-error-msg">{errors.bankName}</p>}
            </div>

            <div>
              <label className="form-label">联行号 <span className="text-red-500">*</span></label>
              <input
                className={`form-input ${errors.unionCode ? 'form-input-error' : ''}`}
                value={data.unionCode}
                onChange={e => onChange({ unionCode: e.target.value })}
                placeholder="12位数字联行号"
                maxLength={12}
              />
              {errors.unionCode && <p className="form-error-msg">{errors.unionCode}</p>}
            </div>
          </div>
        </div>
      </div>

      {/* 子模块2：一般户账号 */}
      <div className="border border-gray-200 rounded-lg p-5">
        <h3 className="text-base font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-100">{settlementLabel}</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="form-label">一般户户名</label>
            <input
              className="form-input bg-gray-100 cursor-not-allowed"
              value={initiatorName || ''}
              disabled
            />
          </div>

          <div>
            <label className="form-label">一般户账号 <span className="text-red-500">*</span></label>
            <input
              className={`form-input ${errors.initiatorAccount ? 'form-input-error' : ''}`}
              value={bankInfo.initiatorAccount}
              onChange={e => onChangeBank({ initiatorAccount: e.target.value })}
              placeholder="请输入交行一般户账号"
            />
            {errors.initiatorAccount && <p className="form-error-msg">{errors.initiatorAccount}</p>}
          </div>

          <div>
            <label className="form-label">一般户开户行 <span className="text-red-500">*</span></label>
            <input
              className={`form-input ${errors.initiatorBank ? 'form-input-error' : ''}`}
              value={bankInfo.initiatorBank}
              onChange={e => onChangeBank({ initiatorBank: e.target.value })}
              placeholder="请输入一般户开户行"
            />
            {errors.initiatorBank && <p className="form-error-msg">{errors.initiatorBank}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
