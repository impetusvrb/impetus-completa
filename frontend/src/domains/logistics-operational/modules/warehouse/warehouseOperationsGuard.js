/**
 * OPM-001C — Validação pré-operação (RBAC · Feature Flags · API).
 */
import { getWmsFeatureFlagSnapshot } from '../../config/wmsFeatureFlags.js';
import { canWriteWarehouse } from './warehouseOperationsRbac.js';
import { WAREHOUSE_OPERATION_GAPS } from './warehouseGapRegistry.js';

export const WAREHOUSE_OPS = Object.freeze({
  create: 'create',
  edit: 'edit',
  deactivate: 'deactivate',
  export: 'export',
  history: 'history'
});

export function assessWarehouseOperation(action) {
  const flags = getWmsFeatureFlagSnapshot();
  const canWrite = canWriteWarehouse();

  if (!flags.logistics_enabled || !flags.wms_operational_enabled) {
    return { allowed: false, reason: 'feature_disabled', message: 'Módulo logístico não activo para esta operação.' };
  }

  if (action === WAREHOUSE_OPS.create) {
    if (!canWrite) {
      return { allowed: false, reason: 'permission_denied', message: 'O seu perfil não permite criar armazéns.' };
    }
    return { allowed: true, api: 'POST /warehouses' };
  }

  if (action === WAREHOUSE_OPS.edit) {
    const gap = WAREHOUSE_OPERATION_GAPS.find((g) => g.id === 'GAP-OPM-WH-006');
    return {
      allowed: false,
      reason: 'gap',
      gapId: gap?.id,
      message: 'Edição indisponível — API de actualização não certificada.',
      gap
    };
  }

  if (action === WAREHOUSE_OPS.deactivate) {
    const gap = WAREHOUSE_OPERATION_GAPS.find((g) => g.id === 'GAP-OPM-WH-007');
    return {
      allowed: false,
      reason: 'gap',
      gapId: gap?.id,
      message: 'Desactivação lógica indisponível — endpoint não existente.',
      gap
    };
  }

  if (action === WAREHOUSE_OPS.export) {
    return { allowed: true, clientSide: true };
  }

  if (action === WAREHOUSE_OPS.history) {
    const gap = WAREHOUSE_OPERATION_GAPS.find((g) => g.id === 'GAP-OPM-WH-008');
    return {
      allowed: false,
      reason: 'gap',
      gapId: gap?.id,
      message: 'Histórico dedicado indisponível — derivado de timeline local.',
      gap,
      fallback: 'timeline'
    };
  }

  return { allowed: false, reason: 'unknown', message: 'Operação não reconhecida.' };
}

export function getAvailableToolbarActions() {
  return Object.values(WAREHOUSE_OPS).filter((op) => {
    const a = assessWarehouseOperation(op);
    return a.allowed || op === WAREHOUSE_OPS.export;
  });
}
