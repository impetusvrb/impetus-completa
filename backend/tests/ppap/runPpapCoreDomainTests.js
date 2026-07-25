'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const db = require('../../src/db');
const {
  PPAP_SUBMISSION_STATUS,
  PPAP_WORKFLOW_STAGE,
  resolveTransition,
  isValidSubmissionStatus,
  isValidSubmissionLevel
} = require('../../src/domains/ppap/semantics/ppapCoreSemantics');
const {
  applyWorkflowAction,
  PPAP_WORKFLOW_ACTION
} = require('../../src/domains/ppap/workflow/ppapWorkflowEngine');
const submissionService = require('../../src/domains/ppap/services/ppapSubmissionService');
const { applyCognitiveFoundationToDashboard } = require('../../src/cognitiveRuntime/facade/cognitiveRuntimeFacade');
const { loadPpapTenantSignals } = require('../../src/cognitiveRuntime/domains/ppap/bridge/ppapTenantSignalLoader');

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
  console.log('GF-002 — PPAP Core Domain Tests\n');

  await runMigrationIfNeeded();
  const testCompanyId = await pickCompanyId();

  await test('PPAP tables exist', async () => {
    const tables = [
      'ppap_submissions',
      'ppap_parts',
      'ppap_suppliers',
      'ppap_customers',
      'ppap_psw_records',
      'ppap_dimensional_results',
      'ppap_material_certifications',
      'ppap_capability_studies',
      'ppap_appearance_approvals',
      'ppap_performance_tests',
      'ppap_engineering_changes',
      'ppap_approval_history',
      'ppap_attached_documents',
      'ppap_submission_level_catalog'
    ];
    for (const t of tables) {
      const r = await db.query(
        `SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1`,
        [t]
      );
      assert.ok(r.rows.length, `missing table ${t}`);
    }
  });

  await test('submission level catalog has AIAG 1–5', async () => {
    const r = await db.query('SELECT level FROM ppap_submission_level_catalog ORDER BY level');
    assert.strictEqual(r.rows.length, 5);
    assert.strictEqual(r.rows[0].level, 1);
    assert.strictEqual(r.rows[4].level, 5);
  });

  await test('semantics: statuses and transitions', async () => {
    assert.ok(isValidSubmissionStatus('DRAFT'));
    assert.ok(isValidSubmissionLevel(3));
    assert.ok(resolveTransition(PPAP_WORKFLOW_STAGE.DRAFT, PPAP_WORKFLOW_ACTION.SUBMIT));
    assert.ok(!resolveTransition(PPAP_WORKFLOW_STAGE.RELEASE, PPAP_WORKFLOW_ACTION.SUBMIT));
  });

  await test('CRUD: create part, supplier, submission DRAFT', async () => {
    const suffix = Date.now().toString(36);
    const part = await submissionService.createPart(testCompanyId, {
      part_number: `P-${suffix}`,
      part_name: 'Test Part'
    });
    const supplier = await submissionService.createSupplier(testCompanyId, {
      supplier_code: `S-${suffix}`,
      supplier_name: 'Test Supplier'
    });
    const sub = await submissionService.createSubmission(testCompanyId, {
      part_id: part.id,
      supplier_id: supplier.id,
      submission_level: 3,
      notes: 'GF-002 test'
    });
    assert.strictEqual(sub.status, PPAP_SUBMISSION_STATUS.DRAFT);
    assert.strictEqual(sub.workflow_stage, PPAP_WORKFLOW_STAGE.DRAFT);
  });

  await test('workflow: full path to APPROVED with history', async () => {
    const suffix = `wf-${Date.now().toString(36)}`;
    const part = await submissionService.createPart(testCompanyId, {
      part_number: `WP-${suffix}`,
      part_name: 'Workflow Part'
    });
    const supplier = await submissionService.createSupplier(testCompanyId, {
      supplier_code: `WS-${suffix}`,
      supplier_name: 'Workflow Supplier'
    });
    let sub = await submissionService.createSubmission(testCompanyId, {
      part_id: part.id,
      supplier_id: supplier.id,
      submission_level: 5
    });

    sub = await submissionService.runWorkflowAction(testCompanyId, sub.id, PPAP_WORKFLOW_ACTION.SUBMIT);
    assert.strictEqual(sub.status, PPAP_SUBMISSION_STATUS.UNDER_REVIEW);
    sub = await submissionService.runWorkflowAction(testCompanyId, sub.id, PPAP_WORKFLOW_ACTION.ADVANCE_TECHNICAL);
    sub = await submissionService.runWorkflowAction(testCompanyId, sub.id, PPAP_WORKFLOW_ACTION.ADVANCE_QUALITY);
    sub = await submissionService.runWorkflowAction(testCompanyId, sub.id, PPAP_WORKFLOW_ACTION.REQUEST_APPROVAL);
    assert.strictEqual(sub.status, PPAP_SUBMISSION_STATUS.PENDING_APPROVAL);
    sub = await submissionService.runWorkflowAction(testCompanyId, sub.id, PPAP_WORKFLOW_ACTION.APPROVE);
    assert.strictEqual(sub.status, PPAP_SUBMISSION_STATUS.APPROVED);
    assert.strictEqual(sub.workflow_stage, PPAP_WORKFLOW_STAGE.RELEASE);

    const detail = await submissionService.getSubmissionDetail(testCompanyId, sub.id);
    assert.ok(detail.approval_history.length >= 5);
  });

  await test('workflow: reject and resubmit', async () => {
    const suffix = `rj-${Date.now().toString(36)}`;
    const part = await submissionService.createPart(testCompanyId, {
      part_number: `RP-${suffix}`,
      part_name: 'Reject Part'
    });
    const supplier = await submissionService.createSupplier(testCompanyId, {
      supplier_code: `RS-${suffix}`,
      supplier_name: 'Reject Supplier'
    });
    let sub = await submissionService.createSubmission(testCompanyId, {
      part_id: part.id,
      supplier_id: supplier.id,
      submission_level: 2
    });
    sub = await submissionService.runWorkflowAction(testCompanyId, sub.id, PPAP_WORKFLOW_ACTION.SUBMIT);
    sub = await submissionService.runWorkflowAction(testCompanyId, sub.id, PPAP_WORKFLOW_ACTION.REJECT, {
      rejection_reason: 'dimensional fail'
    });
    assert.strictEqual(sub.status, PPAP_SUBMISSION_STATUS.REJECTED);
    sub = await submissionService.runWorkflowAction(testCompanyId, sub.id, PPAP_WORKFLOW_ACTION.RESUBMIT);
    assert.strictEqual(sub.status, PPAP_SUBMISSION_STATUS.DRAFT);
    sub = await submissionService.runWorkflowAction(testCompanyId, sub.id, PPAP_WORKFLOW_ACTION.SUBMIT);
    assert.strictEqual(sub.status, PPAP_SUBMISSION_STATUS.UNDER_REVIEW);
  });

  await test('runtime unchanged: loader NO_DATASET without company', async () => {
    const sig = await loadPpapTenantSignals({}, {});
    assert.strictEqual(sig.signal_readiness, 'NO_DATASET');
    assert.strictEqual(sig.foundation_only, false);
  });

  await test('runtime unchanged: facade ppap inactive with real loader', async () => {
    const user = { company_id: testCompanyId, role: 'gerente', hierarchy_level: 2 };
    const result = await applyCognitiveFoundationToDashboard(user, {
      profile_code: 'manager_quality',
      functional_area: 'quality'
    });
    assert.strictEqual(result.payload.ppap_cognitive_runtime.inactive, true);
    assert.strictEqual(result.payload.ppap_cognitive_runtime.promotion_applied, false);
    assert.ok(result.payload.ppap_signal_loader);
    assert.strictEqual(result.payload.ppap_signal_loader.pilot_blocks.length, 12);
  });

  await test('invalid transition throws', async () => {
    assert.throws(() => {
      applyWorkflowAction(
        { status: PPAP_SUBMISSION_STATUS.DRAFT, workflow_stage: PPAP_WORKFLOW_STAGE.DRAFT },
        PPAP_WORKFLOW_ACTION.APPROVE
      );
    });
  });

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
