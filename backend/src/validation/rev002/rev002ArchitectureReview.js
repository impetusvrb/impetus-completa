'use strict';

const fs = require('fs');
const path = require('path');
const { REPO } = require('./rev002ManifestLoader');
const { validateCrossDomain } = require('../../integration/inc048/inc048IntegrationRuntime');
const { validateWorkspaceRegistration } = require('../wms005/wms005WorkspaceValidator');
const { validateCommandCenterCoexistence } = require('../wms005/wms005CcValidator');
const { validateRbacProfiles } = require('../wms005/wms005RbacValidator');

function _auditNoDirectSupplyWmsCoupling() {
  const supplyRoot = path.join(REPO, 'backend/src/domains/supply');
  const wmsRoot = path.join(REPO, 'backend/src/domains/logistics-operational');
  const forbiddenSupply = ['logistics-operational/compatibility', 'operationalCompatibilityLayer'];
  const forbiddenWms = ['domains/supply/services', 'supplyPromotionRuntime'];

  const walk = (dir, forbidden, label, skipDirs = []) => {
    const issues = [];
    if (!fs.existsSync(dir)) return issues;
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      if (skipDirs.includes(ent.name)) continue;
      const p = path.join(dir, ent.name);
      if (ent.isDirectory() && ent.name !== 'node_modules') {
        issues.push(...walk(p, forbidden, label, skipDirs));
      } else if (ent.name.endsWith('.js')) {
        const c = fs.readFileSync(p, 'utf8');
        for (const token of forbidden) {
          if (c.includes(token)) issues.push(`${label}:${path.relative(REPO, p)}:${token}`);
        }
      }
    }
    return issues;
  };

  const wmsIssues = walk(wmsRoot, forbiddenWms, 'wms', []);
  const supplyIssues = walk(supplyRoot, forbiddenSupply, 'supply', ['pilot']);
  return [...wmsIssues, ...supplyIssues];
}

async function validateArchitectureConformanceReview() {
  const crossDomain = await validateCrossDomain({ force_inc048: true });
  const workspace = validateWorkspaceRegistration();
  const cc = validateCommandCenterCoexistence();
  const rbac = validateRbacProfiles();
  const couplingIssues = _auditNoDirectSupplyWmsCoupling();

  const checks = [
    { id: 'arc001_cross_domain', ok: crossDomain.valid, norm: 'ARC-001/INC-048' },
    { id: 'arc002_public_apis_only', ok: workspace.valid, norm: 'ARC-002' },
    { id: 'inc048_pilot_layer', ok: crossDomain.checks.find((c) => c.id === 'pilot_contracts')?.ok === true, norm: 'INC-048' },
    { id: 'inc048_compatibility_matrix', ok: crossDomain.matrix?.all_compatible === true, norm: 'INC-048' },
    { id: 'supply_wms_decoupling', ok: couplingIssues.length === 0, norm: 'REV-001/INC-048' },
    { id: 'canonical_contracts_bridge', ok: crossDomain.checks.find((c) => c.id === 'pilot_wms_compat')?.ok === true, norm: 'REV-001' },
    { id: 'rbac_profiles', ok: rbac.valid, norm: 'REV-001' },
    { id: 'cc_coexistence', ok: cc.valid, norm: 'ARC-001' }
  ];

  const issues = [];
  for (const c of checks.filter((x) => !x.ok)) issues.push(c.id);
  if (couplingIssues.length) issues.push(...couplingIssues.slice(0, 5));

  const valid = issues.length === 0;
  return Object.freeze({
    valid,
    issues,
    checks,
    cross_domain: crossDomain,
    coupling_violations: couplingIssues,
    workspace,
    cc,
    rbac
  });
}

module.exports = {
  validateArchitectureConformanceReview
};
