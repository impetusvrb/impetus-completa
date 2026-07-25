'use strict';

/**
 * WMS-003 — Feature flags exposição API (default false — produção protegida).
 */

function _flag(name, defaultVal = false) {
  const v = process.env[name];
  if (v == null || v === '') return defaultVal;
  return v === 'true' || v === '1' || v === 'on';
}

module.exports = {
  isWmsOperationalEnabled: () => _flag('IMPETUS_WMS_OPERATIONAL_ENABLED', false),
  isWmsInventoryEnabled: () => _flag('IMPETUS_WMS_INVENTORY_ENABLED', false),
  isWmsReceivingEnabled: () => _flag('IMPETUS_WMS_RECEIVING_ENABLED', false),
  isWmsShippingEnabled: () => _flag('IMPETUS_WMS_SHIPPING_ENABLED', false),
  isWmsPickingEnabled: () => _flag('IMPETUS_WMS_PICKING_ENABLED', false),
  isWmsTransferEnabled: () => _flag('IMPETUS_WMS_TRANSFER_ENABLED', false),
  isWmsApiEnabled: () => _flag('IMPETUS_WMS_API_ENABLED', false) || _flag('VITE_IMPETUS_WMS_API', false),
  isLogisticsApiEnabled: () => _flag('IMPETUS_LOGISTICS_API_ENABLED', false) || _flag('VITE_IMPETUS_LOGISTICS_API', false),
  isInventoryApiEnabled: () => _flag('IMPETUS_INVENTORY_API_ENABLED', false) || _flag('VITE_IMPETUS_INVENTORY_API', false),
  isLogisticsEnabled: () => _flag('IMPETUS_LOGISTICS_ENABLED', false) || _flag('VITE_IMPETUS_LOGISTICS_ENABLED', false),
  isLogisticsMenuEnabled: () => _flag('IMPETUS_LOGISTICS_MENU', false) || _flag('VITE_IMPETUS_LOGISTICS_MENU', false),
  isLogisticsWorkspaceEnabled: () => _flag('IMPETUS_LOGISTICS_WORKSPACE', false) || _flag('VITE_IMPETUS_LOGISTICS_WORKSPACE', false),
  isLogisticsCcEnabled: () => _flag('IMPETUS_LOGISTICS_CC', false) || _flag('VITE_IMPETUS_LOGISTICS_CC', false),

  snapshot() {
    return {
      wms_operational_enabled: this.isWmsOperationalEnabled(),
      wms_inventory_enabled: this.isWmsInventoryEnabled(),
      wms_receiving_enabled: this.isWmsReceivingEnabled(),
      wms_shipping_enabled: this.isWmsShippingEnabled(),
      wms_picking_enabled: this.isWmsPickingEnabled(),
      wms_transfer_enabled: this.isWmsTransferEnabled(),
      wms_api_enabled: this.isWmsApiEnabled(),
      logistics_api_enabled: this.isLogisticsApiEnabled(),
      inventory_api_enabled: this.isInventoryApiEnabled(),
      logistics_enabled: this.isLogisticsEnabled(),
      logistics_menu: this.isLogisticsMenuEnabled(),
      logistics_workspace: this.isLogisticsWorkspaceEnabled(),
      logistics_cc: this.isLogisticsCcEnabled(),
      phase: 'WMS-004',
      production_enabled: false,
      menu_visible: false
    };
  }
};
