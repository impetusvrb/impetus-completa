'use strict';

/**
 * PROMPT 26 — Cognitive Registry Consolidation scenarios.
 */

const ENV_KEYS = [
  'IMPETUS_COGNITIVE_REGISTRY_CONSOLIDATION_MODE',
  'IMPETUS_COGNITIVE_REGISTRY_SSOT_ENABLED'
];

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
    if (key.includes('cognitiveRegistry') || key.includes('cognitiveRuntime/registry')) {
      delete require.cache[key];
    }
  }
}

(async () => {
  console.log('\n══ PROMPT 26 — COGNITIVE REGISTRY CONSOLIDATION ══\n');
  saveEnv();

  try {
    require('../db');
    process.env.IMPETUS_COGNITIVE_REGISTRY_CONSOLIDATION_MODE = 'shadow';
    process.env.IMPETUS_COGNITIVE_REGISTRY_SSOT_ENABLED = 'true';
    clearCache();

    const flags = require('../cognitiveRegistry/consolidation/cognitiveRegistryConsolidationFlags');
    const unified = require('../cognitiveRegistry/consolidation/unifiedCognitiveRegistry');
    const catalog = require('../cognitiveRegistry/consolidation/registrySourceCatalog');

    assert('C26.1 consolidation active', flags.isConsolidationActive() === true);
    assert('C26.2 shadow mode', flags.isShadowMode() === true);
    assert('C26.3 SSOT sources listed', catalog.listSources().length >= 6);

    const snap = unified.buildSnapshot(true);
    assert('C26.4 snapshot blocks > 0', snap.counts.blocks > 0);
    assert('C26.5 snapshot domains > 0', snap.counts.domains > 0);
    assert('C26.6 delivery authority documented', !!snap.delivery_authority.primary);
    assert('C26.7 metadata role blocks', snap.registry_role.blocks === 'metadata_catalog');
    assert('C26.8 zero high divergence', (snap.divergence.high || 0) === 0);

    const resolved = unified.resolveBlock('quality.nc_center');
    assert('C26.9 resolve known block', resolved.ok === true);
    assert('C26.10 metadata_only flag', resolved.metadata_only === true);
    assert('C26.11 delivery via engine_v2', resolved.delivery_authority === 'engine_v2_cockpit');

    const dom = unified.resolveDomain('quality');
    assert('C26.12 resolve domain', dom.ok === true);
    assert('C26.13 domain has blocks', dom.block_count > 0);

    const health = unified.getHealth();
    assert('C26.14 health active', health.active === true);

    console.log('\n── Modo audit (persistência) ──');
    const db = require('../db');
    process.env.IMPETUS_COGNITIVE_REGISTRY_CONSOLIDATION_MODE = 'audit';
    clearCache();
    const flagsAudit = require('../cognitiveRegistry/consolidation/cognitiveRegistryConsolidationFlags');
    const auditSvc = require('../cognitiveRegistry/consolidation/cognitiveRegistryAuditService');
    assert('C26.16 audit mode', flagsAudit.isAuditMode() === true);
    assert('C26.17 should persist audit', flagsAudit.shouldPersistAuditTrail() === true);
    const before = (
      await db.query(`SELECT COUNT(*)::int c FROM cognitive_registry_consolidation_audit`)
    ).rows[0].c;
    const rec = await auditSvc.recordAudit({
      companyId: '21dd3cee-2efa-4936-908f-9ff1ba04e2a3',
      eventType: 'promotion_test',
      payload: { test: true }
    });
    assert('C26.18 audit persisted', rec.persisted === true);
    const after = (
      await db.query(`SELECT COUNT(*)::int c FROM cognitive_registry_consolidation_audit`)
    ).rows[0].c;
    assert('C26.19 audit row count +1', after === before + 1);

    process.env.IMPETUS_COGNITIVE_REGISTRY_CONSOLIDATION_MODE = 'shadow';
    clearCache();
    const shadowRec = await require('../cognitiveRegistry/consolidation/cognitiveRegistryAuditService').recordAudit({
      eventType: 'shadow_no_persist',
      payload: {}
    });
    assert('C26.20 shadow no persist', shadowRec.persisted === false);

    console.log('\n── Modo on (redirect autoritativo) ──');
    const COMPANY = '21dd3cee-2efa-4936-908f-9ff1ba04e2a3';
    process.env.IMPETUS_COGNITIVE_REGISTRY_CONSOLIDATION_MODE = 'on';
    clearCache();
    const flagsOn = require('../cognitiveRegistry/consolidation/cognitiveRegistryConsolidationFlags');
    const bridge = require('../cognitiveRegistry/consolidation/cognitiveRegistryBridge');
    assert('C26.21 on mode', flagsOn.isOnMode() === true);
    assert('C26.22 authoritative redirect', flagsOn.allowsAuthoritativeRedirect() === true);
    assert('C26.23 bridge pilot', bridge.shouldUseAuthoritativePath({ companyId: COMPANY }) === true);

    const weighted = bridge.listBlocksByDomain('quality', {
      companyId: COMPANY,
      profileTier: 'coordination'
    });
    assert('C26.24 weighted blocks quality', Array.isArray(weighted) && weighted.length > 0);
    assert(
      'C26.25 effective_score present',
      weighted[0].effective_score != null || weighted[0].domain_weight != null
    );

    const enriched = bridge.resolveBlockEnriched('quality.nc_center', { companyId: COMPANY });
    assert('C26.26 enriched resolve ssot', enriched.found === true && enriched.ssot === true);

    const resolver = require('../cognitiveRuntime/composition/cognitiveBlockResolver');
    const viaResolver = resolver.resolveBlock('quality.nc_center', { companyId: COMPANY });
    assert('C26.27 resolver uses ssot path', viaResolver.found === true);

    try {
      const db = require('../db');
      const t = await db.query(
        `SELECT COUNT(*)::int c FROM information_schema.tables WHERE table_name = 'cognitive_registry_consolidation_audit'`
      );
      assert('C26.15 audit table', (t.rows[0]?.c || 0) >= 1);
    } catch (e) {
      console.log(`  ⚠️  audit table: ${e?.message}`);
    }
  } finally {
    restoreEnv();
    clearCache();
  }

  console.log(`\n══ Resultado: ${passed} passed, ${failed} failed ══\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
