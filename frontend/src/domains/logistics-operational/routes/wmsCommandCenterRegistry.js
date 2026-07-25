/**
 * WMS-004 — Exposição operacional no Centro de Comando (apresentação only).
 */
import { isLogisticsCcEnabled, isLogisticsWorkspaceEnabled } from '../config/wmsFeatureFlags.js';
import { WMS_OPERATIONAL_BASE } from './wmsOperationalRegistry.js';

export const WMS_CC_OPERATIONAL_EXPOSURE = Object.freeze({
  id: 'wms_operational_cc_exposure',
  runtime_id: 'logistics_native',
  operational_layer: 'logistics-operational',
  api_phase: 'WMS-003',
  workspace_path: WMS_OPERATIONAL_BASE,
  phase: 'WMS-004',
  cognitive_logic: false
});

export function isWmsCcExposureActive() {
  return isLogisticsCcEnabled() && isLogisticsWorkspaceEnabled();
}

export function getWmsCommandCenterSnapshot() {
  return Object.freeze({
    exposure: WMS_CC_OPERATIONAL_EXPOSURE,
    active: isWmsCcExposureActive()
  });
}
