import { useEffect, useMemo, useState } from 'react';
import type { CoreInfo, OtherInfo, FormState } from '../../types/form';
import {
  INTEREST_PAYER_OPTIONS,
  BUYER_INTEREST_OPTIONS,
  YES_NO_OPTIONS,
  FIRST_TRADE_BACK_OPTIONS,
} from '../../data/formOptions';
import { getBusinessLineFromCore } from '../../business/businessLine';
import { getFormStrategy } from '../../business/form';
import { checkQuotaInDb } from '../../utils/quotaQuery';
import HistoryReference from './HistoryReference';

function getClearingAccountName(clearingMethod: string): string {
  if (clearingMethod.includes('交e保')) return '交行资金登记簿';
  if (clearingMethod.includes('e企付')) return '工行资金登记簿';
  // 实体户：从标签中提取银行名
  const entityMatch = clearingMethod.match(/实体户：(.+)/);
  if (entityMatch) return `${entityMatch[1]}账户`;
  // 中信过渡户
  if (clearingMethod.includes('中信过渡户')) return '中信过渡户';
  return '清分账户';
}

interface Props {
  data: CoreInfo;
  otherInfo: OtherInfo;
  errors: Record<string, string>;
  onChange: (patch: Partial<CoreInfo>) => void;
  onChangeOther: (patch: Partial<OtherInfo>) => void;
  onLoadHistory: (state: FormState) => void;
  readOnly?: boolean;
}

export default function Step1CoreInfo({ data, otherInfo, errors, onChange, onChangeOther, onLoadHistory, readOnly }: Props) {
  const strategy = getFormStrategy(getBusinessLineFromCore(data));
  const [quotaShortNameError, setQuotaShortNameError] = useState('');
  const clearingAccountName = useMemo(() => getClearingAccountName(data.clearingMethod), [data.clearingMethod]);

  // 若当前策略只有一个清分选项，自动锁定为该选项
  useEffect(() => {
    if (strategy.clearingOptions.length === 1 && data.clearingMethod !== strategy.clearingOptions[0].value) {
      onChange({ clearingMethod: strategy.clearingOptions[0].value });
    }
  }, [strategy.clearingOptions, data.clearingMethod, onChange]);

  // 额度简称唯一性校验
  useEffect(() => {
    if (!otherInfo.quotaShortName.trim() || !data.initiatorName.trim()) {
      setQuotaShortNameError('');
      return;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      checkQuotaInDb(
        data.initiatorName,
        otherInfo.projectType,
        otherInfo.quotaShortName,
        data.cooperationBank,
        data.productType
      ).then(res => {
        if (!cancelled) {
          setQuotaShortNameError(res.ok ? '' : res.message);
        }
      });
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [otherInfo.quotaShortName, data.initiatorName, otherInfo.projectType, data.cooperationBank, data.productType]);

  // 清分方式变化时，自动填入对应的默认还款户开户行
  useEffect(() => {
    const defaultBank = strategy.getDefaultRepaymentBank(data.clearingMethod);
    if (defaultBank && data.repaymentBank.trim() === '') {
      onChange({ repaymentBank: defaultBank });
    }
  }, [data.clearingMethod]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-5">
      <HistoryReference onLoadData={onLoadHistory} />

      <h2 className="text-lg font-bold text-gray-900">步骤1：核企信息</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <label className="form-label">额度发起方名称 <span className="text-red-500">*</span></label>
          <input
            className={`form-input ${errors.initiatorName ? 'form-input-error' : ''}`}
            value={data.initiatorName}
            onChange={e => onChange({ initiatorName: e.target.value })}
            placeholder="请输入额度发起方名称"
            disabled={readOnly}
          />
          {errors.initiatorName && <p className="form-error-msg">{errors.initiatorName}</p>}
        </div>

        <div>
          <label className="form-label">统一社会信用代码 <span className="text-red-500">*</span></label>
          <input
            className={`form-input ${errors.creditCode ? 'form-input-error' : ''}`}
            value={data.creditCode}
            onChange={e => onChange({ creditCode: e.target.value })}
            placeholder="18位统一社会信用代码"
            maxLength={18}
          />
          {errors.creditCode && <p className="form-error-msg">{errors.creditCode}</p>}
        </div>

        <div>
          <label className="form-label">{strategy.quotaLabel} <span className="text-red-500">*</span></label>
          <input
            type="number"
            min={0}
            step={1}
            className={`form-input ${errors.cloudQuota ? 'form-input-error' : ''}`}
            value={data.cloudQuota || ''}
            onChange={e => onChange({ cloudQuota: Math.floor(Number(e.target.value) || 0) })}
            placeholder={strategy.quotaPlaceholder}
          />
          {errors.cloudQuota && <p className="form-error-msg">{errors.cloudQuota}</p>}
        </div>

        <div>
          <label className="form-label">是否集团模式 <span className="text-red-500">*</span></label>
          <div className="flex flex-col gap-2 mt-2">
            {YES_NO_OPTIONS.map(opt => (
              <label key={opt.value} className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="isGroupMode"
                  value={opt.value}
                  checked={data.isGroupMode === opt.value}
                  onChange={() => onChange({ isGroupMode: opt.value as '是' | '否' })}
                  className="h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700">{opt.label}</span>
                {opt.value === '是' && (
                  <span className="text-xs text-gray-400">{strategy.groupModeHints.yes}</span>
                )}
                {opt.value === '否' && (
                  <span className="text-xs text-gray-400">{strategy.groupModeHints.no}</span>
                )}
              </label>
            ))}
          </div>
          {errors.isGroupMode && <p className="form-error-msg">{errors.isGroupMode}</p>}
        </div>
      </div>

      <div>
        <label className="form-label">额度简称 <span className="text-red-500">*</span></label>
        <input
          className={`form-input ${errors.quotaShortName || quotaShortNameError ? 'form-input-error' : ''}`}
          value={otherInfo.quotaShortName}
          onChange={e => onChangeOther({ quotaShortName: e.target.value })}
          placeholder="请输入额度简称，例：中铁八十局-交行"
        />
        {errors.quotaShortName && <p className="form-error-msg">{errors.quotaShortName}</p>}
        {quotaShortNameError && <p className="form-error-msg">{quotaShortNameError}</p>}
      </div>

      <div>
        <label className="form-label">清分方式 <span className="text-red-500">*</span></label>
        <select
          className={`form-input ${errors.clearingMethod ? 'form-input-error' : ''}`}
          value={data.clearingMethod}
          onChange={e => onChange({ clearingMethod: e.target.value })}
        >
          <option value="">请选择清分方式</option>
          {strategy.clearingOptions.map(m => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
        {errors.clearingMethod && <p className="form-error-msg">{errors.clearingMethod}</p>}
      </div>

      {strategy.requiresRepaymentAccount(data.clearingMethod) && (
        <div>
          <p className="text-sm text-red-600 mb-3">该清分方式下，云信到期前，核企需要把钱存入这个{clearingAccountName}。</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div>
            <label className="form-label">还款账号 <span className="text-red-500">*</span></label>
            <input
              className={`form-input ${errors.repaymentAccount ? 'form-input-error' : ''}`}
              value={data.repaymentAccount}
              onChange={e => onChange({ repaymentAccount: e.target.value })}
              placeholder="请输入核企还款账户"
            />
            {errors.repaymentAccount && <p className="form-error-msg">{errors.repaymentAccount}</p>}
          </div>
          <div>
            <label className="form-label">还款户开户行 <span className="text-red-500">*</span></label>
            <input
              className={`form-input ${errors.repaymentBank ? 'form-input-error' : ''}`}
              value={data.repaymentBank}
              onChange={e => onChange({ repaymentBank: e.target.value })}
              placeholder="请输入还款户开户行"
            />
            {errors.repaymentBank && <p className="form-error-msg">{errors.repaymentBank}</p>}
          </div>
          <div>
            <label className="form-label">还款户联行号 <span className="text-red-500">*</span></label>
            <input
              className={`form-input ${errors.repaymentUnionCode ? 'form-input-error' : ''}`}
              value={data.repaymentUnionCode}
              onChange={e => onChange({ repaymentUnionCode: e.target.value })}
              placeholder="请输入还款户联行号"
              maxLength={12}
            />
            {errors.repaymentUnionCode && <p className="form-error-msg">{errors.repaymentUnionCode}</p>}
          </div>
        </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <label className="form-label">付息方 <span className="text-red-500">*</span></label>
          <div className="flex gap-4 mt-2">
            {INTEREST_PAYER_OPTIONS.map(opt => (
              <label key={opt.value} className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="interestPayer"
                  value={opt.value}
                  checked={data.interestPayer === opt.value}
                  onChange={() => onChange({ interestPayer: opt.value as '仅卖方付息' | '需要买方付息' })}
                  className="h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700">{opt.label}</span>
              </label>
            ))}
          </div>
          <p className="form-hint">{strategy.interestPayerHint}</p>
          {errors.interestPayer && <p className="form-error-msg">{errors.interestPayer}</p>}
        </div>

        {data.isGroupMode === '是' && data.interestPayer === '需要买方付息' && (
          <div>
            <label className="form-label">买方付息详情 <span className="text-red-500">*</span></label>
            <div className="flex gap-4 mt-2">
              {BUYER_INTEREST_OPTIONS.map(opt => (
                <label key={opt.value} className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="buyerInterestDetail"
                    value={opt.value}
                    checked={data.buyerInterestDetail === opt.value}
                    onChange={() => onChange({ buyerInterestDetail: opt.value as '子公司各自付息费' | '集团统一付息' })}
                    className="h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                  />
                  <span className="text-sm text-gray-700">{opt.label}</span>
                </label>
              ))}
            </div>
            {errors.buyerInterestDetail && <p className="form-error-msg">{errors.buyerInterestDetail}</p>}
          </div>
        )}
      </div>

      {strategy.showFirstTradeBack && (
        <div>
          <label className="form-label">一手贸背 <span className="text-red-500">*</span></label>
          <div className="flex gap-4 mt-2">
            {FIRST_TRADE_BACK_OPTIONS.map(opt => (
              <label key={opt.value} className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="firstTradeBack"
                  value={opt.value}
                  checked={data.firstTradeBack === opt.value}
                  onChange={() => onChange({ firstTradeBack: opt.value as '可提供一手发票' | '后补一手发票（需出具说明）' })}
                  className="h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700">{opt.label}</span>
              </label>
            ))}
          </div>
          {errors.firstTradeBack && <p className="form-error-msg">{errors.firstTradeBack}</p>}
        </div>
      )}
    </div>
  );
}
