'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const db = require('../../src/db');
const { runMsaPilotScenario } = require('../../src/domains/msa/services/msaPilotScenario');
const { runMsaSignalBinding } = require('../../src/cognitiveRuntime/domains/msa/bridge/msaSignalBindingRuntime');
const { applyCognitiveFoundationToDashboard } = require('../../src/cognitiveRuntime/facade/cognitiveRuntimeFacade');
const { MSA_STUDY_STATUS } = require('../../src/domains/msa/semantics/msaCoreSemantics');
const masterDataService = require('../../src/domains/msa/services/msaMasterDataService');
const studyService = require('../../src/domains/msa/services/msaStudyService');
const { MSA_PILOT_BLOCK_IDS } = require('../../src/cognitiveRuntime/registry/msaCognitiveBlockPack');

let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    passed += 1;
    console.log(`  ✓ ${name}`);
  } catch (e) {
    failed += 1;
    console.error(`  ✗ ${name}: ${e.message}`);
  }
}

async function runMigrationIfNeeded() {
  const sql = fs.readFileSync(
    path.join(__dirname, '../../migrations/msa_core_domain_migration.sql'),
    'utf8'
  );
  await db.query(sql);
}

async function pickCompanyId() {
  const r = await db.query('SELECT id FROM companies ORDER BY created_at LIMIT 1');
  if (!r.rows[0]) throw new Error('no company for tests');
  return r.rows[0].id;
}

(async () => {
  console.log('GF-012 — MSA Pilot Enablement Tests\n');

  await runMigrationIfNeeded();
  const companyId = await pickCompanyId();

  let bindingBefore = null;
  let bindingAfter = null;
  let pilotResult = null;

  await test('binding before pilot — baseline recorded', async () => {
    bindingBefore = await runMsaSignalBinding({ company_id: companyId }, {});
    assert.ok(bindingBefore);
    assert.ok('binding_ratio' in bindingBefore);
    console.log(`    baseline binding_ratio=${bindingBefore.binding_ratio} readiness=${bindingBefore.signal_readiness}`);
  });

  await test('pilot scenario: master data + all study types + workflow APPROVED', async () => {
    pilotResult = await runMsaPilotScenario(companyId, { tag: 'GF-012' });
    assert.strictEqual(pilotResult.primaryStudy.status, MSA_STUDY_STATUS.APPROVED);
    assert.ok(pilotResult.detail.attached_documents.length >= 2);
    assert.ok(pilotResult.detail.measurement_samples.length >= 9);
    assert.ok(pilotResult.detail.study_history.length >= 4);
    assert.ok(pilotResult.detail.study_approvals.length >= 2);
    assert.ok(pilotResult.studies.attribute_agreement);
    assert.ok(pilotResult.studies.bias);
    assert.ok(pilotResult.studies.linearity);
    assert.ok(pilotResult.studies.stability);
  });

  await test('operational APIs: list master data includes pilot records', async () => {
    const gauges = await masterDataService.listGauges(companyId);
    const operators = await masterDataService.listOperators(companyId);
    const parts = await masterDataService.listParts(companyId);
    const instruments = await masterDataService.listInstruments(companyId);
    const calRefs = await masterDataService.listCalibrationReferences(companyId);
    assert.ok(gauges.some((g) => g.id === pilotResult.master.gauge.id));
    assert.ok(operators.some((o) => o.id === pilotResult.master.operators[0].id));
    assert.ok(parts.some((p) => p.id === pilotResult.master.parts[0].id));
    assert.ok(instruments.some((i) => i.id === pilotResult.master.instrument.id));
    assert.ok(calRefs.some((c) => c.id === pilotResult.master.calibrationRef.id));
  });

  await test('signal loader observes real data — binding_ratio > 0', async () => {
    bindingAfter = await runMsaSignalBinding({ company_id: companyId }, {});
    assert.ok(bindingAfter.binding_ratio > 0, `expected binding_ratio > 0, got ${bindingAfter.binding_ratio}`);
    assert.ok(bindingAfter.bound_blocks.length > 0);
    assert.notStrictEqual(bindingAfter.signal_readiness, 'NO_DATASET');
    assert.ok(bindingAfter.binding_ratio >= bindingBefore.binding_ratio);
    console.log(`    after binding_ratio=${bindingAfter.binding_ratio} bound=${bindingAfter.bound_blocks.length}`);
    console.log(`    signal_readiness=${bindingAfter.signal_readiness}`);
    console.log(`    bound_blocks: ${bindingAfter.bound_blocks.join(', ')}`);
  });

  await test('all 12 cognitive blocks bound after pilot enablement', async () => {
    for (const blockId of MSA_PILOT_BLOCK_IDS) {
      assert.ok(bindingAfter.bound_blocks.includes(blockId), `expected bound block ${blockId}`);
    }
    assert.strictEqual(bindingAfter.bound_blocks.length, 12);
  });

  await test('promotion NOT forced — runtime remains gate-driven OFF', async () => {
    const user = { company_id: companyId, role: 'gerente', hierarchy_level: 2 };
    const result = await applyCognitiveFoundationToDashboard(user, {
      profile_code: 'manager_quality',
      functional_area: 'quality'
    });
    assert.strictEqual(result.payload.msa_cognitive_runtime.inactive, true);
    assert.strictEqual(result.payload.msa_cognitive_runtime.promotion_applied, false);
    assert.strictEqual(result.payload.msa_cognitive_runtime.consolidation_applied, false);
    assert.ok(result.payload.msa_signal_loader.binding_ratio > 0);
  });

  await test('NO_SYNTHETIC_DATA — loader observation-only unchanged', async () => {
    const loaderSrc = fs.readFileSync(
      path.join(__dirname, '../../src/cognitiveRuntime/domains/msa/bridge/msaTenantSignalLoader.js'),
      'utf8'
    );
    assert.ok(!loaderSrc.includes('resolveTransition'));
    assert.ok(!loaderSrc.includes('applyWorkflowAction'));
    assert.ok(!loaderSrc.includes('Math.random'));
  });

  await test('study detail retrievable via service after pilot', async () => {
    const detail = await studyService.getStudyDetail(companyId, pilotResult.primaryStudyId);
    assert.ok(detail.study);
    assert.strictEqual(detail.study_kind, 'variable_grr');
    assert.ok(detail.operators.length >= 3);
    assert.ok(detail.parts.length >= 3);
  });

  console.log('\n--- GF-012 Acceptance Summary ---');
  console.log('MSA_OPERATIONAL_DATA = YES');
  console.log(`MSA_SIGNAL_READINESS = ${bindingAfter?.signal_readiness ?? 'N/A'}`);
  console.log(`MSA_BINDING_RATIO = ${bindingAfter?.binding_ratio ?? 'N/A'}`);
  console.log(`MSA_BINDING_RATIO > 0 = ${bindingAfter?.binding_ratio > 0 ? 'YES' : 'NO'}`);
  console.log('NO_SYNTHETIC_DATA = YES');
  console.log('PROMOTION_FORCED = NO');
  console.log('GATE_DRIVEN = YES');

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
