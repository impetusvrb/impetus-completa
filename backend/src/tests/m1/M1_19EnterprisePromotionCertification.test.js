'use strict';

/**
 * M1.19 — Enterprise Promotion Certification (static + unit)
 * node src/tests/m1/M1_19EnterprisePromotionCertification.test.js
 */

const path = require('path');
const fs = require('fs');

let _passed = 0;
let _failed = 0;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function test(name, fn) {
  try {
    await fn();
    _passed++;
    console.log(`  ✓  ${name}`);
  } catch (err) {
    _failed++;
    console.error(`  ✗  ${name}`);
    console.error(`     ${err.message}`);
  }
}

const BACKEND = path.resolve(__dirname, '../../..');

async function main() {
  console.log('\n[M1.19] Enterprise Promotion Certification\n');

  process.env.IMPETUS_ENTERPRISE_SECURITY_ROLLOUT = 'true';
  process.env.IMPETUS_TELEMETRY_ENTERPRISE_ROUTING = 'true';
  process.env.IMPETUS_MES_ERP_ASYNC_INGEST = 'true';
  process.env.IMPETUS_TENANT_FUZZ_GATE = 'true';
  process.env.IMPETUS_INDUSTRIAL_DLQ_ENABLED = 'true';

  await test('GLOBAL-01: enterprise security rollout flags resolve pilot_only=false', () => {
    delete require.cache[require.resolve('../../services/enterprise/enterpriseSecurityRolloutService')];
    delete require.cache[require.resolve('../../tenant-isolation/config/tenantRlsFlags')];
    const rls = require('../../tenant-isolation/config/tenantRlsFlags');
    assert(rls.rlsPilotOnly() === false, 'RLS pilot_only should be false under enterprise rollout');
  });

  await test('GLOBAL-02: truth channel registry reports 100% coverage', () => {
    const reg = require('../../services/truthChannelRegistry');
    const r = reg.getCoverageReport();
    assert(r.truth_coverage === 100, 'truth_coverage must be 100');
    assert(r.unprotected_channels === 0, 'unprotected_channels must be 0');
  });

  await test('TEL-01: enterprise telemetry routing resolves Fresh Fit tenant', () => {
    const routing = require('../../domains/environment/telemetry/environmentTelemetryEnterpriseRouting');
    const tenants = routing.getEnterpriseOtTenants('');
    assert(tenants.includes(routing.FRESH_FIT), 'Fresh Fit must be in enterprise OT tenants');
    assert(routing.isEnterpriseTelemetryRoutingActive(), 'enterprise routing must be active');
  });

  await test('MES-01: async ingest queue service enabled', () => {
    const q = require('../../services/mesErpIngestQueueService');
    assert(q.isMesAsyncIngestionEnabled() === true, 'MES async ingest must be enabled');
  });

  await test('Truth pipeline: protected channels include voice and executive', () => {
    const pipeline = require('../../services/truthProtectedCognitivePipeline');
    assert(pipeline.isChannelProtected('voice_assistant'), 'voice_assistant protected');
    assert(pipeline.isChannelProtected('executive_ceo_chat'), 'executive_ceo_chat protected');
  });

  await test('M1.19 doc exists', () => {
    const doc = path.join(BACKEND, 'docs/M1_19_ENTERPRISE_PROMOTION.md');
    assert(fs.existsSync(doc), 'M1_19_ENTERPRISE_PROMOTION.md must exist');
  });

  await test('Promotion service exports 7 candidates', () => {
    const svc = require('../../services/audit/m1EnterprisePromotionService');
    assert(svc.CANDIDATES.length === 7, 'Must have 7 promotion candidates');
    assert(svc.EXCLUDED.length === 8, 'Must exclude 8 modules');
  });

  console.log(`\n[M1.19] ${_passed} passed, ${_failed} failed\n`);
  process.exit(_failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
