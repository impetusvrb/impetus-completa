/**
 * WMS-004 — Feature flags Logística operacional (default false).
 */

function truthy(v) {
  return v === 'true' || v === '1' || v === true;
}

function envVite(key) {
  try {
    return import.meta.env && import.meta.env[key];
  } catch {
    return undefined;
  }
}

export function isLogisticsEnabled() {
  return truthy(envVite('VITE_IMPETUS_LOGISTICS_ENABLED'));
}

export function isLogisticsMenuEnabled() {
  return truthy(envVite('VITE_IMPETUS_LOGISTICS_MENU'));
}

export function isLogisticsWorkspaceEnabled() {
  return truthy(envVite('VITE_IMPETUS_LOGISTICS_WORKSPACE'));
}

export function isLogisticsCcEnabled() {
  return truthy(envVite('VITE_IMPETUS_LOGISTICS_CC'));
}

/** WMS-001 granular flags (sub-módulos) */
export function isWmsOperationalEnabled() {
  return isLogisticsEnabled() && truthy(envVite('VITE_IMPETUS_WMS_OPERATIONAL_ENABLED'));
}

export function isWmsInventoryEnabled() {
  return isLogisticsEnabled() && truthy(envVite('VITE_IMPETUS_WMS_INVENTORY_ENABLED'));
}

export function isWmsReceivingEnabled() {
  return isLogisticsEnabled() && truthy(envVite('VITE_IMPETUS_WMS_RECEIVING_ENABLED'));
}

export function isWmsShippingEnabled() {
  return isLogisticsEnabled() && truthy(envVite('VITE_IMPETUS_WMS_SHIPPING_ENABLED'));
}

export function isWmsPickingEnabled() {
  return isLogisticsEnabled() && truthy(envVite('VITE_IMPETUS_WMS_PICKING_ENABLED'));
}

export function isWmsTransferEnabled() {
  return isLogisticsEnabled() && truthy(envVite('VITE_IMPETUS_WMS_TRANSFER_ENABLED'));
}

export function isWmsMenuVisible() {
  return isLogisticsEnabled() && isLogisticsMenuEnabled() && isLogisticsWorkspaceEnabled();
}

export function getWmsFeatureFlagSnapshot() {
  return Object.freeze({
    logistics_enabled: isLogisticsEnabled(),
    logistics_menu: isLogisticsMenuEnabled(),
    logistics_workspace: isLogisticsWorkspaceEnabled(),
    logistics_cc: isLogisticsCcEnabled(),
    wms_operational_enabled: isWmsOperationalEnabled(),
    wms_inventory_enabled: isWmsInventoryEnabled(),
    wms_receiving_enabled: isWmsReceivingEnabled(),
    wms_shipping_enabled: isWmsShippingEnabled(),
    wms_picking_enabled: isWmsPickingEnabled(),
    wms_transfer_enabled: isWmsTransferEnabled(),
    menu_visible: isWmsMenuVisible(),
    production_enabled: false,
    phase: 'WMS-004',
    api_base: '/logistics-operational/v1'
  });
}
