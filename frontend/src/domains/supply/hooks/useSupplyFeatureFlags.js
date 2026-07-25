import { useMemo } from 'react';
import { getSupplyFeatureFlagSnapshot } from '../config/supplyFeatureFlags.js';

export function useSupplyFeatureFlags() {
  return useMemo(() => getSupplyFeatureFlagSnapshot(), []);
}
