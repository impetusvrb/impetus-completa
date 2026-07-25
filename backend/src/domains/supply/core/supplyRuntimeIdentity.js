'use strict';

/**
 * GF-022 — Identidade canónica supply_native (Foundation).
 */

const SUPPLY_RUNTIME_IDENTITY = Object.freeze({
  runtime_id: 'supply_native',
  runtime_name: 'supply_native',
  version: '0.1.0',
  status: 'FOUNDATION',
  domain: 'Supply',
  domain_key: 'supply',
  event_prefix: 'supply.',
  baseline_target: 'BASELINE-SUPPLY-v2.0',
  foundation_inc: 'GF-022',
  parent_axis: 'logistics',
  cockpit_mode: 'off',
  program: 'GF-021→027'
});

module.exports = { SUPPLY_RUNTIME_IDENTITY };
