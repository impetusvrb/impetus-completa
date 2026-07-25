'use strict';

const { SUPPLY_RUNTIME_IDENTITY } = require('../core/supplyRuntimeIdentity');

module.exports = Object.freeze({
  identity: SUPPLY_RUNTIME_IDENTITY,
  foundation_phase: 'GF-022',
  core_domain: { phase: 'GF-023', active: true },
  allow_business_rules: true,
  allow_signal_loader: true,
  allow_promotion: true,
  allow_consolidation: true,
  allow_command_center: true,
  allow_pilot: true,
  pilot_phase: 'GF-026'
});
