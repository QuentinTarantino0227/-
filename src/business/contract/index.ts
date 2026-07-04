import type { FormState } from '../../types/form';
import { getBusinessLine, type BusinessLine } from '../businessLine';
import { commYunxinContractStrategy } from './commYunxinContract';
import type { ContractStrategy } from './types';

const contractStrategies: Record<BusinessLine, ContractStrategy> = {
  comm_yunxin: commYunxinContractStrategy,
};

export function getContractStrategy(state: FormState): ContractStrategy {
  return contractStrategies[getBusinessLine(state)];
}

export function getContractStrategyByLine(line: BusinessLine): ContractStrategy {
  return contractStrategies[line];
}
