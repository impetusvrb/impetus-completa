'use strict';

/**
 * PROMPT 27 — Legacy deprecation governance scenarios.
 */

const ENV_KEYS = [
  'IMPETUS_LEGACY_DEPRECATION_MODE',
  'IMPETUS_LEGACY_DEPRECATION_ENABLED',
  'IMPETUS_LEGACY_DEPRECATION_PILOT_TENANTS'
];

const PILOT = '21dd3cee-2efa-4936-908f-9ff1ba04e2a3';

let passed = 0;
let failed = 0;
const savedEnv = {};

function saveEnv() {
  for (const k of ENV_KEYS) savedEnv[k] = process.env[k];
}
function restoreEnv() {
  for (const k of ENV_KEYS) {
    if (savedEnv[k] === undefined) delete process.env[k];
    else process.env[k] = savedEnv[k];
  }
}
function assert(label, condition) {
  if (condition) {
    passed++;
    console.log(`  ✅ ${label}`);
  } else {
    failed++;
    console.log(`  ❌ ${label}`);
  }
}
function clearCache() {
  for (const key of Object.keys(require.cache)) {
    if (key.includes('legacyDeprecation')) delete require.cache[key];
  }
}

(async () => {
  console.log('\n══ PROMPT 27 — LEGACY DEPRECATION GOVERNANCE ══\n');
  saveEnv();

  try {
    process.env.IMPETUS_LEGACY_DEPRECATION_MODE = 'shadow';
    process.env.IMPETUS_LEGACY_DEPRECATION_ENABLED = 'true';
    process.env.IMPETUS_LEGACY_DEPRECATION_PILOT_TENANTS = PILOT;
    clearCache();

    const flags = require('../legacyDeprecation/config/deprecationGovernanceFlags');
    const registry = require('../legacyDeprecation/governance/legacyDeprecationRegistry');
    const router = require('../legacyDeprecation/governance/legacyCompatibilityRouter');

    assert('D27.1 governance active', flags.isDeprecationGovernanceActive() === true);
    assert('D27.2 shadow mode', flags.isShadowMode() === true);
    assert('D27.3 no enforcement in shadow', flags.allowsEnforcement() === false);
    assert('D27.4 pilot tenant match', flags.isPilotTenant(PILOT) === true);
    assert('D27.5 non-pilot blocked', flags.isPilotTenant('00000000-0000-0000-0000-000000000099') === false);

    const catalog = registry.listEntries();
    assert('D27.6 catalog >= 4 entries', catalog.length >= 4);
    assert('D27.7 no removal allowed', catalog.every((e) => e.removal_allowed === false));

    const chat = registry.getEntry('chat_ai_service_legacy');
    assert('D27.8 chat legacy entry', chat && chat.debt_ref === 'D4');
    assert('D27.9 motor_a frozen policy', registry.getEntry('motor_a_runtime').removal_allowed === false);

    const report = router.recordLegacyInvocation('chat_ai_service_legacy', {
      companyId: PILOT,
      caller_hint: 'test'
    });
    assert('D27.10 invocation recorded', report.recorded === true);
    assert('D27.11 warn in shadow', report.warn === true);
    assert('D27.12 no block in shadow', report.block !== true);

    const nonPilot = router.recordLegacyInvocation('chat_ai_service_legacy', {
      companyId: '00000000-0000-0000-0000-000000000099'
    });
    assert('D27.13 non-pilot skipped', nonPilot.recorded === false);

    const health = router.getHealth();
    assert('D27.14 health active', health.active === true);
    assert('D27.15 health catalog size', health.catalog_size >= 4);

    const resolved = router.resolveWithFallback('chat_ai_service_legacy', {
      legacyLoader: () => ({ id: 'legacy-mod' }),
      replacementLoader: () => ({ id: 'replacement-mod' }),
      ctx: { companyId: PILOT }
    });
    assert('D27.16 fallback returns legacy in shadow', resolved.source === 'legacy_fallback');
    assert('D27.17 legacy module present', resolved.module && resolved.module.id === 'legacy-mod');

    console.log('\n── Modo on (redirect semantics, still fallback-safe) ──');
    require('../db');
    process.env.IMPETUS_LEGACY_DEPRECATION_MODE = 'on';
    process.env.IMPETUS_LEGACY_DEPRECATION_ENABLED = 'true';
    clearCache();
    const routerOn = require('../legacyDeprecation/governance/legacyCompatibilityRouter');
    const flagsOn = require('../legacyDeprecation/config/deprecationGovernanceFlags');
    assert('D27.18 on allows enforcement flag', flagsOn.allowsEnforcement() === true);

    const redirect = routerOn.resolveWithFallback('chat_ai_service_legacy', {
      legacyLoader: () => ({ id: 'legacy-mod' }),
      replacementLoader: () => ({ id: 'replacement-mod' }),
      ctx: { companyId: PILOT }
    });
    assert('D27.19 on redirects when replacement loads', redirect.source === 'replacement');

    const blockReport = routerOn.recordLegacyInvocation('chat_ai_service_legacy', {
      companyId: PILOT,
      caller_hint: 'on-mode'
    });
    assert('D27.20 on mode redirect flag', blockReport.redirect === true);
    assert('D27.21 block never hard-removes', blockReport.entry.removal_allowed === false);

    console.log('\n── Modo audit (persistência opcional) ──');
    process.env.IMPETUS_LEGACY_DEPRECATION_MODE = 'audit';
    process.env.IMPETUS_LEGACY_DEPRECATION_ENABLED = 'true';
    clearCache();
    const flagsAudit = require('../legacyDeprecation/config/deprecationGovernanceFlags');
    assert('D27.22 audit persists flag', flagsAudit.shouldPersistAudit() === true);
    const audit = require('../legacyDeprecation/observability/deprecationAuditService');
    const row = await audit.recordAudit({
      companyId: PILOT,
      legacyId: 'chat_ai_service_legacy',
      modulePath: 'services/chatAIService.js',
      replacementId: 'chat_ai_service_consolidated',
      callerHint: 'wave27-test',
      payload: { test: true }
    });
    assert('D27.23 audit insert or table_missing graceful', row.persisted === true || row.table_missing === true);

    if (row.persisted) {
      const items = await audit.listRecent(PILOT, 5);
      assert('D27.24 audit list returns array', Array.isArray(items));
    }

    console.log('\n── Modo off (rollback) ──');
    process.env.IMPETUS_LEGACY_DEPRECATION_MODE = 'off';
    process.env.IMPETUS_LEGACY_DEPRECATION_ENABLED = 'false';
    clearCache();
    const flagsOff = require('../legacyDeprecation/config/deprecationGovernanceFlags');
    const routerOff = require('../legacyDeprecation/governance/legacyCompatibilityRouter');
    assert('D27.25 off inactive', flagsOff.isDeprecationGovernanceActive() === false);
    const offReport = routerOff.recordLegacyInvocation('chat_ai_service_legacy', { companyId: PILOT });
    assert('D27.26 off skips recording', offReport.recorded === false);
  } catch (err) {
    failed++;
    console.error('  ❌ FATAL:', err?.message || err);
    console.error(err?.stack);
  } finally {
    restoreEnv();
  }

  console.log(`\n══ Resultado: ${passed} passed, ${failed} failed ══\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
