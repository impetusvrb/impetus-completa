'use strict';

/**
 * PROMPT 29 — Rollout Center scenarios.
 */

const ENV_KEYS = ['IMPETUS_ROLLOUT_CENTER_MODE', 'IMPETUS_ROLLOUT_CENTER_ENABLED'];

let passed = 0;
let failed = 0;
const saved = {};

function saveEnv() {
  for (const k of ENV_KEYS) saved[k] = process.env[k];
}
function restoreEnv() {
  for (const k of ENV_KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
}
function assert(label, cond) {
  if (cond) {
    passed++;
    console.log(`  ✅ ${label}`);
  } else {
    failed++;
    console.log(`  ❌ ${label}`);
  }
}
function clearCache() {
  for (const k of Object.keys(require.cache)) {
    if (k.includes('rolloutCenter')) delete require.cache[k];
  }
}

(async () => {
  console.log('\n══ PROMPT 29 — ROLLOUT CENTER ══\n');
  saveEnv();
  try {
    process.env.IMPETUS_ROLLOUT_CENTER_MODE = 'on';
    process.env.IMPETUS_ROLLOUT_CENTER_ENABLED = 'true';
    clearCache();

    const flags = require('../rolloutCenter/config/rolloutCenterFlags');
    const catalog = require('../rolloutCenter/catalog/capabilityCatalog');
    const gates = require('../rolloutCenter/governance/promotionGateRegistry');
    const facade = require('../rolloutCenter/facade/rolloutCenterFacade');

    assert('RC29.1 active', flags.isRolloutCenterActive());
    assert('RC29.2 catalog >= 8', catalog.listCapabilities().length >= 8);
    assert('RC29.3 health', facade.getHealth().active === true);

    const dash = facade.buildDashboard();
    assert('RC29.4 dashboard ok', dash.ok === true);
    assert('RC29.5 capabilities listed', dash.capabilities.length >= 8);
    assert('RC29.6 gates eval', dash.promotion_gates.length >= 8);

    const gate = gates.evaluateGate('runtime_unification_sz5');
    assert('RC29.7 known capability gate', gate.ok === true);
    assert('RC29.8 has current_mode', !!gate.current_mode);

    require('../db');
    const auditSvc = require('../rolloutCenter/observability/rolloutCenterAuditService');
    const row = await facade.evaluatePromotion('action_runtime_hitl', null, {
      companyId: '21dd3cee-2efa-4936-908f-9ff1ba04e2a3',
      actorUserId: '21dd3cee-2efa-4936-908f-9ff1ba04e2a3'
    });
    assert('RC29.9 promotion eval', row.ok === true);
    const listed = await auditSvc.listRecent('21dd3cee-2efa-4936-908f-9ff1ba04e2a3', 5);
    assert('RC29.10 audit list', Array.isArray(listed));

    process.env.IMPETUS_ROLLOUT_CENTER_MODE = 'off';
    process.env.IMPETUS_ROLLOUT_CENTER_ENABLED = 'false';
    clearCache();
    const flagsOff = require('../rolloutCenter/config/rolloutCenterFlags');
    assert('RC29.11 off rollback flag', flagsOff.isRolloutCenterActive() === false);
  } catch (e) {
    failed++;
    console.error('FATAL', e?.message);
  } finally {
    restoreEnv();
  }
  console.log(`\n══ ${passed} passed, ${failed} failed ══\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
