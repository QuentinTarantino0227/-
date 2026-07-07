import { useEffect } from 'react';
import type { CoreInfo, Subsidiary } from '../../types/form';
import { getBusinessLineFromCore } from '../../business/businessLine';
import { getFormStrategy } from '../../business/form';

interface Props {
  cloudQuota: number;
  subsidiaries: Subsidiary[];
  errors: Record<string, string>;
  onChange: (subsidiaries: Subsidiary[]) => void;
  clearingMethod: string;
  productType?: string;
  defaultName: string;
  defaultRepaymentAccount: string;
  defaultRepaymentBank: string;
  defaultRepaymentUnionCode: string;
}

export default function Step2GroupMode({
  cloudQuota,
  subsidiaries,
  errors,
  onChange,
  clearingMethod,
  productType,
  defaultName,
  defaultRepaymentAccount,
  defaultRepaymentBank,
  defaultRepaymentUnionCode,
}: Props) {
  const strategy = getFormStrategy(getBusinessLineFromCore({ productType: (productType || "云信"), cooperationBank: "" } as CoreInfo));
  const totalAssigned = subsidiaries.reduce((sum, s) => sum + (s.quota || 0), 0);
  const remaining = cloudQuota - totalAssigned;
  const needRepaymentAccount = strategy.requiresRepaymentAccount(clearingMethod);

  // 组件挂载时，如果第一行为空，自动带入 step1 企业信息
  useEffect(() => {
    if (subsidiaries.length > 0) {
      const first = subsidiaries[0];
      const isEmpty = !first.name.trim();
      if (isEmpty && defaultName) {
        const next = [...subsidiaries];
        next[0] = {
          ...first,
          name: defaultName,
          repaymentAccount: defaultRepaymentAccount,
          repaymentBank: defaultRepaymentBank,
          repaymentUnionCode: defaultRepaymentUnionCode,
        };
        onChange(next);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 当 step1 企业名称/还款账号变化时，同步更新第一行（保持与 step1 一致）
  useEffect(() => {
    if (subsidiaries.length > 0) {
      const first = subsidiaries[0];
      const shouldUpdateName = defaultName !== undefined && first.name !== defaultName;
      const shouldUpdateRepayment = needRepaymentAccount && (
        first.repaymentAccount !== defaultRepaymentAccount ||
        first.repaymentBank !== defaultRepaymentBank ||
        first.repaymentUnionCode !== defaultRepaymentUnionCode
      );
      if (shouldUpdateName || shouldUpdateRepayment) {
        const next = [...subsidiaries];
        next[0] = {
          ...first,
          ...(shouldUpdateName ? { name: defaultName } : {}),
          ...(shouldUpdateRepayment ? {
            repaymentAccount: defaultRepaymentAccount,
            repaymentBank: defaultRepaymentBank,
            repaymentUnionCode: defaultRepaymentUnionCode,
          } : {}),
        };
        onChange(next);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultName, defaultRepaymentAccount, defaultRepaymentBank, defaultRepaymentUnionCode, needRepaymentAccount]);

  const updateSub = (index: number, patch: Partial<Subsidiary>) => {
    const next = [...subsidiaries];
    next[index] = { ...next[index], ...patch };
    onChange(next);
  };

  const addSub = () => {
    if (subsidiaries.length >= 150) return;
    onChange([...subsidiaries, {
      id: Math.random().toString(36).substring(2, 9),
      name: '', quota: 0, creditCode: '', repaymentAccount: '', repaymentBank: '', repaymentUnionCode: ''
    }]);
  };

  const removeSub = (index: number) => {
    if (subsidiaries.length <= 2) return;
    const next = [...subsidiaries];
    next.splice(index, 1);
    onChange(next);
  };

  return (
    <div className="space-y-5">
      <h2 className="text-lg font-bold text-gray-900">步骤2：集团模式</h2>

      <div className="flex items-center justify-between bg-gray-50 rounded-lg p-4 border border-gray-200">
        <div>
          <span className="text-sm text-gray-600">待分配额度：</span>
          <span className={`text-2xl font-bold ml-2 ${remaining >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {remaining}
          </span>
          <span className="text-sm text-gray-600 ml-1">万元</span>
        </div>
        <div className={`text-sm font-medium ${remaining >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          {remaining >= 0 ? '✓ 额度未超额，可继续' : '已超额分配，请调整'}
        </div>
      </div>

      {errors.subsidiaries && (
        <div className="text-sm text-red-600 bg-red-50 rounded px-3 py-2">{errors.subsidiaries}</div>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-100 text-gray-700">
              <th className="px-2 py-2 text-left font-medium min-w-[320px]">子公司名称</th>
              <th className="px-2 py-2 text-left font-medium min-w-[120px]">分配额度（万元）</th>
              {needRepaymentAccount && (
                <>
                  <th className="px-2 py-2 text-left font-medium min-w-[160px]">核企还款账号</th>
                  <th className="px-2 py-2 text-left font-medium min-w-[160px]">还款户开户行</th>
                  <th className="px-2 py-2 text-left font-medium min-w-[140px]">还款户联行号</th>
                </>
              )}
              <th className="px-2 py-2 text-center font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {subsidiaries.map((s, i) => (
              <tr key={s.id} className="border-b border-gray-100">
                <td className="px-2 py-2">
                  <input
                    className={`w-full rounded border px-2 py-1 text-sm focus:border-primary-500 focus:outline-none ${i === 0 && defaultName ? 'bg-gray-100 text-gray-600 cursor-not-allowed' : 'border-gray-300'}`}
                    value={s.name}
                    onChange={e => updateSub(i, { name: e.target.value })}
                    placeholder={i === 0 ? '名称' : `子公司${i}`}
                    readOnly={i === 0 && !!defaultName}
                  />
                </td>
                <td className="px-2 py-2">
                  <input
                    type="number"
                    min={0}
                    className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:border-primary-500 focus:outline-none"
                    value={s.quota === undefined || s.quota === null ? '' : s.quota}
                    onChange={e => {
                      const val = Number(e.target.value);
                      updateSub(i, { quota: val < 0 ? 0 : val });
                    }}
                    placeholder="额度"
                  />
                </td>

                {needRepaymentAccount && (
                  <>
                    <td className="px-2 py-2">
                      <input
                        className={`w-full rounded border px-2 py-1 text-sm focus:border-primary-500 focus:outline-none ${i === 0 && (defaultRepaymentAccount || defaultRepaymentBank || defaultRepaymentUnionCode) ? 'bg-gray-100 text-gray-600 cursor-not-allowed' : 'border-gray-300'}`}
                        value={s.repaymentAccount}
                        onChange={e => updateSub(i, { repaymentAccount: e.target.value })}
                        placeholder="还款账号"
                        readOnly={i === 0 && !!(defaultRepaymentAccount || defaultRepaymentBank || defaultRepaymentUnionCode)}
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        className={`w-full rounded border px-2 py-1 text-sm focus:border-primary-500 focus:outline-none ${i === 0 && (defaultRepaymentAccount || defaultRepaymentBank || defaultRepaymentUnionCode) ? 'bg-gray-100 text-gray-600 cursor-not-allowed' : 'border-gray-300'}`}
                        value={s.repaymentBank}
                        onChange={e => updateSub(i, { repaymentBank: e.target.value })}
                        placeholder="开户行"
                        readOnly={i === 0 && !!(defaultRepaymentAccount || defaultRepaymentBank || defaultRepaymentUnionCode)}
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        className={`w-full rounded border px-2 py-1 text-sm focus:border-primary-500 focus:outline-none ${i === 0 && (defaultRepaymentAccount || defaultRepaymentBank || defaultRepaymentUnionCode) ? 'bg-gray-100 text-gray-600 cursor-not-allowed' : 'border-gray-300'}`}
                        value={s.repaymentUnionCode}
                        onChange={e => updateSub(i, { repaymentUnionCode: e.target.value })}
                        placeholder="联行号"
                        maxLength={12}
                        readOnly={i === 0 && !!(defaultRepaymentAccount || defaultRepaymentBank || defaultRepaymentUnionCode)}
                      />
                    </td>
                  </>
                )}
                <td className="px-2 py-2 text-center">
                  <button
                    onClick={() => removeSub(i)}
                    disabled={subsidiaries.length <= 1}
                    className="text-red-500 hover:text-red-700 text-sm disabled:text-gray-300"
                  >
                    删除
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button
        onClick={addSub}
        disabled={subsidiaries.length >= 150}
        className="btn-secondary text-sm"
      >
        + 添加子公司
      </button>
      <span className="text-xs text-gray-400 ml-2">最多150家（含母公司）</span>
    </div>
  );
}
