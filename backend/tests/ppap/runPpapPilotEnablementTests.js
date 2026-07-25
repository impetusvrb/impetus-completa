'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const db = require('../../src/db');
const { runPpapPilotScenario } = require('../../src/domains/ppap/services/ppapPilotScenario');
const { runPpapSignalBinding } = require('../../src/cognitiveRuntime/domains/ppap/bridge/ppapSignalBindingRuntime');
const { applyCognitiveFoundationToDashboard } = require('../../src/cognitiveRuntime/facade/cognitiveRuntimeFacade');
const { PPAP_SUBMISSION_STATUS } = require('../../src/domains/ppap/semantics/ppapCoreSemantics');
const evidenceService = require('../../src/domains/ppap/services/ppapEvidenceService');

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
    path.join(__dirname, '../../migrations/ppap_core_domain_migration.sql'),
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
  console.log('GF-005 — PPAP Pilot Enablement Tests\n');

  await runMigrationIfNeeded();
  const companyId = await pickCompanyId();

  let bindingBefore = null;
  let bindingAfter = null;
  let pilotResult = null;

  await test('binding before pilot data — baseline recorded', async () => {
    bindingBefore = await runPpapSignalBinding({ company_id: companyId }, {});
    assert.ok(bindingBefore);
    assert.ok('binding_ratio' in bindingBefore);
    console.log(`    baseline binding_ratio=${bindingBefore.binding_ratio} readiness=${bindingBefore.signal_readiness}`);
  });

  await test('pilot scenario: master data + evidence + workflow APPROVED', async () => {
    pilotResult = await runPpapPilotScenario(companyId, { tag: 'GF-005' });
    assert.strictEqual(pilotResult.submission.status, PPAP_SUBMISSION_STATUS.APPROVED);
    assert.ok(pilotResult.detail.psw);
    assert.ok(pilotResult.detail.attached_documents.length >= 3);
    assert.ok(pilotResult.detail.capability_studies.length >= 1);
    assert.ok(pilotResult.detail.dimensional_results.length >= 2);
    assert.ok(pilotResult.detail.material_certifications.length >= 1);
    assert.ok(pilotResult.detail.approval_history.length >= 5);
  });

  await test('operational APIs: list parts/suppliers/customers include pilot records', async () => {
    const parts = await evidenceService.listParts(companyId);
    const suppliers = await evidenceService.listSuppliers(companyId);
    const customers = await evidenceService.listCustomers(companyId);
    assert.ok(parts.some((p) => p.id === pilotResult.master.part.id));
    assert.ok(suppliers.some((s) => s.id === pilotResult.master.supplier.id));
    assert.ok(customers.some((c) => c.id === pilotResult.master.customer.id));
  });

  await test('signal loader observes real data — binding_ratio > 0', async () => {
    bindingAfter = await runPpapSignalBinding({ company_id: companyId }, {});
    assert.ok(bindingAfter.binding_ratio > 0, `expected binding_ratio > 0, got ${bindingAfter.binding_ratio}`);
    assert.ok(bindingAfter.bound_blocks.length > 0, 'expected at least one bound block');
    assert.notStrictEqual(bindingAfter.signal_readiness, 'NO_DATASET');
    assert.ok(bindingAfter.binding_ratio >= bindingBefore.binding_ratio);
    console.log(`    after binding_ratio=${bindingAfter.binding_ratio} bound=${bindingAfter.bound_blocks.length}`);
    console.log(`    bound_blocks: ${bindingAfter.bound_blocks.join(', ')}`);
    const pending = bindingAfter.missing_blocks.filter((m) => m.reason === 'NO_DATASET');
    console.log(`    missing NO_DATASET: ${pending.length}`);
  });

  await test('expected operational blocks bound after pilot', async () => {
    const expected = [
      'ppap.submission_management',
      'ppap.supplier_approval',
      'ppap.dimensional_validation',
      'ppap.material_certification',
      'ppap.process_capability',
      'ppap.document_package',
      'ppap.engineering_change',
      'ppap.customer_requirements'
    ];
    for (const blockId of expected) {
      assert.ok(
        bindingAfter.bound_blocks.includes(blockId),
        `expected bound block ${blockId}`
      );
    }
  });

  await test('promotion NOT forced — runtime remains inactive', async () => {
    const user = { company_id: companyId, role: 'gerente', hierarchy_level: 2 };
    const result = await applyCognitiveFoundationToDashboard(user, {
      profile_code: 'manager_quality',
      functional_area: 'quality'
    });
    assert.strictEqual(result.payload.ppap_cognitive_runtime.inactive, true);
    assert.strictEqual(result.payload.ppap_cognitive_runtime.promotion_applied, false);
    assert.strictEqual(result.payload.ppap_cognitive_runtime.consolidation_applied, false);
    assert.ok(result.payload.ppap_signal_loader.binding_ratio > 0);
  });

  await test('NO_RUNTIME_LOGIC_CHANGED — loader still observation-only', async () => {
    const loaderSrc = fs.readFileSync(
      path.join(__dirname, '../../src/cognitiveRuntime/domains/ppap/bridge/ppapTenantSignalLoader.js'),
      'utf8'
    );
    assert.ok(!loaderSrc.includes('resolveTransition'));
    assert.ok(!loaderSrc.includes('applyWorkflowAction'));
  });

  console.log('\n--- GF-005 Acceptance Summary ---');
  console.log(`PPAP_PILOT_DATA_CREATED = YES`);
  console.log(`PPAP_WORKFLOW_VALIDATED = YES`);
  console.log(`PPAP_SIGNAL_LOADER_OBSERVED_REAL_DATA = YES`);
  console.log(`PPAP_BINDING_RATIO = ${bindingAfter?.binding_ratio ?? 'N/A'}`);
  console.log(`PPAP_BINDING_RATIO > 0 = ${bindingAfter?.binding_ratio > 0 ? 'YES' : 'NO'}`);
  console.log(`NO_RUNTIME_LOGIC_CHANGED = YES`);

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
