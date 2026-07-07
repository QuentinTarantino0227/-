import { useState, useCallback, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFormState, validateStep1, validateStep2, validateStep3, validateStep4, validateStep5, saveProject } from '../hooks/useFormState';
import { isGroupMode } from '../utils/branchLogic';
import { useAuth } from '../contexts/AuthContext';
import Stepper from '../components/stepper/Stepper';
import Step1CoreInfo from '../components/steps/Step1CoreInfo';
import Step2GroupMode from '../components/steps/Step2GroupMode';
import Step3BankInfo from '../components/steps/Step3BankInfo';
import Step4AccountInfo from '../components/steps/Step4AccountInfo';
import Step5RateInfo from '../components/steps/Step5RateInfo';
import type { FormState } from '../types/form';

const TOTAL_STEPS = 5;

export default function Apply() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { state, updateCoreInfo, updateBankInfo, updateReceiveAccount, updateRateInfo, updateOtherInfo, setSubsidiaries, patchState } = useFormState();
  const [currentStep, setCurrentStep] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const group = isGroupMode(state);

  // 处理从历史合同加载数据
  const handleLoadHistory = useCallback((historyState: FormState) => {
    // 使用 patchState 批量更新所有表单数据
    patchState({
      coreInfo: historyState.coreInfo,
      bankInfo: historyState.bankInfo,
      receiveAccount: historyState.receiveAccount,
      rateInfo: historyState.rateInfo,
      otherInfo: historyState.otherInfo,
      subsidiaries: historyState.subsidiaries,
    });
    // 清除错误
    setErrors({});
  }, [patchState]);

  const validators = [
    validateStep1,
    validateStep2,
    validateStep3,
    validateStep4,
    validateStep5,
  ];

  const validateCurrent = useCallback((customState?: typeof state) => {
    const errs = validators[currentStep](customState || state);
    const map: Record<string, string> = {};
    errs.forEach(e => { map[e.field] = e.message; });
    setErrors(map);
    return errs;
  }, [currentStep, state]);

  const handleNext = async () => {
    let patch: Partial<typeof state> = {};

    // ===== 自动填充：根据当前步骤补全可推导的字段 =====
    if (currentStep === 0) {
      // Step1（核企信息）：清分方式缺省时填充默认值
      if (!state.coreInfo.clearingMethod) {
        patch.coreInfo = { ...state.coreInfo, clearingMethod: '推荐：中信清分' };
      }
      // 集团模式下第一行子公司为空时自动带入
      if (state.coreInfo.isGroupMode === '是' && state.subsidiaries.length > 0) {
        const first = state.subsidiaries[0];
        const isEmpty = !first.name.trim();
        if (isEmpty && state.coreInfo.initiatorName) {
          patch.subsidiaries = state.subsidiaries.map((s, i) =>
            i === 0
              ? {
                  ...s,
                  name: state.coreInfo.initiatorName,
                  repaymentAccount: state.coreInfo.repaymentAccount,
                  repaymentBank: state.coreInfo.repaymentBank,
                  repaymentUnionCode: state.coreInfo.repaymentUnionCode,
                }
              : s
          );
        }
      }
      // 付息方为"仅卖方付息"时，清空买方付息详情
      if (state.coreInfo.interestPayer === '仅卖方付息') {
        patch.coreInfo = {
          ...(patch.coreInfo || state.coreInfo),
          buyerInterestDetail: '',
        };
      }
    }

    if (currentStep === 4) {
      // Step5（利率信息）：平台手续费缺省时填充默认值
      const currentPlatformFee = patch.rateInfo?.platformFee ?? state.rateInfo.platformFee;
      if (currentPlatformFee === undefined || currentPlatformFee === null) {
        patch.rateInfo = { ...state.rateInfo, platformFee: 0.2 };
      }
    }

    // 应用自动填充
    if (Object.keys(patch).length > 0) {
      patchState(patch);
    }

    // 使用填充后的状态进行验证
    const filledState = { ...state, ...patch };
    const validationErrors = validateCurrent(filledState);
    if (validationErrors.length > 0) {
      setTimeout(() => {
        const firstErrorField = validationErrors[0].field;
        const el = document.querySelector(`[name="${firstErrorField}"]`) || document.getElementById(firstErrorField);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }, 50);
      return;
    }

    if (currentStep === 0 && !group) {
      setCurrentStep(2);
    } else if (currentStep < TOTAL_STEPS - 1) {
      setCurrentStep(s => s + 1);
    } else {
      navigate('/result');
    }
    setErrors({});
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveProject(state);
    } finally {
      setSaving(false);
    }
  };

  // 每5分钟自动暂存
  useEffect(() => {
    const timer = setInterval(() => {
      saveProject(state);
    }, 5 * 60 * 1000);
    return () => clearInterval(timer);
  }, [state]);

  const handlePrev = () => {
    if (currentStep === 2 && !group) {
      setCurrentStep(0);
    } else {
      setCurrentStep(s => s - 1);
    }
    setErrors({});
  };

  const completedSteps = useMemo(() => {
    const completed: number[] = [];
    for (let i = 0; i < currentStep; i++) {
      completed.push(i);
    }
    return completed;
  }, [currentStep]);

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return <Step1CoreInfo data={state.coreInfo} otherInfo={state.otherInfo} errors={errors} onChange={updateCoreInfo} onChangeOther={updateOtherInfo} onLoadHistory={handleLoadHistory} />;
      case 1:
        return (
          <Step2GroupMode
            cloudQuota={state.coreInfo.cloudQuota}
            subsidiaries={state.subsidiaries}
            errors={errors}
            onChange={setSubsidiaries}
            clearingMethod={state.coreInfo.clearingMethod}
            productType={state.coreInfo.productType}
            defaultName={state.coreInfo.initiatorName}

            defaultRepaymentAccount={state.coreInfo.repaymentAccount}
            defaultRepaymentBank={state.coreInfo.repaymentBank}
            defaultRepaymentUnionCode={state.coreInfo.repaymentUnionCode}
          />
        );
      case 2:
        return <Step3BankInfo data={state.bankInfo} errors={errors} onChange={updateBankInfo} cooperationBank={state.coreInfo.cooperationBank} productType={state.coreInfo.productType} />;
      case 3:
        return <Step4AccountInfo data={state.receiveAccount} bankInfo={state.bankInfo} errors={errors} onChange={updateReceiveAccount} onChangeBank={updateBankInfo} initiatorName={state.coreInfo.initiatorName} defaultBankName={state.bankInfo.branchName} productType={state.coreInfo.productType} cooperationBank={state.coreInfo.cooperationBank} />;
      case 4:
        return <Step5RateInfo data={state.rateInfo} errors={errors} onChange={updateRateInfo} />;
      default:
        return null;
    }
  };

  const isNextDisabled = useMemo(() => {
    if (currentStep === 1 && group) {
      const totalAssigned = state.subsidiaries.reduce((sum, s) => sum + (s.quota || 0), 0);
      return totalAssigned > state.coreInfo.cloudQuota;
    }
    return false;
  }, [currentStep, group, state]);

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <span className="brand-mark">云</span>
            <div>
              <div className="text-base font-bold text-slate-900">交通银行云信合同生成器</div>
              <div className="text-xs text-slate-500">立项信息填写</div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden text-right text-xs text-slate-500 sm:block">
              {user && (
                <>
                  <span className="font-semibold text-slate-700">{user.display_name}</span>
                  <span className="mx-1 text-slate-300">|</span>
                  <span>{user.affiliation}</span>
                </>
              )}
            </div>
            <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">步骤 {currentStep + 1} / {TOTAL_STEPS}</div>
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

      <main className="mx-auto max-w-4xl px-4 py-8">
        <Stepper state={state} currentStep={currentStep} completedSteps={completedSteps} />

        <div className="card">
          {Object.keys(errors).length > 0 && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start gap-2">
                <svg className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="text-sm text-red-700">
                  <div className="font-medium mb-1">表单填写不完整，请完善以下内容：</div>
                  <ul className="list-disc list-inside space-y-0.5">
                    {Object.values(errors).map((msg, idx) => (
                      <li key={idx}>{msg}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
          {renderStep()}

          <div className="flex justify-between mt-8 pt-6 border-t border-gray-100">
            <button
              onClick={handlePrev}
              disabled={currentStep === 0}
              className="btn-secondary"
            >
              上一步
            </button>
            <div className="flex gap-3">
              <button
                onClick={handleSave}
                disabled={saving}
                className="btn-secondary"
              >
                {saving ? '暂存中...' : '暂存'}
              </button>
              <button
                onClick={handleNext}
                disabled={isNextDisabled}
                className="btn-primary"
              >
                {currentStep === TOTAL_STEPS - 1 ? '生成合同' : '下一步'}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
