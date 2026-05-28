'use strict';

/**
 * PROMPT 31 — Certification readiness scenarios.
 */

const ENV_KEYS = ['IMPETUS_CERTIFICATION_READINESS_MODE', 'IMPETUS_CERTIFICATION_READINESS_ENABLED'];

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
  console.log('\n══ PROMPT 31 — CERTIFICATION READINESS ══\n');
  saveEnv();
  try {
    process.env.IMPETUS_CERTIFICATION_READINESS_MODE = 'on';
    process.env.IMPETUS_CERTIFICATION_READINESS_ENABLED = 'true';

    const flags = require('../certificationReadiness/config/certificationReadinessFlags');
    const catalog = require('../certificationReadiness/catalog/frameworkCatalog');
    const facade = require('../certificationReadiness/facade/certificationReadinessFacade');

    assert('CR31.1 active', flags.isCertificationReadinessActive());
    assert('CR31.2 four frameworks', catalog.listFrameworks().length === 4);
    assert('CR31.3 controls catalog', catalog.listControls().length >= 16);

    require('../db');
    const report = await facade.runFullReadinessAssessment(null, null, {
      actorUserId: '21dd3cee-2efa-4936-908f-9ff1ba04e2a3'
    });
    assert('CR31.4 assessment ok', report.ok === true);
    assert('CR31.5 gap analysis', report.gap_analysis?.controls_assessed >= 16);
    assert('CR31.6 remediation matrix', Array.isArray(report.remediation_matrix?.rows));
    assert('CR31.7 roadmap phases', report.certification_roadmap?.phases?.length === 4);
    assert('CR31.8 evidence inventory', report.evidence_inventory?.evidence_count > 0);
    assert('CR31.9 framework scores', !!report.framework_scores?.ISO_27001);
    assert('CR31.10 not formal cert flag', report.explainability?.not_formal_certification === true);

    const isoOnly = await facade.runFullReadinessAssessment(null, 'ISO_42001', {});
    assert('CR31.11 filtered framework', isoOnly.gap_analysis.controls_assessed >= 4);

    process.env.IMPETUS_CERTIFICATION_READINESS_MODE = 'off';
    process.env.IMPETUS_CERTIFICATION_READINESS_ENABLED = 'false';
    delete require.cache[require.resolve('../certificationReadiness/config/certificationReadinessFlags')];
    const flagsOff = require('../certificationReadiness/config/certificationReadinessFlags');
    assert('CR31.12 off rollback', flagsOff.isCertificationReadinessActive() === false);
  } catch (e) {
    failed++;
    console.error('FATAL', e?.message);
  } finally {
    restoreEnv();
  }
  console.log(`\n══ ${passed} passed, ${failed} failed ══\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
