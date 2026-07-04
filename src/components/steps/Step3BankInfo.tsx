import type { BankInfo, CoreInfo } from '../../types/form';
import { getLatestDueDate } from '../../utils/branchLogic';
import { getBusinessLineFromCore } from '../../business/businessLine';
import { getFormStrategy } from '../../business/form';
import RegionSelector from '../common/RegionSelector';
import type { RegionDetail } from '../common/RegionSelector';

interface Props {
  data: BankInfo;
  errors: Record<string, string>;
  onChange: (patch: Partial<BankInfo>) => void;
  cooperationBank: string;
  productType: string;
}

export default function Step3BankInfo({ data, errors, onChange, cooperationBank, productType }: Props) {
  const strategy = getFormStrategy(getBusinessLineFromCore({ productType, cooperationBank } as CoreInfo));
  void strategy;
  return (
    <div className="space-y-5">
      <h2 className="text-lg font-bold text-gray-900">步骤3：银行信息（投资人）</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <label className="form-label">支行名称（投资人） <span className="text-red-500">*</span></label>
          <input
            className={`form-input ${errors.branchName ? 'form-input-error' : ''}`}
            value={data.branchName}
            onChange={e => onChange({ branchName: e.target.value })}
            onBlur={() => {
              if (data.branchName.trim() && !data.initiatorBank.trim()) {
                onChange({ initiatorBank: data.branchName });
              }
            }}
            placeholder="请输入支行名称"
          />
          {errors.branchName && <p className="form-error-msg">{errors.branchName}</p>}
        </div>

        <div>
          <label className="form-label">支行社会信用代码 <span className="text-red-500">*</span></label>
          <input
            className={`form-input ${errors.branchCreditCode ? 'form-input-error' : ''}`}
            value={data.branchCreditCode}
            onChange={e => onChange({ branchCreditCode: e.target.value })}
            placeholder="18位统一社会信用代码"
            maxLength={18}
          />
          {errors.branchCreditCode && <p className="form-error-msg">{errors.branchCreditCode}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div>
          <label className="form-label">授信起始日 <span className="text-red-500">*</span></label>
          <input
            type="date"
            className={`form-input ${errors.creditStartDate ? 'form-input-error' : ''}`}
            value={data.creditStartDate}
            onChange={e => onChange({ creditStartDate: e.target.value })}
          />
          {errors.creditStartDate && <p className="form-error-msg">{errors.creditStartDate}</p>}
        </div>

        <div>
          <label className="form-label">授信终止日 <span className="text-red-500">*</span></label>
          <input
            type="date"
            className={`form-input ${errors.creditEndDate ? 'form-input-error' : ''}`}
            value={data.creditEndDate}
            onChange={e => onChange({ creditEndDate: e.target.value })}
          />
          {errors.creditEndDate && <p className="form-error-msg">{errors.creditEndDate}</p>}
        </div>

        <div>
          <label className="form-label">最晚业务到期日</label>
          <input
            type="date"
            className="form-input bg-gray-100 cursor-not-allowed"
            value={getLatestDueDate(data.creditEndDate)}
            disabled
          />
          <p className="form-hint">固定为授信终止日后6个月</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <label className="form-label">客户经理姓名 <span className="text-red-500">*</span></label>
          <input
            className={`form-input ${errors.managerName ? 'form-input-error' : ''}`}
            value={data.managerName}
            onChange={e => onChange({ managerName: e.target.value })}
            placeholder="请输入客户经理姓名"
          />
          {errors.managerName && <p className="form-error-msg">{errors.managerName}</p>}
        </div>

        <div>
          <label className="form-label">客户经理手机号 <span className="text-red-500">*</span></label>
          <input
            className={`form-input ${errors.managerPhone ? 'form-input-error' : ''}`}
            value={data.managerPhone}
            onChange={e => onChange({ managerPhone: e.target.value })}
            placeholder="11位手机号"
            maxLength={11}
          />
          {errors.managerPhone && <p className="form-error-msg">{errors.managerPhone}</p>}
        </div>

        <div>
          <label className="form-label">支行所在省市区 <span className="text-red-500">*</span></label>
          <RegionSelector
            value={data.branchRegion}
            onChange={v => onChange({ branchRegion: v })}
            onChangeDetail={(d: RegionDetail) => onChange({ branchProvince: d.province, branchCity: d.city, branchArea: d.area })}
            error={errors.branchRegion}
          />
          <div className="mt-1 text-xs text-gray-500">
            省：{data.branchProvince || '（空）'} | 市：{data.branchCity || '（空）'} | 区：{data.branchArea || '（空）'}
          </div>
        </div>

        <div>
          <label className="form-label">支行详细地址 <span className="text-red-500">*</span></label>
          <input
            className={`form-input ${errors.branchAddress ? 'form-input-error' : ''}`}
            value={data.branchAddress}
            onChange={e => onChange({ branchAddress: e.target.value })}
            placeholder="例：自强路26号"
          />
          {errors.branchAddress && <p className="form-error-msg">{errors.branchAddress}</p>}
        </div>


      </div>
    </div>
  );
}
