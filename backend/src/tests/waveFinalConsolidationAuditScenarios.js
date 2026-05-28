'use strict';

/**
 * PROMPT 32 — Final consolidation audit scenarios.
 */

const ENV_KEYS = [
  'IMPETUS_FINAL_CONSOLIDATION_AUDIT_MODE',
  'IMPETUS_FINAL_CONSOLIDATION_AUDIT_ENABLED'
];

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

(async () => {
  console.log('\n══ PROMPT 32 — FINAL CONSOLIDATION AUDIT ══\n');
  saveEnv();
  try {
    process.env.IMPETUS_FINAL_CONSOLIDATION_AUDIT_MODE = 'on';
    process.env.IMPETUS_FINAL_CONSOLIDATION_AUDIT_ENABLED = 'true';

    const flags = require('../finalConsolidationAudit/config/finalConsolidationAuditFlags');
    const catalog = require('../finalConsolidationAudit/catalog/promptSequenceCatalog');
    const facade = require('../finalConsolidationAudit/facade/finalConsolidationAuditFacade');

    assert('FC32.1 active', flags.isFinalConsolidationAuditActive());
    assert('FC32.2 thirty two prompts', catalog.listPrompts().length === 32);
    assert('FC32.3 runtime zones', catalog.RUNTIME_ZONES.length >= 10);

    require('../db');
    const report = await facade.runFullConsolidationAudit(null, { actorUserId: null });
    assert('FC32.4 audit ok', report.ok === true);
    assert('FC32.5 seven scores', typeof report.scores?.maturity_score_final === 'number');
    assert('FC32.6 architecture score', typeof report.scores?.architecture_score === 'number');
    assert('FC32.7 governance score', typeof report.scores?.governance_score === 'number');
    assert('FC32.8 ai safety score', typeof report.scores?.ai_safety_score === 'number');
    assert('FC32.9 industrial score', typeof report.scores?.industrial_readiness_score === 'number');
    assert('FC32.10 international score', typeof report.scores?.international_readiness_score === 'number');
    assert('FC32.11 certification score', typeof report.scores?.certification_readiness_score === 'number');
    assert('FC32.12 classification', !!report.classification?.classification);
    assert('FC32.13 executive report', !!report.executive_report?.markdown);
    assert('FC32.14 residual debt', report.residual_debt?.total_items > 0);
    assert('FC32.15 residual roadmap', report.residual_roadmap?.phases?.length > 0);
    assert('FC32.16 remaining risks', Array.isArray(report.remaining_risks));
    assert('FC32.17 prompt validation', report.prompt_validation?.total === 32);
    assert('FC32.18 no mutation invariant', report.explainability?.does_not_mutate_flags === true);
    assert('FC32.19 motor preserved', report.explainability?.does_not_remove_legacy_runtimes === true);
    assert('FC32.20 snapshot id', !!report.snapshot_id);

    process.env.IMPETUS_FINAL_CONSOLIDATION_AUDIT_MODE = 'off';
    process.env.IMPETUS_FINAL_CONSOLIDATION_AUDIT_ENABLED = 'false';
    delete require.cache[require.resolve('../finalConsolidationAudit/config/finalConsolidationAuditFlags')];
    const flagsOff = require('../finalConsolidationAudit/config/finalConsolidationAuditFlags');
    assert('FC32.21 off rollback', flagsOff.isFinalConsolidationAuditActive() === false);
  } catch (e) {
    failed++;
    console.error('FATAL', e?.message, e?.stack);
  } finally {
    restoreEnv();
  }
  console.log(`\n══ ${passed} passed, ${failed} failed ══\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
