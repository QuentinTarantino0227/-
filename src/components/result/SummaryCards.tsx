import type { FormState } from '../../types/form';
import { isGroupMode, getLatestDueDate } from '../../utils/branchLogic';
import { getEffectiveQuotaName } from '../../utils/excelMapping';

interface Props {
  state: FormState;
}

export default function SummaryCards({ state }: Props) {
  const { coreInfo, subsidiaries, bankInfo, receiveAccount, rateInfo, otherInfo } = state;
  // 收款户开户行缺省时，默认取步骤4的支行名称
  const recvBankName = receiveAccount.bankName.trim() || bankInfo.branchName;

  return (
    <div className="space-y-6">
      <div className="card">
        <h3 className="text-base font-bold text-gray-900 mb-4 pb-2 border-b border-gray-100">1. 核企信息</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <div><span className="text-gray-500">产品类型：</span>{coreInfo.productType}</div>
          <div><span className="text-gray-500">合作银行：</span>{coreInfo.cooperationBank}</div>
          <div><span className="text-gray-500">合作模式：</span>{coreInfo.cooperationMode}</div>
          <div><span className="text-gray-500">额度发起方名称：</span>{coreInfo.initiatorName}</div>
          <div><span className="text-gray-500">统一社会信用代码：</span>{coreInfo.creditCode}</div>
          <div><span className="text-gray-500">云信额度：</span>{coreInfo.cloudQuota} 万元</div>
          <div><span className="text-gray-500">是否集团模式：</span>{coreInfo.isGroupMode}</div>
          <div className="md:col-span-2"><span className="text-gray-500">清分方式：</span>{coreInfo.clearingMethod}</div>
          <div><span className="text-gray-500">核企还款账户：</span>{coreInfo.repaymentAccount}</div>
          <div><span className="text-gray-500">还款户开户行：</span>{coreInfo.repaymentBank}</div>
          <div><span className="text-gray-500">还款户联行号：</span>{coreInfo.repaymentUnionCode}</div>
          <div><span className="text-gray-500">付息方：</span>{coreInfo.interestPayer}</div>
          {coreInfo.buyerInterestDetail && <div><span className="text-gray-500">买方付息详情：</span>{coreInfo.buyerInterestDetail}</div>}
          {coreInfo.confirmationMode && <div><span className="text-gray-500">确权模式：</span>{coreInfo.confirmationMode}</div>}
          {coreInfo.confirmationPost && <div><span className="text-gray-500">确权岗位：</span>{coreInfo.confirmationPost}</div>}

        </div>
      </div>

      {isGroupMode(state) && (
        <div className="card">
          <h3 className="text-base font-bold text-gray-900 mb-4 pb-2 border-b border-gray-100">2. 集团模式</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm border border-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-gray-700 border-b">子公司名称</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-700 border-b">分配额度（万元）</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-700 border-b">社会信用代码</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-700 border-b">核企还款账户</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-700 border-b">还款户开户行</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-700 border-b">还款户联行号</th>
                </tr>
              </thead>
              <tbody>
                {subsidiaries.map(s => (
                  <tr key={s.id} className="border-b border-gray-100">
                    <td className="px-3 py-2">{s.name}</td>
                    <td className="px-3 py-2">{s.quota}</td>
                    <td className="px-3 py-2">{s.creditCode}</td>
                    <td className="px-3 py-2">{s.repaymentAccount}</td>
                    <td className="px-3 py-2">{s.repaymentBank}</td>
                    <td className="px-3 py-2">{s.repaymentUnionCode}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="card">
        <h3 className="text-base font-bold text-gray-900 mb-4 pb-2 border-b border-gray-100">3. 银行信息（投资人）</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <div><span className="text-gray-500">支行名称：</span>{bankInfo.branchName}</div>
          <div><span className="text-gray-500">支行社会信用代码：</span>{bankInfo.branchCreditCode}</div>
          <div><span className="text-gray-500">授信起始日：</span>{bankInfo.creditStartDate}</div>
          <div><span className="text-gray-500">授信终止日：</span>{bankInfo.creditEndDate}</div>
          <div><span className="text-gray-500">最晚业务到期日：</span>{getLatestDueDate(bankInfo.creditEndDate)}</div>
          <div><span className="text-gray-500">客户经理姓名：</span>{bankInfo.managerName}</div>
          <div><span className="text-gray-500">客户经理手机号：</span>{bankInfo.managerPhone}</div>
          <div><span className="text-gray-500">支行所在省市区：</span>{bankInfo.branchRegion}</div>
          <div><span className="text-gray-500">支行详细地址：</span>{bankInfo.branchAddress}</div>
          <div><span className="text-gray-500">交行结算账户：</span>{bankInfo.initiatorAccount}</div>
          <div><span className="text-gray-500">结算账户开户行：</span>{bankInfo.initiatorBank}</div>
        </div>
      </div>

      <div className="card">
        <h3 className="text-base font-bold text-gray-900 mb-4 pb-2 border-b border-gray-100">账户信息</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <div><span className="text-gray-500">收款户名：</span>{receiveAccount.accountName}</div>

          <div><span className="text-gray-500">收款账号：</span>{receiveAccount.accountNumber}</div>
          <div><span className="text-gray-500">开户行：</span>{recvBankName}</div>
          <div className="md:col-span-2"><span className="text-gray-500">联行号：</span>{receiveAccount.unionCode}</div>
        </div>
      </div>

      <div className="card">
        <h3 className="text-base font-bold text-gray-900 mb-4 pb-2 border-b border-gray-100">5. 利率信息</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
          <div><span className="text-gray-500">银行融资利率（预计）：</span>{rateInfo.financingRate}%（{rateInfo.financingRateType || '年化'}）</div>
          <div><span className="text-gray-500">银行保理手续费（预计）：</span>{rateInfo.factoringFee}%（{rateInfo.factoringFeeType || '非年化'}）</div>
          <div><span className="text-gray-500">中企云链平台手续费平台综合服务费率：</span>{rateInfo.platformFee}%（{rateInfo.platformFeeType || '年化'}）</div>
        </div>
      </div>

      <div className="card">
        <h3 className="text-base font-bold text-gray-900 mb-4 pb-2 border-b border-gray-100">6. 其他</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <div><span className="text-gray-500">立项类型：</span>{otherInfo.projectType || '-'}</div>
          <div><span className="text-gray-500">额度简称：</span>{getEffectiveQuotaName(state)}</div>
        </div>
      </div>
    </div>
  );
}
