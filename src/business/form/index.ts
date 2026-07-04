import type { BusinessLine } from '../businessLine';
import { commYunxinFormStrategy } from './commYunxinForm';
import type { FormStrategy } from './types';

const STRATEGIES: Record<BusinessLine, FormStrategy> = {
  comm_yunxin: commYunxinFormStrategy,
};

export function getFormStrategy(businessLine: BusinessLine): FormStrategy {
  return STRATEGIES[businessLine];
}

export type { FormStrategy, ClearingOption, GroupModeHints } from './types';
