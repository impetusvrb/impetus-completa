import { useMemo } from 'react';
import { getWmsFeatureFlagSnapshot } from '../config/wmsFeatureFlags.js';

export function useWmsFeatureFlags() {
  return useMemo(() => getWmsFeatureFlagSnapshot(), []);
}
