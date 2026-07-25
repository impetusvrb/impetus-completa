'use strict';

const supplyFlags = require('../../domains/supply/shared/supplyFeatureFlags');
const wmsFlags = require('../../domains/logistics-operational/shared/wmsFeatureFlags');
const { isInc048Enabled } = require('../../integration/inc048/inc048FeatureFlags');
const { logWms006Event } = require('./wms006Observability');

function _clearPilotEnv() {
  delete process.env.IMPETUS_SUPPLY_API;
  delete process.env.IMPETUS_SUPPLY_ENABLED;
  delete process.env.IMPETUS_WMS_API_ENABLED;
  delete process.env.IMPETUS_INC048_ENABLED;
  delete process.env.IMPETUS_SUPPLY_PILOT_ENABLED;
  delete process.env.IMPETUS_SUPPLY_PRODUCTION_ENABLED;
  delete process.env.IMPETUS_WMS_PRODUCTION_ENABLED;
}

function validateControlledActivation() {
  const checks = [];

  _clearPilotEnv();
  checks.push({
    id: 'default_all_off',
    ok: !supplyFlags.isSupplyApiEnabled() && !wmsFlags.isWmsApiEnabled() && !isInc048Enabled(),
    note: 'Produção global desligada por defeito'
  });

  process.env.IMPETUS_SUPPLY_PILOT_ENABLED = 'true';
  process.env.IMPETUS_SUPPLY_API = 'true';
  process.env.IMPETUS_WMS_API_ENABLED = 'true';
  process.env.IMPETUS_INC048_ENABLED = 'true';
  checks.push({
    id: 'pilot_tenant_activation',
    ok:
      supplyFlags.isSupplyPilotEnabled() &&
      supplyFlags.isSupplyApiEnabled() &&
      wmsFlags.isWmsApiEnabled() &&
      isInc048Enabled(),
    note: 'Ativação piloto controlada (homologação tenant)'
  });

  _clearPilotEnv();
  checks.push({
    id: 'rollback_immediate',
    ok: !supplyFlags.isSupplyApiEnabled() && !wmsFlags.isWmsApiEnabled() && !isInc048Enabled(),
    note: 'Rollback via env restore'
  });

  checks.push({
    id: 'no_global_production_flag',
    ok: !supplyFlags.snapshot().production_enabled && !wmsFlags.snapshot().production_enabled,
    note: 'Sem IMPETUS_*_PRODUCTION_ENABLED global'
  });

  const valid = checks.every((c) => c.ok);
  logWms006Event({ event: 'CONTROLLED_ACTIVATION', valid, checks: checks.length });
  return Object.freeze({ valid, checks, global_production_blocked: true });
}

module.exports = {
  validateControlledActivation
};
