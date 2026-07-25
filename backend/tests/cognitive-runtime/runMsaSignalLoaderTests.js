'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const db = require('../../src/db');
const { loadMsaTenantSignals } = require('../../src/cognitiveRuntime/domains/msa/bridge/msaTenantSignalLoader');
const { runMsaSignalBinding } = require('../../src/cognitiveRuntime/domains/msa/bridge/msaSignalBindingRuntime');
const { invokeMsaBlockBridge } = require('../../src/cognitiveRuntime/domains/msa/bridge/msaBlockBridge');
const { buildBindingValidationReport } = require('../../src/cognitiveRuntime/observability/bindingValidationReport');
const { applyCognitiveFoundationToDashboard } = require('../../src/cognitiveRuntime/facade/cognitiveRuntimeFacade');
const { MSA_PILOT_BLOCK_IDS } = require('../../src/cognitiveRuntime/registry/msaCognitiveBlockPack');
const { MSA_STUDY_STATUS } = require('../../src/domains/msa/semantics/msaCoreSemantics');
const studyService = require('../../src/domains/msa/services/msaStudyService');
const masterDataService = require('../../src/domains/msa/services/msaMasterDataService');
const { MSA_STUDY_KIND } = require('../../src/domains/msa/workflow/msaWorkflowEngine');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed += 1;
    console.log(`  ✓ ${name}`);
  } catch (e) {
    failed += 1;
    console.error(`  ✗ ${name}: ${e.message}`);
  }
}

async function testAsync(name, fn) {
  try {
    await fn();
    passed += 1;
    console.log(`  ✓ ${name}`);
  } catch (e) {
    failed += 1;
    console.error(`  ✗ ${name}: ${e.message}`);
  }
}

function auditNoBusinessRuleDuplication() {
  const bridgeDir = path.join(__dirname, '../../src/cognitiveRuntime/domains/msa/bridge');
  const files = ['msaTenantSignalLoader.js', 'msaBlockBridge.js', 'msaSignalBindingRuntime.js'];
  const forbiddenPatterns = [
    /resolveTransition/,
    /applyWorkflowAction/,
    /MSA_WORKFLOW_TRANSITIONS/,
    /MSA_WORKFLOW_ACTION\s*=/,
    /MSA_WORKFLOW_STAGE\s*=/,
    /function\s+isValidStudyStatus/,
    /function\s+isValidWorkflowStage/
  ];
  for (const file of files) {
    const content = fs.readFileSync(path.join(bridgeDir, file), 'utf8');
    for (const pattern of forbiddenPatterns) {
      assert.ok(!pattern.test(content), `${file} duplicates business logic: ${pattern}`);
    }
  }
  const loaderContent = fs.readFileSync(path.join(bridgeDir, 'msaTenantSignalLoader.js'), 'utf8');
  assert.ok(
    loaderContent.includes('msaCoreSemantics'),
    'loader must import semantics from msaCoreSemantics.js'
  );
}

async function pickCompanyId() {
  const r = await db.query('SELECT id FROM companies ORDER BY created_at LIMIT 1');
  if (!r.rows[0]) throw new Error('no company for tests');
  return r.rows[0].id;
}

(async () => {
  console.log('GF-010 — MSA Signal Loader Tests\n');
  process.env.IMPETUS_MSA_SIGNAL_DIAGNOSTICS = 'off';

  test('semantics audit: no workflow duplication in loader/bridge', () => {
    auditNoBusinessRuleDuplication();
  });

  test('12 pilot blocks defined', () => {
    assert.strictEqual(MSA_PILOT_BLOCK_IDS.length, 12);
  });

  await testAsync('loader returns real structure without mock', async () => {
    const sig = await loadMsaTenantSignals(
      { company_id: '00000000-0000-4000-8000-000000000001' },
      {}
    );
    assert.strictEqual(sig.foundation_only, false);
    assert.strictEqual(sig.mock_signals, false);
    assert.ok(sig.datasets);
    assert.ok('msa_measurement_studies' in sig.datasets);
    assert.ok(Array.isArray(sig.data_sources));
    assert.ok(sig.studies);
    assert.ok(sig.studies.status_counts);
    assert.strictEqual(sig.studies.status_counts[MSA_STUDY_STATUS.DRAFT], 0);
  });

  await testAsync('missing company_id returns NO_DATASET', async () => {
    const sig = await loadMsaTenantSignals({}, {});
    assert.strictEqual(sig.signal_readiness, 'NO_DATASET');
    assert.strictEqual(sig.ok, false);
  });

  await testAsync('block bridge exposes Z.20 fields', async () => {
    const sig = await loadMsaTenantSignals(
      { company_id: '00000000-0000-4000-8000-000000000099' },
      {}
    );
    const b = invokeMsaBlockBridge('msa.measurement_system_registry', sig, {});
    assert.ok('engine_ok' in b);
    assert.ok('binding_ok' in b);
    assert.ok('dataset_used' in b);
    assert.ok('signal_count' in b);
    assert.ok('reason' in b);
  });

  await testAsync('binding uses buildBindingValidationReport (Quality/Logistics/PPAP parity)', async () => {
    const binding = await runMsaSignalBinding(
      { company_id: '00000000-0000-4000-8000-000000000001' },
      {}
    );
    assert.ok(binding.binding_validation);
    const manual = buildBindingValidationReport(binding.enriched_blocks, binding.signal_bundle);
    assert.strictEqual(binding.binding_ratio, manual.binding_ratio);
    assert.strictEqual(binding.pilot_blocks.length, 12);
    assert.ok(Array.isArray(binding.bound_blocks));
    assert.ok(Array.isArray(binding.missing_blocks));
    assert.strictEqual(binding.inactive, true);
    for (const d of binding.block_details) {
      assert.ok('engine_ok' in d && 'binding_ok' in d && 'reason' in d);
    }
  });

  await testAsync('empty tenant: honest NO_DATASET on operational blocks', async () => {
    const binding = await runMsaSignalBinding(
      { company_id: '00000000-0000-4000-8000-000000000099' },
      {}
    );
    assert.ok(binding.binding_ratio >= 0 && binding.binding_ratio <= 1);
    const registry = binding.block_details.find((b) => b.block_id === 'msa.measurement_system_registry');
    assert.ok(['NO_DATASET', 'NOT_BOUND'].includes(registry.reason));
    assert.strictEqual(registry.binding_ok, false);
  });

  await testAsync('tenant with study data binds operational blocks', async () => {
    const companyId = await pickCompanyId();
    const suffix = `sl-${Date.now().toString(36)}`;
    const gauge = await masterDataService.createGauge(companyId, {
      gauge_code: `SG-${suffix}`,
      gauge_name: 'Signal Loader Gauge',
      gauge_type: 'variable'
    });
    await studyService.createStudy(companyId, {
      study_title: 'Signal Loader Study',
      characteristic_name: 'Thickness',
      study_kind: MSA_STUDY_KIND.VARIABLE_GRR,
      gauge_id: gauge.id
    });

    const binding = await runMsaSignalBinding({ company_id: companyId }, {});
    assert.ok(binding.binding_ratio > 0, 'expected binding when study exists');
    assert.ok(binding.bound_blocks.includes('msa.measurement_system_registry'));
    assert.ok(binding.bound_blocks.includes('msa.gauge_inventory'));
    assert.ok(binding.bound_blocks.includes('msa.variable_grr'));
    assert.strictEqual(binding.inactive, true);
  });

  await testAsync('payload includes signal_loader without promotion', async () => {
    const user = { company_id: '00000000-0000-4000-8000-000000000001', role: 'gerente', hierarchy_level: 2 };
    const payload = { profile_code: 'manager_quality', functional_area: 'quality' };
    const result = await applyCognitiveFoundationToDashboard(user, payload, { force_cognitive_observability: true });
    assert.ok(result.payload.msa_signal_loader);
    assert.strictEqual(result.payload.msa_cognitive_runtime.consolidation_applied, false);
    assert.strictEqual(result.payload.msa_cognitive_runtime.promotion_applied, false);
    assert.strictEqual(result.payload.msa_cognitive_runtime.inactive, true);
    assert.ok('binding_ratio' in result.payload.msa_signal_loader);
    assert.strictEqual(result.payload.msa_signal_loader.pilot_blocks.length, 12);
    assert.strictEqual(result.payload.msa_signal_loader.inactive, true);
    assert.ok(result.cognitive_runtime_report.msa_signal_loader);
    assert.strictEqual(result.cognitive_runtime_report.msa_runtime_foundation?.signal_loader_real, true);
    assert.strictEqual(result.cognitive_runtime_report.msa_runtime_foundation?.signal_loader_stub, false);
  });

  await testAsync('quality + ppap payloads preserved with msa signal loader', async () => {
    const user = { company_id: '00000000-0000-4000-8000-000000000001', role: 'gerente', hierarchy_level: 2 };
    const payload = { profile_code: 'manager_logistics', functional_area: 'logistics' };
    const result = await applyCognitiveFoundationToDashboard(user, payload, { force_cognitive_observability: true });
    assert.ok(result.payload.logistics_cognitive_runtime);
    assert.ok(result.payload.ppap_cognitive_runtime);
    assert.ok(result.payload.msa_cognitive_runtime);
    assert.strictEqual(result.payload.msa_cognitive_runtime.inactive, true);
    assert.strictEqual(result.payload.ppap_cognitive_runtime.inactive, true);
    assert.strictEqual(result.payload.logistics_cognitive_runtime.inactive, true);
  });

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
})();
