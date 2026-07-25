'use strict';

const db = require('../../../db');
const { v4: uuidv4 } = require('uuid');
const { initialInvestigationState } = require('../semantics/ishikawaCoreSemantics');
const {
  applyWorkflowAction,
  validateInvestigationPayload,
  canEditInvestigation
} = require('../workflow/ishikawaWorkflowEngine');
const { createFishboneDiagram, loadFishboneDiagram, listFiveWhyAnalyses } = require('./ishikawaFishboneService');

async function appendHistory(client, companyId, investigationId, transition, actorId, notes) {
  await client.query(
    `INSERT INTO ishikawa_investigation_history
      (id, company_id, investigation_id, from_status, to_status, from_workflow_stage, to_workflow_stage, action, actor_id, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
    [
      uuidv4(),
      companyId,
      investigationId,
      transition.from_status,
      transition.to_status,
      transition.from_workflow_stage,
      transition.to_workflow_stage,
      transition.action,
      actorId || null,
      notes || null
    ]
  );
}

async function getInvestigationById(companyId, id) {
  const r = await db.query(
    'SELECT * FROM ishikawa_root_cause_investigations WHERE id = $1 AND company_id = $2',
    [id, companyId]
  );
  return r.rows[0] || null;
}

async function listInvestigations(companyId, { status, limit = 50, offset = 0 } = {}) {
  const params = [companyId];
  let sql = `
    SELECT id, investigation_number, title, problem_statement, status, workflow_stage,
           started_at, approved_at, closed_at, created_at
    FROM ishikawa_root_cause_investigations WHERE company_id = $1`;
  if (status) {
    params.push(String(status).toUpperCase());
    sql += ` AND status = $${params.length}`;
  }
  sql += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
  params.push(Math.min(200, Math.max(1, limit)), Math.max(0, offset));
  const r = await db.query(sql, params);
  return r.rows;
}

async function loadRelatedCollections(companyId, investigationId) {
  const [team, evidence, corrective, preventive, verification, approvals, documents, history] =
    await Promise.all([
      db.query('SELECT * FROM ishikawa_investigation_team WHERE investigation_id = $1 AND company_id = $2', [
        investigationId,
        companyId
      ]),
      db.query('SELECT * FROM ishikawa_investigation_evidence WHERE investigation_id = $1 AND company_id = $2 ORDER BY created_at', [
        investigationId,
        companyId
      ]),
      db.query('SELECT * FROM ishikawa_corrective_actions WHERE investigation_id = $1 AND company_id = $2 ORDER BY created_at', [
        investigationId,
        companyId
      ]),
      db.query('SELECT * FROM ishikawa_preventive_actions WHERE investigation_id = $1 AND company_id = $2 ORDER BY created_at', [
        investigationId,
        companyId
      ]),
      db.query('SELECT * FROM ishikawa_verification_results WHERE investigation_id = $1 AND company_id = $2 ORDER BY created_at', [
        investigationId,
        companyId
      ]),
      db.query('SELECT * FROM ishikawa_investigation_approvals WHERE investigation_id = $1 AND company_id = $2 ORDER BY created_at', [
        investigationId,
        companyId
      ]),
      db.query('SELECT * FROM ishikawa_attached_documents WHERE investigation_id = $1 AND company_id = $2 ORDER BY created_at', [
        investigationId,
        companyId
      ]),
      db.query(
        'SELECT * FROM ishikawa_investigation_history WHERE investigation_id = $1 AND company_id = $2 ORDER BY created_at DESC',
        [investigationId, companyId]
      )
    ]);

  return {
    team: team.rows,
    evidence: evidence.rows,
    corrective_actions: corrective.rows,
    preventive_actions: preventive.rows,
    verification_results: verification.rows,
    approvals: approvals.rows,
    attached_documents: documents.rows,
    history: history.rows
  };
}

async function getInvestigationDetail(companyId, id) {
  const investigation = await getInvestigationById(companyId, id);
  if (!investigation) return null;

  const [fishbone, five_whys, related] = await Promise.all([
    loadFishboneDiagram(companyId, id),
    listFiveWhyAnalyses(companyId, id),
    loadRelatedCollections(companyId, id)
  ]);

  return {
    investigation,
    fishbone,
    five_whys,
    ...related
  };
}

async function createInvestigation(companyId, data, userId) {
  validateInvestigationPayload(data);
  const init = initialInvestigationState();
  const investigationNumber =
    data.investigation_number ||
    `ISH-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  const id = uuidv4();
  const effectLabel = data.effect_description || data.title;

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const r = await client.query(
      `INSERT INTO ishikawa_root_cause_investigations
        (id, company_id, investigation_number, title, problem_statement, effect_description,
         status, workflow_stage, notes, created_by, updated_by,
         quality_inspection_id, ncr_workflow_instance_id, capa_workflow_instance_id,
         ppap_submission_id, msa_study_id, supplier_ref, part_ref)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$10,$11,$12,$13,$14,$15,$16,$17)
       RETURNING *`,
      [
        id,
        companyId,
        investigationNumber,
        data.title,
        data.problem_statement,
        data.effect_description ?? null,
        init.status,
        init.workflow_stage,
        data.notes ?? null,
        userId || null,
        data.quality_inspection_id ?? null,
        data.ncr_workflow_instance_id ?? null,
        data.capa_workflow_instance_id ?? null,
        data.ppap_submission_id ?? null,
        data.msa_study_id ?? null,
        data.supplier_ref ?? null,
        data.part_ref ?? null
      ]
    );

    await createFishboneDiagram(client, companyId, id, effectLabel);
    await client.query('COMMIT');
    return r.rows[0];
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

async function updateInvestigation(companyId, id, data, userId) {
  const existing = await getInvestigationById(companyId, id);
  if (!existing) throw new Error('investigation not found');
  if (!canEditInvestigation(existing)) {
    throw new Error('investigation not editable in current status');
  }

  const fields = [];
  const params = [companyId, id];
  const allowed = [
    'title',
    'problem_statement',
    'effect_description',
    'root_cause_summary',
    'notes',
    'quality_inspection_id',
    'ncr_workflow_instance_id',
    'capa_workflow_instance_id',
    'ppap_submission_id',
    'msa_study_id',
    'supplier_ref',
    'part_ref'
  ];

  for (const key of allowed) {
    if (data[key] !== undefined) {
      params.push(data[key]);
      fields.push(`${key} = $${params.length}`);
    }
  }
  if (!fields.length) return existing;

  params.push(userId || null);
  fields.push(`updated_by = $${params.length}`, 'updated_at = now()');

  const r = await db.query(
    `UPDATE ishikawa_root_cause_investigations SET ${fields.join(', ')}
     WHERE company_id = $1 AND id = $2 RETURNING *`,
    params
  );
  return r.rows[0];
}

async function runWorkflowAction(companyId, id, action, { userId, notes, rejection_reason, root_cause_summary } = {}) {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const res = await client.query(
      'SELECT * FROM ishikawa_root_cause_investigations WHERE id = $1 AND company_id = $2 FOR UPDATE',
      [id, companyId]
    );
    const investigation = res.rows[0];
    if (!investigation) throw new Error('investigation not found');

    const transition = applyWorkflowAction(investigation, action, { userId, notes });

    const updateFields = ['status = $1', 'workflow_stage = $2', 'updated_by = $3', 'updated_at = now()'];
    const updateParams = [transition.status, transition.workflow_stage, userId || null];
    let idx = 4;

    const tsFields = [
      'started_at',
      'root_cause_defined_at',
      'actions_defined_at',
      'submitted_for_approval_at',
      'approved_at',
      'rejected_at',
      'closed_at',
      'archived_at'
    ];
    for (const field of tsFields) {
      if (transition[field]) {
        updateFields.push(`${field} = $${idx++}`);
        updateParams.push(transition[field]);
      }
    }
    if (action === 'reject') {
      updateFields.push(`rejection_reason = $${idx++}`);
      updateParams.push(rejection_reason || notes || 'rejected');
    }
    if (action === 'reopen') {
      updateFields.push('rejection_reason = NULL', 'rejected_at = NULL');
    }
    if (action === 'define_root_cause' && root_cause_summary) {
      updateFields.push(`root_cause_summary = $${idx++}`);
      updateParams.push(root_cause_summary);
    }

    updateParams.push(companyId, id);
    const upd = await client.query(
      `UPDATE ishikawa_root_cause_investigations SET ${updateFields.join(', ')}
       WHERE company_id = $${idx++} AND id = $${idx} RETURNING *`,
      updateParams
    );

    await appendHistory(client, companyId, id, transition, userId, notes);
    await client.query('COMMIT');
    return upd.rows[0];
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

async function approveInvestigation(companyId, id, ctx = {}) {
  return runWorkflowAction(companyId, id, 'approve', ctx);
}

async function addTeamMember(companyId, investigationId, data) {
  if (!data.member_name || !data.member_role) throw new Error('member_name and member_role required');
  const r = await db.query(
    `INSERT INTO ishikawa_investigation_team
      (id, company_id, investigation_id, member_name, member_role, user_id, is_lead)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     ON CONFLICT (investigation_id, member_name, member_role) DO UPDATE SET is_lead = EXCLUDED.is_lead
     RETURNING *`,
    [
      uuidv4(),
      companyId,
      investigationId,
      data.member_name,
      data.member_role,
      data.user_id ?? null,
      data.is_lead === true
    ]
  );
  return r.rows[0];
}

async function addEvidence(companyId, investigationId, data) {
  if (!data.evidence_type || !data.description) throw new Error('evidence_type and description required');
  const r = await db.query(
    `INSERT INTO ishikawa_investigation_evidence
      (id, company_id, investigation_id, evidence_type, description, source_ref, collected_at, collected_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [
      uuidv4(),
      companyId,
      investigationId,
      data.evidence_type,
      data.description,
      data.source_ref ?? null,
      data.collected_at ?? null,
      data.collected_by ?? null
    ]
  );
  return r.rows[0];
}

async function addCorrectiveAction(companyId, investigationId, data) {
  if (!data.action_title || !data.action_description) throw new Error('action_title and action_description required');
  const r = await db.query(
    `INSERT INTO ishikawa_corrective_actions
      (id, company_id, investigation_id, action_title, action_description, responsible_name, due_date, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [
      uuidv4(),
      companyId,
      investigationId,
      data.action_title,
      data.action_description,
      data.responsible_name ?? null,
      data.due_date ?? null,
      data.status || 'open'
    ]
  );
  return r.rows[0];
}

async function addPreventiveAction(companyId, investigationId, data) {
  if (!data.action_title || !data.action_description) throw new Error('action_title and action_description required');
  const r = await db.query(
    `INSERT INTO ishikawa_preventive_actions
      (id, company_id, investigation_id, action_title, action_description, responsible_name, due_date, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [
      uuidv4(),
      companyId,
      investigationId,
      data.action_title,
      data.action_description,
      data.responsible_name ?? null,
      data.due_date ?? null,
      data.status || 'open'
    ]
  );
  return r.rows[0];
}

async function addVerificationResult(companyId, investigationId, data) {
  if (!data.verification_method || !data.result_summary) {
    throw new Error('verification_method and result_summary required');
  }
  const r = await db.query(
    `INSERT INTO ishikawa_verification_results
      (id, company_id, investigation_id, verification_method, result_summary, effective, verified_at, verified_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [
      uuidv4(),
      companyId,
      investigationId,
      data.verification_method,
      data.result_summary,
      data.effective ?? null,
      data.verified_at ?? null,
      data.verified_by ?? null
    ]
  );
  return r.rows[0];
}

async function addAttachedDocument(companyId, investigationId, data) {
  if (!data.document_name || !data.document_ref) throw new Error('document_name and document_ref required');
  const r = await db.query(
    `INSERT INTO ishikawa_attached_documents
      (id, company_id, investigation_id, document_name, document_ref, mime_type, uploaded_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [
      uuidv4(),
      companyId,
      investigationId,
      data.document_name,
      data.document_ref,
      data.mime_type ?? null,
      data.uploaded_by ?? null
    ]
  );
  return r.rows[0];
}

module.exports = {
  listInvestigations,
  getInvestigationDetail,
  getInvestigationById,
  createInvestigation,
  updateInvestigation,
  runWorkflowAction,
  approveInvestigation,
  addTeamMember,
  addEvidence,
  addCorrectiveAction,
  addPreventiveAction,
  addVerificationResult,
  addAttachedDocument
};
