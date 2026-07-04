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
    <div className="w-full mb-8">
      <div className="flex items-center justify-between">
        {steps.map((label, idx) => {
          const isActive = idx === displayIndex;
          const isCompleted = completedSteps.includes(group ? idx : (idx >= 1 ? idx + 1 : idx));
          const stepNum = idx + 1;
          return (
            <div key={label} className="flex flex-1 items-center">
              <div className="flex flex-col items-center flex-1">
                <div
                  className={`
                    w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-colors
                    ${isActive ? 'step-active' : isCompleted ? 'step-completed' : 'step-pending'}
                  `}
                >
                  {isCompleted && !isActive ? '✓' : stepNum}
                </div>
                <span className={`mt-2 text-xs ${isActive ? 'text-primary-700 font-semibold' : 'text-gray-500'}`}>
                  {label}
                </span>
              </div>
              {idx < steps.length - 1 && (
                <div className={`flex-1 h-0.5 mx-2 ${isCompleted ? 'bg-primary-400' : 'bg-gray-200'}`} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
