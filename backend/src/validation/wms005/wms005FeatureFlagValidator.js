'use strict';

const supplyFlags = require('../../domains/supply/shared/supplyFeatureFlags');
const wmsFlags = require('../../domains/logistics-operational/shared/wmsFeatureFlags');
const { isInc048Enabled } = require('../../integration/inc048/inc048FeatureFlags');
const { logWms005Event } = require('./wms005Observability');

function _clearEnv() {
  delete process.env.IMPETUS_SUPPLY_API;
  delete process.env.IMPETUS_SUPPLY_ENABLED;
  delete process.env.IMPETUS_WMS_API_ENABLED;
  delete process.env.IMPETUS_INC048_ENABLED;
  delete process.env.IMPETUS_SUPPLY_PILOT_ENABLED;
}

function validateFeatureFlagModes() {
  const modes = [];

  _clearEnv();
  modes.push({
    mode: 'all_disabled',
    supply_api: supplyFlags.isSupplyApiEnabled(),
    wms_api: wmsFlags.isWmsApiEnabled(),
    inc048: isInc048Enabled(),
    expected_off: true,
    pass: !supplyFlags.isSupplyApiEnabled() && !wmsFlags.isWmsApiEnabled() && !isInc048Enabled()
  });

  process.env.IMPETUS_SUPPLY_PILOT_ENABLED = 'true';
  modes.push({
    mode: 'pilot_only',
    supply_pilot: supplyFlags.isSupplyPilotEnabled(),
    wms_api: wmsFlags.isWmsApiEnabled(),
    pass: supplyFlags.isSupplyPilotEnabled() && !wmsFlags.isWmsApiEnabled()
  });

  process.env.IMPETUS_WMS_API_ENABLED = 'true';
  modes.push({
    mode: 'wms_module_isolated',
    wms_api: wmsFlags.isWmsApiEnabled(),
    supply_api: supplyFlags.isSupplyApiEnabled(),
    pass: wmsFlags.isWmsApiEnabled() && !supplyFlags.isSupplyApiEnabled()
  });

  process.env.IMPETUS_SUPPLY_API = 'true';
  process.env.IMPETUS_INC048_ENABLED = 'true';
  modes.push({
    mode: 'integrated_platform',
    supply_api: supplyFlags.isSupplyApiEnabled(),
    wms_api: wmsFlags.isWmsApiEnabled(),
    inc048: isInc048Enabled(),
    pass: supplyFlags.isSupplyApiEnabled() && wmsFlags.isWmsApiEnabled() && isInc048Enabled()
  });

  _clearEnv();

  const allPass = modes.every((m) => m.pass);
  logWms005Event({ event: 'FLAG_VALIDATION', all_pass: allPass, modes: modes.length });
  return Object.freeze({ valid: allPass, modes });
}

module.exports = {
  validateFeatureFlagModes
};
