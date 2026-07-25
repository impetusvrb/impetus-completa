'use strict';

const { validateCrossDomain } = require('../../integration/inc048/inc048IntegrationRuntime');
const { getInc048Registry } = require('../../integration/inc048/inc048Registry');
const { validateWorkspaceRegistration } = require('../wms005/wms005WorkspaceValidator');
const { validateCommandCenterCoexistence } = require('../wms005/wms005CcValidator');
const { logWms006Event } = require('./wms006Observability');

async function runCrossDomainCertification(ctx = {}) {
  const t0 = Date.now();
  const crossDomain = await validateCrossDomain({ force_inc048: true, run_pilot_integration: true, ...ctx });
  const registry = getInc048Registry();
  const workspace = validateWorkspaceRegistration();
  const cc = validateCommandCenterCoexistence();

  const components = [
    { id: 'supply', ok: registry.supply_runtime.maturity === 'homologation' },
    { id: 'logistics', ok: registry.logistics_runtime.workspace_phase === 'WMS-004' },
    { id: 'pilot_layer', ok: registry.pilot_layer.contract_version === '0.3.0' },
    { id: 'command_center', ok: cc.valid },
    { id: 'wms_workspace', ok: workspace.valid },
    { id: 'runtime_inventory', ok: registry.supply_runtime.runtime_id === 'supply_native' },
    { id: 'inc048_matrix', ok: crossDomain.valid }
  ];

  const issues = [];
  if (!crossDomain.valid) issues.push('cross_domain_failed');
  for (const c of components.filter((x) => !x.ok)) issues.push(`component:${c.id}`);

  const valid = issues.length === 0;
  logWms006Event({
    event: 'CROSS_DOMAIN_CERTIFICATION',
    valid,
    duration_ms: Date.now() - t0
  });

  return Object.freeze({
    valid,
    issues,
    cross_domain: crossDomain,
    registry,
    components,
    duration_ms: Date.now() - t0
  });
}

module.exports = {
  runCrossDomainCertification
};
