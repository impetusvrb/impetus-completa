'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { loadPpapTenantSignals } = require('../../src/cognitiveRuntime/domains/ppap/bridge/ppapTenantSignalLoader');
const { runPpapSignalBinding } = require('../../src/cognitiveRuntime/domains/ppap/bridge/ppapSignalBindingRuntime');
const { invokePpapBlockBridge } = require('../../src/cognitiveRuntime/domains/ppap/bridge/ppapBlockBridge');
const { buildBindingValidationReport } = require('../../src/cognitiveRuntime/observability/bindingValidationReport');
const { applyCognitiveFoundationToDashboard } = require('../../src/cognitiveRuntime/facade/cognitiveRuntimeFacade');
const { PPAP_PILOT_BLOCK_IDS } = require('../../src/cognitiveRuntime/registry/ppapCognitiveBlockPack');
const { PPAP_SUBMISSION_STATUS } = require('../../src/domains/ppap/semantics/ppapCoreSemantics');

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
  const bridgeDir = path.join(__dirname, '../../src/cognitiveRuntime/domains/ppap/bridge');
  const files = ['ppapTenantSignalLoader.js', 'ppapBlockBridge.js', 'ppapSignalBindingRuntime.js'];
  const forbiddenPatterns = [
    /resolveTransition/,
    /applyWorkflowAction/,
    /PPAP_WORKFLOW_TRANSITIONS/,
    /PPAP_WORKFLOW_ACTION/,
    /PPAP_WORKFLOW_STAGE\s*=/,
    /function\s+isValidSubmissionStatus/,
    /function\s+isValidWorkflowStage/
  ];
  for (const file of files) {
    const content = fs.readFileSync(path.join(bridgeDir, file), 'utf8');
    for (const pattern of forbiddenPatterns) {
      assert.ok(!pattern.test(content), `${file} duplicates business logic: ${pattern}`);
    }
  }
  const loaderContent = fs.readFileSync(path.join(bridgeDir, 'ppapTenantSignalLoader.js'), 'utf8');
  assert.ok(
    loaderContent.includes('ppapCoreSemantics'),
    'loader must import semantics from ppapCoreSemantics.js'
  );
}

(async () => {
  console.log('GF-003 — PPAP Signal Loader Tests\n');
  process.env.IMPETUS_PPAP_SIGNAL_DIAGNOSTICS = 'off';

  test('semantics audit: no workflow duplication in loader/bridge', () => {
    auditNoBusinessRuleDuplication();
  });

  test('12 pilot blocks defined', () => {
    assert.strictEqual(PPAP_PILOT_BLOCK_IDS.length, 12);
  });

  await testAsync('loader returns real structure without mock', async () => {
    const sig = await loadPpapTenantSignals(
      { company_id: '00000000-0000-4000-8000-000000000001' },
      {}
    );
    assert.strictEqual(sig.foundation_only, false);
    assert.strictEqual(sig.mock_signals, false);
    assert.ok(sig.datasets);
    assert.ok('ppap_submissions' in sig.datasets);
    assert.ok(Array.isArray(sig.data_sources));
    assert.ok(sig.submissions);
    assert.ok(sig.submissions.status_counts);
    assert.strictEqual(sig.submissions.status_counts[PPAP_SUBMISSION_STATUS.DRAFT], 0);
  });

  await testAsync('missing company_id returns NO_DATASET', async () => {
    const sig = await loadPpapTenantSignals({}, {});
    assert.strictEqual(sig.signal_readiness, 'NO_DATASET');
    assert.strictEqual(sig.ok, false);
  });

  await testAsync('block bridge exposes Z.20 fields', async () => {
    const sig = await loadPpapTenantSignals(
      { company_id: '00000000-0000-4000-8000-000000000099' },
      {}
    );
    const b = invokePpapBlockBridge('ppap.submission_management', sig, {});
    assert.ok('engine_ok' in b);
    assert.ok('binding_ok' in b);
    assert.ok('dataset_used' in b);
    assert.ok('signal_count' in b);
    assert.ok('reason' in b);
  });

  await testAsync('binding uses buildBindingValidationReport (Quality/Logistics parity)', async () => {
    const binding = await runPpapSignalBinding(
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
    const binding = await runPpapSignalBinding(
      { company_id: '00000000-0000-4000-8000-000000000099' },
      {}
    );
    assert.ok(binding.binding_ratio >= 0 && binding.binding_ratio <= 1);
    const submission = binding.block_details.find((b) => b.block_id === 'ppap.submission_management');
    assert.ok(['NO_DATASET', 'NOT_BOUND'].includes(submission.reason));
    assert.strictEqual(submission.binding_ok, false);
  });

  await testAsync('payload includes signal_loader without promotion', async () => {
    const user = { company_id: '00000000-0000-4000-8000-000000000001', role: 'gerente', hierarchy_level: 2 };
    const payload = { profile_code: 'manager_quality', functional_area: 'quality' };
    const result = await applyCognitiveFoundationToDashboard(user, payload, { force_cognitive_observability: true });
    assert.ok(result.payload.ppap_signal_loader);
    assert.strictEqual(result.payload.ppap_cognitive_runtime.consolidation_applied, false);
    assert.strictEqual(result.payload.ppap_cognitive_runtime.promotion_applied, false);
    assert.strictEqual(result.payload.ppap_cognitive_runtime.inactive, true);
    assert.ok('binding_ratio' in result.payload.ppap_signal_loader);
    assert.strictEqual(result.payload.ppap_signal_loader.pilot_blocks.length, 12);
    assert.strictEqual(result.payload.ppap_signal_loader.inactive, true);
    assert.ok(result.cognitive_runtime_report.ppap_signal_loader);
    assert.strictEqual(result.cognitive_runtime_report.ppap_runtime_foundation?.signal_loader_real, true);
  });

  await testAsync('quality + logistics payloads preserved with ppap signal loader', async () => {
    const user = { company_id: '00000000-0000-4000-8000-000000000001', role: 'gerente', hierarchy_level: 2 };
    const payload = { profile_code: 'manager_logistics', functional_area: 'logistics' };
    const result = await applyCognitiveFoundationToDashboard(user, payload, { force_cognitive_observability: true });
    assert.ok(result.payload.logistics_cognitive_runtime);
    assert.ok(result.payload.ppap_cognitive_runtime);
    assert.strictEqual(result.payload.ppap_cognitive_runtime.inactive, true);
    assert.strictEqual(result.payload.logistics_cognitive_runtime.inactive, true);
  });

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
})();
