'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const db = require('../../src/db');
const {
  ISHIKAWA_INVESTIGATION_STATUS,
  ISHIKAWA_WORKFLOW_STAGE,
  resolveTransition,
  isValidInvestigationStatus
} = require('../../src/domains/ishikawa/semantics/ishikawaCoreSemantics');
const {
  applyWorkflowAction,
  ISHIKAWA_WORKFLOW_ACTION
} = require('../../src/domains/ishikawa/workflow/ishikawaWorkflowEngine');
const {
  buildIshikawaTemplate,
  fiveWhysChain,
  ISHIKAWA_CATEGORY_KEYS
} = require('../../src/domains/ishikawa/core/ishikawaRootCauseAlgorithms');
const investigationService = require('../../src/domains/ishikawa/services/ishikawaInvestigationService');
const fishboneService = require('../../src/domains/ishikawa/services/ishikawaFishboneService');
const { loadIshikawaTenantSignals } = require('../../src/cognitiveRuntime/domains/ishikawa/bridge/ishikawaTenantSignalLoader');
const { attachIshikawaRuntimeFoundation } = require('../../src/cognitiveRuntime/domains/ishikawa/runtime/ishikawaFoundationAttachment');

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
    path.join(__dirname, '../../migrations/ishikawa_core_domain_migration.sql'),
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
  console.log('GF-016 — Ishikawa Core Domain Tests\n');

  await runMigrationIfNeeded();
  const testCompanyId = await pickCompanyId();

  await test('Ishikawa tables exist', async () => {
    const tables = [
      'ishikawa_root_cause_investigations',
      'ishikawa_investigation_team',
      'ishikawa_investigation_evidence',
      'ishikawa_fishbone_diagrams',
      'ishikawa_fishbone_categories',
      'ishikawa_fishbone_causes',
      'ishikawa_five_why_analyses',
      'ishikawa_five_why_steps',
      'ishikawa_corrective_actions',
      'ishikawa_preventive_actions',
      'ishikawa_verification_results',
      'ishikawa_investigation_approvals',
      'ishikawa_attached_documents',
      'ishikawa_investigation_history'
    ];
    for (const t of tables) {
      const r = await db.query(
        `SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1`,
        [t]
      );
      assert.ok(r.rows.length, `missing table ${t}`);
    }
  });

  await test('semantics: statuses and transitions', async () => {
    assert.ok(isValidInvestigationStatus('DRAFT'));
    assert.ok(resolveTransition(ISHIKAWA_WORKFLOW_STAGE.DRAFT, ISHIKAWA_WORKFLOW_ACTION.START));
    assert.ok(!resolveTransition(ISHIKAWA_WORKFLOW_STAGE.ARCHIVE, ISHIKAWA_WORKFLOW_ACTION.START));
  });

  await test('LEGACY_ALGORITHMS_MIGRATED: buildIshikawaTemplate + fiveWhysChain', async () => {
    const tpl = buildIshikawaTemplate();
    assert.strictEqual(Object.keys(tpl).length, 6);
    for (const k of ISHIKAWA_CATEGORY_KEYS) {
      assert.ok(tpl[k], k);
    }
    const chain = fiveWhysChain(['why1', 'why2', 'why3']);
    assert.strictEqual(chain.depth, 3);
    assert.strictEqual(chain.root_hypothesis, 'why3');

    const fsMod = require('fs');
    const algoPath = path.join(__dirname, '../../src/domains/ishikawa/core/ishikawaRootCauseAlgorithms.js');
    const src = fsMod.readFileSync(algoPath, 'utf8');
    assert.ok(!/require\s*\(\s*['"].*qualityRootCauseEngine/.test(src), 'must not require legacy module');
    assert.ok(!/from\s+['"].*qualityRootCauseEngine/.test(src), 'must not import legacy module');
  });

  await test('CRUD: investigation DRAFT + fishbone 6 categories', async () => {
    const inv = await investigationService.createInvestigation(testCompanyId, {
      title: 'NC Line 3 — dimensional drift',
      problem_statement: 'Parts out of tolerance on line 3',
      effect_description: 'Dimensional non-conformance'
    });
    assert.strictEqual(inv.status, ISHIKAWA_INVESTIGATION_STATUS.DRAFT);

    const detail = await investigationService.getInvestigationDetail(testCompanyId, inv.id);
    assert.ok(detail.fishbone);
    assert.strictEqual(detail.fishbone.categories.length, 6);
    const keys = detail.fishbone.categories.map((c) => c.category_key).sort();
    assert.deepStrictEqual(keys, [...ISHIKAWA_CATEGORY_KEYS].sort());
  });

  await test('workflow: full path to APPROVED with history', async () => {
    let inv = await investigationService.createInvestigation(testCompanyId, {
      title: 'Workflow test',
      problem_statement: 'Test problem'
    });

    inv = await investigationService.runWorkflowAction(testCompanyId, inv.id, ISHIKAWA_WORKFLOW_ACTION.START);
    assert.strictEqual(inv.status, ISHIKAWA_INVESTIGATION_STATUS.UNDER_INVESTIGATION);

    await fishboneService.addFishboneCause(testCompanyId, inv.id, {
      category_key: 'METHOD',
      cause_text: 'Procedure not followed'
    });

    inv = await investigationService.runWorkflowAction(testCompanyId, inv.id, ISHIKAWA_WORKFLOW_ACTION.DEFINE_ROOT_CAUSE, {
      root_cause_summary: 'Missing procedure training'
    });
    assert.strictEqual(inv.status, ISHIKAWA_INVESTIGATION_STATUS.ROOT_CAUSE_DEFINED);

    await investigationService.addCorrectiveAction(testCompanyId, inv.id, {
      action_title: 'Retrain operators',
      action_description: 'Training session on SOP-042'
    });

    inv = await investigationService.runWorkflowAction(testCompanyId, inv.id, ISHIKAWA_WORKFLOW_ACTION.PLAN_ACTIONS);
    assert.strictEqual(inv.status, ISHIKAWA_INVESTIGATION_STATUS.ACTIONS_DEFINED);

    inv = await investigationService.runWorkflowAction(testCompanyId, inv.id, ISHIKAWA_WORKFLOW_ACTION.SUBMIT_APPROVAL);
    assert.strictEqual(inv.status, ISHIKAWA_INVESTIGATION_STATUS.UNDER_APPROVAL);

    inv = await investigationService.approveInvestigation(testCompanyId, inv.id);
    assert.strictEqual(inv.status, ISHIKAWA_INVESTIGATION_STATUS.APPROVED);

    const detail = await investigationService.getInvestigationDetail(testCompanyId, inv.id);
    assert.ok(detail.history.length >= 5);
    assert.ok(detail.corrective_actions.length >= 1);
  });

  await test('workflow: reject and reopen', async () => {
    let inv = await investigationService.createInvestigation(testCompanyId, {
      title: 'Reject test',
      problem_statement: 'Reject flow'
    });
    inv = await investigationService.runWorkflowAction(testCompanyId, inv.id, ISHIKAWA_WORKFLOW_ACTION.START);
    inv = await investigationService.runWorkflowAction(testCompanyId, inv.id, ISHIKAWA_WORKFLOW_ACTION.REJECT, {
      rejection_reason: 'insufficient evidence'
    });
    assert.strictEqual(inv.status, ISHIKAWA_INVESTIGATION_STATUS.REJECTED);
    inv = await investigationService.runWorkflowAction(testCompanyId, inv.id, ISHIKAWA_WORKFLOW_ACTION.REOPEN);
    assert.strictEqual(inv.status, ISHIKAWA_INVESTIGATION_STATUS.DRAFT);
  });

  await test('five whys: normalized steps table', async () => {
    const inv = await investigationService.createInvestigation(testCompanyId, {
      title: '5 Whys test',
      problem_statement: 'Why chain'
    });
    const fw = await fishboneService.createFiveWhyAnalysis(testCompanyId, inv.id, {
      answers: ['Material lot wrong', 'Supplier change', 'No notification']
    });
    assert.strictEqual(fw.steps.length, 3);
    assert.ok(fw.analysis.root_hypothesis);
  });

  await test('runtime unchanged: loader read-only inactive', async () => {
    const sig = await loadIshikawaTenantSignals({}, {});
    assert.strictEqual(sig.inactive, true);
    assert.strictEqual(sig.foundation_only, false);
    assert.strictEqual(sig.mock_signals, false);
  });

  await test('runtime unchanged: foundation attachment inactive', async () => {
    const user = { company_id: testCompanyId };
    const { payload } = await attachIshikawaRuntimeFoundation(user, {});
    assert.strictEqual(payload.ishikawa_cognitive_runtime.inactive, true);
    assert.strictEqual(payload.ishikawa_cognitive_runtime.promotion_applied, false);
    assert.ok(payload.ishikawa_signal_loader);
    assert.strictEqual(payload.ishikawa_signal_loader.inactive, true);
    assert.deepStrictEqual(payload.ishikawa_cognitive_centers, []);
  });

  await test('invalid transition throws', async () => {
    assert.throws(() => {
      applyWorkflowAction(
        { status: ISHIKAWA_INVESTIGATION_STATUS.DRAFT, workflow_stage: ISHIKAWA_WORKFLOW_STAGE.DRAFT },
        ISHIKAWA_WORKFLOW_ACTION.APPROVE
      );
    });
  });

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
