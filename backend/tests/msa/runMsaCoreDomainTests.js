'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const db = require('../../src/db');
const {
  MSA_STUDY_STATUS,
  MSA_WORKFLOW_STAGE,
  MSA_STUDY_KIND,
  resolveTransition,
  isValidStudyStatus,
  isValidStudyKind
} = require('../../src/domains/msa/semantics/msaCoreSemantics');
const {
  applyWorkflowAction,
  MSA_WORKFLOW_ACTION
} = require('../../src/domains/msa/workflow/msaWorkflowEngine');
const studyService = require('../../src/domains/msa/services/msaStudyService');
const masterDataService = require('../../src/domains/msa/services/msaMasterDataService');
const { loadMsaTenantSignals } = require('../../src/cognitiveRuntime/domains/msa/bridge/msaTenantSignalLoader');
const { attachMsaRuntimeFoundation } = require('../../src/cognitiveRuntime/domains/msa/runtime/msaFoundationAttachment');

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
  console.log('GF-009 — MSA Core Domain Tests\n');

  await runMigrationIfNeeded();
  const testCompanyId = await pickCompanyId();

  await test('MSA tables exist', async () => {
    const tables = [
      'msa_measurement_studies',
      'msa_gauges',
      'msa_instruments',
      'msa_operators',
      'msa_parts',
      'msa_measurement_samples',
      'msa_variable_grr_studies',
      'msa_attribute_agreement_studies',
      'msa_bias_studies',
      'msa_linearity_studies',
      'msa_stability_studies',
      'msa_calibration_references',
      'msa_study_approvals',
      'msa_study_history',
      'msa_attached_documents',
      'msa_study_operators',
      'msa_study_parts'
    ];
    for (const t of tables) {
      const r = await db.query(
        `SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1`,
        [t]
      );
      assert.ok(r.rows.length, `missing table ${t}`);
    }
  });

  await test('semantics: statuses, kinds and transitions', async () => {
    assert.ok(isValidStudyStatus('DRAFT'));
    assert.ok(isValidStudyKind('variable_grr'));
    assert.ok(resolveTransition(MSA_WORKFLOW_STAGE.DRAFT, MSA_WORKFLOW_ACTION.PLAN));
    assert.ok(!resolveTransition(MSA_WORKFLOW_STAGE.ARCHIVE, MSA_WORKFLOW_ACTION.START));
  });

  await test('CRUD: gauge + variable GRR study DRAFT', async () => {
    const suffix = Date.now().toString(36);
    const gauge = await masterDataService.createGauge(testCompanyId, {
      gauge_code: `G-${suffix}`,
      gauge_name: 'Caliper Test',
      gauge_type: 'variable'
    });
    const study = await studyService.createStudy(testCompanyId, {
      study_title: 'GRR Pilot Hole',
      characteristic_name: 'Diameter A',
      study_kind: MSA_STUDY_KIND.VARIABLE_GRR,
      gauge_id: gauge.id,
      num_operators: 3,
      num_parts: 5,
      num_trials: 2
    });
    assert.strictEqual(study.status, MSA_STUDY_STATUS.DRAFT);
    assert.strictEqual(study.workflow_stage, MSA_WORKFLOW_STAGE.DRAFT);

    const detail = await studyService.getStudyDetail(testCompanyId, study.id);
    assert.strictEqual(detail.study_kind, MSA_STUDY_KIND.VARIABLE_GRR);
    assert.ok(detail.type_extension);
  });

  await test('workflow: full path to APPROVED with history', async () => {
    const suffix = `wf-${Date.now().toString(36)}`;
    const gauge = await masterDataService.createGauge(testCompanyId, {
      gauge_code: `WG-${suffix}`,
      gauge_name: 'Micrometer',
      gauge_type: 'variable'
    });
    let study = await studyService.createStudy(testCompanyId, {
      study_title: 'Workflow Study',
      characteristic_name: 'Length',
      study_kind: MSA_STUDY_KIND.VARIABLE_GRR,
      gauge_id: gauge.id
    });

    study = await studyService.runWorkflowAction(testCompanyId, study.id, MSA_WORKFLOW_ACTION.PLAN);
    assert.strictEqual(study.status, MSA_STUDY_STATUS.PLANNED);
    study = await studyService.runWorkflowAction(testCompanyId, study.id, MSA_WORKFLOW_ACTION.START);
    assert.strictEqual(study.status, MSA_STUDY_STATUS.IN_PROGRESS);
    study = await studyService.runWorkflowAction(testCompanyId, study.id, MSA_WORKFLOW_ACTION.REVIEW);
    assert.strictEqual(study.status, MSA_STUDY_STATUS.UNDER_REVIEW);
    study = await studyService.approveStudy(testCompanyId, study.id);
    assert.strictEqual(study.status, MSA_STUDY_STATUS.APPROVED);

    const detail = await studyService.getStudyDetail(testCompanyId, study.id);
    assert.ok(detail.study_history.length >= 5);
  });

  await test('workflow: reject and reopen', async () => {
    const suffix = `rj-${Date.now().toString(36)}`;
    let study = await studyService.createStudy(testCompanyId, {
      study_title: 'Reject Study',
      characteristic_name: 'Width',
      study_kind: MSA_STUDY_KIND.BIAS,
      reference_value: 10.0
    });
    study = await studyService.runWorkflowAction(testCompanyId, study.id, MSA_WORKFLOW_ACTION.PLAN);
    study = await studyService.runWorkflowAction(testCompanyId, study.id, MSA_WORKFLOW_ACTION.START);
    study = await studyService.runWorkflowAction(testCompanyId, study.id, MSA_WORKFLOW_ACTION.REJECT, {
      rejection_reason: 'insufficient samples'
    });
    assert.strictEqual(study.status, MSA_STUDY_STATUS.REJECTED);
    study = await studyService.runWorkflowAction(testCompanyId, study.id, MSA_WORKFLOW_ACTION.REOPEN);
    assert.strictEqual(study.status, MSA_STUDY_STATUS.DRAFT);
  });

  await test('study types: separate extension tables (no generic JSON)', async () => {
    const suffix = `ty-${Date.now().toString(36)}`;
    const linearity = await studyService.createStudy(testCompanyId, {
      study_title: 'Linearity',
      characteristic_name: 'Pressure',
      study_kind: MSA_STUDY_KIND.LINEARITY,
      range_min: 0,
      range_max: 100
    });
    const detail = await studyService.getStudyDetail(testCompanyId, linearity.id);
    assert.strictEqual(detail.study_kind, MSA_STUDY_KIND.LINEARITY);
    assert.strictEqual(Number(detail.type_extension.range_min), 0);
  });

  await test('runtime unchanged: loader NO_DATASET without company', async () => {
    const sig = await loadMsaTenantSignals({}, {});
    assert.strictEqual(sig.signal_readiness, 'NO_DATASET');
    assert.strictEqual(sig.foundation_only, false);
    assert.strictEqual(sig.mock_signals, false);
  });

  await test('runtime unchanged: foundation attachment inactive with real loader', async () => {
    const user = { company_id: testCompanyId };
    const { payload } = await attachMsaRuntimeFoundation(user, {});
    assert.strictEqual(payload.msa_cognitive_runtime.inactive, true);
    assert.strictEqual(payload.msa_cognitive_runtime.promotion_applied, false);
    assert.ok(payload.msa_signal_loader);
    assert.strictEqual(payload.msa_signal_loader.pilot_blocks.length, 12);
    assert.strictEqual(payload.msa_signal_loader.inactive, true);
    assert.deepStrictEqual(payload.msa_cognitive_centers, []);
  });

  await test('invalid transition throws', async () => {
    assert.throws(() => {
      applyWorkflowAction(
        { status: MSA_STUDY_STATUS.DRAFT, workflow_stage: MSA_WORKFLOW_STAGE.DRAFT },
        MSA_WORKFLOW_ACTION.APPROVE
      );
    });
  });

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
