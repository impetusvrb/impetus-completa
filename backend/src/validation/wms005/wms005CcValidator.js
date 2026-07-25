'use strict';

const fs = require('fs');
const path = require('path');

const REPO = path.join(__dirname, '../../../..');

function validateCommandCenterCoexistence() {
  const cc = fs.readFileSync(
    path.join(REPO, 'frontend/src/features/dashboard/centroComando/CentroComando.jsx'),
    'utf8'
  );

  const checks = [
    { id: 'supply_cc', ok: cc.includes('SupplyNativeCockpitPromotion') },
    { id: 'logistics_cognitive_cc', ok: cc.includes('LogisticsNativeCockpitPromotion') },
    { id: 'wms_operational_cc', ok: cc.includes('WmsOperationalCcExposure') },
    { id: 'no_supply_in_wms_domain', ok: !cc.includes('domains/logistics-operational/compatibility') },
    { id: 'resolve_supply_runtime', ok: cc.includes('resolveSupplyCockpitRuntime') }
  ];

  const valid = checks.every((c) => c.ok);
  return Object.freeze({ valid, checks });
}

module.exports = {
  validateCommandCenterCoexistence
};
