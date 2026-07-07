import type { FormState } from '../../types/form';
import { isGroupMode } from '../../utils/branchLogic';

interface StepperProps {
  state: FormState;
  currentStep: number;
  completedSteps: number[];
}

export default function Stepper({ state, currentStep, completedSteps }: StepperProps) {
  const group = isGroupMode(state);
  const steps = group
    ? ['核企信息', '集团模式', '银行信息', '账户信息', '利率信息']
    : ['核企信息', '银行信息', '账户信息', '利率信息'];

  const displayIndex = group ? currentStep : (currentStep >= 2 ? currentStep - 1 : currentStep);

  return (
    <div className="mb-8 w-full rounded-lg border border-slate-200 bg-white px-4 py-4 shadow-sm shadow-slate-200/60">
      <div className="flex items-center justify-between">
        {steps.map((label, idx) => {
          const isActive = idx === displayIndex;
          const isCompleted = completedSteps.includes(group ? idx : (idx >= 1 ? idx + 1 : idx));
          const stepNum = idx + 1;
          return (
            <div key={label} className="flex min-w-0 flex-1 items-center">
              <div className="flex flex-col items-center flex-1">
                <div
                  className={`
                    flex h-8 w-8 items-center justify-center rounded-full border text-sm font-bold transition-colors
                    ${isActive ? 'step-active' : isCompleted ? 'step-completed' : 'step-pending'}
                  `}
                >
                  {isCompleted && !isActive ? '✓' : stepNum}
                </div>
                <span className={`mt-2 truncate text-xs ${isActive ? 'font-semibold text-primary-700' : 'text-slate-500'}`}>
                  {label}
                </span>
              </div>
              {idx < steps.length - 1 && (
                <div className={`mx-2 h-px flex-1 ${isCompleted ? 'bg-emerald-300' : 'bg-slate-200'}`} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
