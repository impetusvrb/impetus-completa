'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const db = require('../../src/db');
const { loadIshikawaTenantSignals } = require('../../src/cognitiveRuntime/domains/ishikawa/bridge/ishikawaTenantSignalLoader');
const { runIshikawaSignalBinding } = require('../../src/cognitiveRuntime/domains/ishikawa/bridge/ishikawaSignalBindingRuntime');
const { invokeIshikawaBlockBridge } = require('../../src/cognitiveRuntime/domains/ishikawa/bridge/ishikawaBlockBridge');
const { buildBindingValidationReport } = require('../../src/cognitiveRuntime/observability/bindingValidationReport');
const { applyCognitiveFoundationToDashboard } = require('../../src/cognitiveRuntime/facade/cognitiveRuntimeFacade');
const { ISHIKAWA_PILOT_BLOCK_IDS } = require('../../src/cognitiveRuntime/registry/ishikawaCognitiveBlockPack');
const { ISHIKAWA_INVESTIGATION_STATUS } = require('../../src/domains/ishikawa/semantics/ishikawaCoreSemantics');
const { ISHIKAWA_WORKFLOW_ACTION } = require('../../src/domains/ishikawa/workflow/ishikawaWorkflowEngine');
const investigationService = require('../../src/domains/ishikawa/services/ishikawaInvestigationService');
const fishboneService = require('../../src/domains/ishikawa/services/ishikawaFishboneService');

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
  const bridgeDir = path.join(__dirname, '../../src/cognitiveRuntime/domains/ishikawa/bridge');
  const files = [
    'ishikawaTenantSignalLoader.js',
    'ishikawaBlockBridge.js',
    'ishikawaSignalBindingRuntime.js'
  ];
  const forbiddenPatterns = [
    /resolveTransition/,
    /applyWorkflowAction/,
    /ISHIKAWA_WORKFLOW_TRANSITIONS/,
    /ISHIKAWA_WORKFLOW_ACTION\s*=/,
    /ISHIKAWA_WORKFLOW_STAGE\s*=/,
    /function\s+isValidInvestigationStatus/,
    /function\s+isValidWorkflowStage/
  ];
  for (const file of files) {
    const content = fs.readFileSync(path.join(bridgeDir, file), 'utf8');
    for (const pattern of forbiddenPatterns) {
      assert.ok(!pattern.test(content), `${file} duplicates business logic: ${pattern}`);
    }
  }
  const loaderContent = fs.readFileSync(path.join(bridgeDir, 'ishikawaTenantSignalLoader.js'), 'utf8');
  assert.ok(
    loaderContent.includes('ishikawaCoreSemantics'),
    'loader must import semantics from ishikawaCoreSemantics.js'
  );
  assert.ok(
    !/require\s*\(\s*['"].*qualityRootCauseEngine/.test(loaderContent),
    'loader must not import legacy engine'
  );
}

async function pickCompanyId() {
  const r = await db.query('SELECT id FROM companies ORDER BY created_at LIMIT 1');
  if (!r.rows[0]) throw new Error('no company for tests');
  return r.rows[0].id;
}

(async () => {
  console.log('GF-017 — Ishikawa Signal Loader Tests\n');
  process.env.IMPETUS_ISHIKAWA_SIGNAL_DIAGNOSTICS = 'off';

  test('semantics audit: no workflow duplication in loader/bridge', () => {
    auditNoBusinessRuleDuplication();
  });

  test('12 pilot blocks defined', () => {
    assert.strictEqual(ISHIKAWA_PILOT_BLOCK_IDS.length, 12);
  });

  await testAsync('loader returns real structure without mock', async () => {
    const sig = await loadIshikawaTenantSignals(
      { company_id: '00000000-0000-4000-8000-000000000001' },
      {}
    );
    assert.strictEqual(sig.foundation_only, false);
    assert.strictEqual(sig.mock_signals, false);
    assert.ok(sig.datasets);
    assert.ok('ishikawa_root_cause_investigations' in sig.datasets);
    assert.ok(Array.isArray(sig.data_sources));
    assert.ok(sig.investigations);
    assert.ok(sig.investigations.status_counts);
    assert.strictEqual(sig.investigations.status_counts[ISHIKAWA_INVESTIGATION_STATUS.DRAFT], 0);
    assert.ok(sig.cross_domain?.integration_absent);
  });

  await testAsync('missing company_id returns NO_DATASET', async () => {
    const sig = await loadIshikawaTenantSignals({}, {});
    assert.strictEqual(sig.signal_readiness, 'NO_DATASET');
    assert.strictEqual(sig.ok, false);
  });

  await testAsync('block bridge exposes Z.20 fields', async () => {
    const sig = await loadIshikawaTenantSignals(
      { company_id: '00000000-0000-4000-8000-000000000099' },
      {}
    );
    const b = invokeIshikawaBlockBridge('ishikawa.investigation_registry', sig, {});
    assert.ok('engine_ok' in b);
    assert.ok('binding_ok' in b);
    assert.ok('dataset_used' in b);
    assert.ok('signal_count' in b);
    assert.ok('reason' in b);
  });

  await testAsync('binding uses buildBindingValidationReport (MSA/PPAP parity)', async () => {
    const binding = await runIshikawaSignalBinding(
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
    const binding = await runIshikawaSignalBinding(
      { company_id: '00000000-0000-4000-8000-000000000099' },
      {}
    );
    assert.ok(binding.binding_ratio >= 0 && binding.binding_ratio <= 1);
    const registry = binding.block_details.find((b) => b.block_id === 'ishikawa.investigation_registry');
    assert.ok(['NO_DATASET', 'NOT_BOUND'].includes(registry.reason));
    assert.strictEqual(registry.binding_ok, false);
  });

  await testAsync('tenant with investigation data binds operational blocks', async () => {
    const companyId = await pickCompanyId();
    const inv = await investigationService.createInvestigation(companyId, {
      title: 'Signal Loader Investigation',
      problem_statement: 'Binding test problem'
    });
    await investigationService.runWorkflowAction(companyId, inv.id, ISHIKAWA_WORKFLOW_ACTION.START);
    await fishboneService.addFishboneCause(companyId, inv.id, {
      category_key: 'METHOD',
      cause_text: 'Procedure deviation'
    });
    await investigationService.addCorrectiveAction(companyId, inv.id, {
      action_title: 'Update SOP',
      action_description: 'Revise procedure on line 2'
    });

    const binding = await runIshikawaSignalBinding({ company_id: companyId }, {});
    assert.ok(binding.binding_ratio > 0, 'expected binding when investigation exists');
    assert.ok(binding.bound_blocks.includes('ishikawa.investigation_registry'));
    assert.ok(binding.bound_blocks.includes('ishikawa.fishbone_analysis'));
    assert.ok(binding.bound_blocks.includes('ishikawa.corrective_actions'));
    assert.strictEqual(binding.inactive, true);
  });

  await testAsync('payload includes signal_loader without promotion', async () => {
    const user = { company_id: '00000000-0000-4000-8000-000000000001', role: 'gerente', hierarchy_level: 2 };
    const payload = { profile_code: 'manager_quality', functional_area: 'quality' };
    const result = await applyCognitiveFoundationToDashboard(user, payload, { force_cognitive_observability: true });
    assert.ok(result.payload.ishikawa_signal_loader);
    assert.strictEqual(result.payload.ishikawa_cognitive_runtime.consolidation_applied, false);
    assert.strictEqual(result.payload.ishikawa_cognitive_runtime.promotion_applied, false);
    assert.strictEqual(result.payload.ishikawa_cognitive_runtime.inactive, true);
    assert.ok('binding_ratio' in result.payload.ishikawa_signal_loader);
    assert.strictEqual(result.payload.ishikawa_signal_loader.pilot_blocks.length, 12);
    assert.strictEqual(result.payload.ishikawa_signal_loader.inactive, true);
    assert.ok(result.cognitive_runtime_report.ishikawa_signal_loader);
    assert.strictEqual(result.cognitive_runtime_report.ishikawa_runtime_foundation?.signal_loader_real, true);
    assert.strictEqual(result.cognitive_runtime_report.ishikawa_runtime_foundation?.signal_loader_stub, false);
  });

  await testAsync('quality + ppap + msa payloads preserved with ishikawa signal loader', async () => {
    const user = { company_id: '00000000-0000-4000-8000-000000000001', role: 'gerente', hierarchy_level: 2 };
    const payload = { profile_code: 'manager_quality', functional_area: 'quality' };
    const result = await applyCognitiveFoundationToDashboard(user, payload, { force_cognitive_observability: true });
    assert.ok(result.payload.ppap_cognitive_runtime);
    assert.ok(result.payload.msa_cognitive_runtime);
    assert.ok(result.payload.ishikawa_cognitive_runtime);
    assert.strictEqual(result.payload.ppap_cognitive_runtime.inactive, true);
    assert.strictEqual(result.payload.msa_cognitive_runtime.inactive, true);
    assert.strictEqual(result.payload.ishikawa_cognitive_runtime.inactive, true);
  });

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
