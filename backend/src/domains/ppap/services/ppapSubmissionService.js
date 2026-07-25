'use strict';

const db = require('../../../db');
const { v4: uuidv4 } = require('uuid');
const {
  PPAP_SUBMISSION_STATUS,
  PPAP_WORKFLOW_ACTION,
  initialSubmissionState
} = require('../semantics/ppapCoreSemantics');
const {
  applyWorkflowAction,
  validateSubmissionPayload,
  canEditSubmission
} = require('../workflow/ppapWorkflowEngine');

async function ensurePart(companyId, partId) {
  const r = await db.query(
    'SELECT id FROM ppap_parts WHERE id = $1 AND company_id = $2',
    [partId, companyId]
  );
  if (!r.rows[0]) throw new Error('part not found');
}

async function ensureSupplier(companyId, supplierId) {
  const r = await db.query(
    'SELECT id FROM ppap_suppliers WHERE id = $1 AND company_id = $2',
    [supplierId, companyId]
  );
  if (!r.rows[0]) throw new Error('supplier not found');
}

async function ensureCustomer(companyId, customerId) {
  if (!customerId) return;
  const r = await db.query(
    'SELECT id FROM ppap_customers WHERE id = $1 AND company_id = $2',
    [customerId, companyId]
  );
  if (!r.rows[0]) throw new Error('customer not found');
}

async function getSubmissionById(companyId, id) {
  const r = await db.query(
    `SELECT s.*,
      p.part_number, p.part_name, p.revision AS part_revision,
      sup.supplier_code, sup.supplier_name,
      c.customer_code, c.customer_name
     FROM ppap_submissions s
     JOIN ppap_parts p ON p.id = s.part_id
     JOIN ppap_suppliers sup ON sup.id = s.supplier_id
     LEFT JOIN ppap_customers c ON c.id = s.customer_id
     WHERE s.id = $1 AND s.company_id = $2`,
    [id, companyId]
  );
  return r.rows[0] || null;
}

async function listSubmissions(companyId, { status, limit = 50, offset = 0 } = {}) {
  const params = [companyId];
  let sql = `
    SELECT s.id, s.submission_number, s.status, s.workflow_stage, s.submission_level,
           s.submitted_at, s.approved_at, s.created_at,
           p.part_number, sup.supplier_name
    FROM ppap_submissions s
    JOIN ppap_parts p ON p.id = s.part_id
    JOIN ppap_suppliers sup ON sup.id = s.supplier_id
    WHERE s.company_id = $1`;
  if (status) {
    params.push(String(status).toUpperCase());
    sql += ` AND s.status = $${params.length}`;
  }
  sql += ` ORDER BY s.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
  params.push(Math.min(200, Math.max(1, limit)), Math.max(0, offset));
  const r = await db.query(sql, params);
  return r.rows;
}

async function getSubmissionDetail(companyId, id) {
  const submission = await getSubmissionById(companyId, id);
  if (!submission) return null;

  const [psw, dimensional, material, capability, appearance, performance, ecn, history, documents] =
    await Promise.all([
      db.query('SELECT * FROM ppap_psw_records WHERE submission_id = $1 AND company_id = $2', [id, companyId]),
      db.query('SELECT * FROM ppap_dimensional_results WHERE submission_id = $1 AND company_id = $2 ORDER BY created_at', [id, companyId]),
      db.query('SELECT * FROM ppap_material_certifications WHERE submission_id = $1 AND company_id = $2', [id, companyId]),
      db.query('SELECT * FROM ppap_capability_studies WHERE submission_id = $1 AND company_id = $2', [id, companyId]),
      db.query('SELECT * FROM ppap_appearance_approvals WHERE submission_id = $1 AND company_id = $2', [id, companyId]),
      db.query('SELECT * FROM ppap_performance_tests WHERE submission_id = $1 AND company_id = $2', [id, companyId]),
      db.query('SELECT * FROM ppap_engineering_changes WHERE submission_id = $1 AND company_id = $2', [id, companyId]),
      db.query(
        'SELECT * FROM ppap_approval_history WHERE submission_id = $1 AND company_id = $2 ORDER BY created_at DESC',
        [id, companyId]
      ),
      db.query('SELECT * FROM ppap_attached_documents WHERE submission_id = $1 AND company_id = $2 ORDER BY created_at', [id, companyId])
    ]);

  return {
    submission,
    psw: psw.rows[0] || null,
    dimensional_results: dimensional.rows,
    material_certifications: material.rows,
    capability_studies: capability.rows,
    appearance_approvals: appearance.rows,
    performance_tests: performance.rows,
    engineering_changes: ecn.rows,
    approval_history: history.rows,
    attached_documents: documents.rows
  };
}

async function appendApprovalHistory(client, companyId, submissionId, transition, actorId, notes) {
  await client.query(
    `INSERT INTO ppap_approval_history
      (id, company_id, submission_id, from_status, to_status, from_workflow_stage, to_workflow_stage, action, actor_id, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
    [
      uuidv4(),
      companyId,
      submissionId,
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

async function createSubmission(companyId, data, userId) {
  validateSubmissionPayload(data);
  await ensurePart(companyId, data.part_id);
  await ensureSupplier(companyId, data.supplier_id);
  await ensureCustomer(companyId, data.customer_id);

  const init = initialSubmissionState();
  const submissionNumber =
    data.submission_number ||
    `PPAP-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  const id = uuidv4();

  const r = await db.query(
    `INSERT INTO ppap_submissions
      (id, company_id, submission_number, part_id, supplier_id, customer_id, submission_level,
       status, workflow_stage, notes, created_by, updated_by,
       quality_inspection_id, raw_material_lot_id, raw_material_receipt_id,
       fmea_study_ref, ishikawa_analysis_ref, supplier_scorecard_ref)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$11,$12,$13,$14,$15,$16,$17)
     RETURNING *`,
    [
      id,
      companyId,
      submissionNumber,
      data.part_id,
      data.supplier_id,
      data.customer_id || null,
      data.submission_level,
      init.status,
      init.workflow_stage,
      data.notes || null,
      userId || null,
      data.quality_inspection_id || null,
      data.raw_material_lot_id || null,
      data.raw_material_receipt_id || null,
      data.fmea_study_ref || null,
      data.ishikawa_analysis_ref || null,
      data.supplier_scorecard_ref || null
    ]
  );

  return r.rows[0];
}

async function updateSubmission(companyId, id, data, userId) {
  const existing = await getSubmissionById(companyId, id);
  if (!existing) throw new Error('submission not found');
  if (!canEditSubmission(existing)) {
    throw new Error('submission not editable in current status');
  }

  const fields = [];
  const params = [companyId, id];
  const allowed = [
    'customer_id',
    'submission_level',
    'notes',
    'quality_inspection_id',
    'raw_material_lot_id',
    'raw_material_receipt_id',
    'fmea_study_ref',
    'ishikawa_analysis_ref',
    'supplier_scorecard_ref'
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
    `UPDATE ppap_submissions SET ${fields.join(', ')} WHERE company_id = $1 AND id = $2 RETURNING *`,
    params
  );
  return r.rows[0];
}

async function runWorkflowAction(companyId, id, action, { userId, notes, rejection_reason } = {}) {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const res = await client.query(
      'SELECT * FROM ppap_submissions WHERE id = $1 AND company_id = $2 FOR UPDATE',
      [id, companyId]
    );
    const submission = res.rows[0];
    if (!submission) throw new Error('submission not found');

    const transition = applyWorkflowAction(submission, action, { userId, notes });

    const updateFields = [
      'status = $1',
      'workflow_stage = $2',
      'updated_by = $3',
      'updated_at = now()'
    ];
    const updateParams = [transition.status, transition.workflow_stage, userId || null];
    let idx = 4;

    if (transition.submitted_at) {
      updateFields.push(`submitted_at = $${idx++}`);
      updateParams.push(transition.submitted_at);
    }
    if (transition.approved_at) {
      updateFields.push(`approved_at = $${idx++}`, `released_at = $${idx++}`);
      updateParams.push(transition.approved_at, transition.released_at);
    }
    if (transition.rejected_at) {
      updateFields.push(`rejected_at = $${idx++}`);
      updateParams.push(transition.rejected_at);
    }
    if (action === PPAP_WORKFLOW_ACTION.REJECT) {
      updateFields.push(`rejection_reason = $${idx++}`);
      updateParams.push(rejection_reason || notes || 'rejected');
    }
    if (action === PPAP_WORKFLOW_ACTION.RESUBMIT) {
      updateFields.push('rejection_reason = NULL', 'rejected_at = NULL');
    }
    if (transition.expires_at) {
      updateFields.push(`expires_at = $${idx++}`);
      updateParams.push(transition.expires_at);
    }

    updateParams.push(companyId, id);
    const upd = await client.query(
      `UPDATE ppap_submissions SET ${updateFields.join(', ')}
       WHERE company_id = $${idx++} AND id = $${idx} RETURNING *`,
      updateParams
    );

    await appendApprovalHistory(client, companyId, id, transition, userId, notes);
    await client.query('COMMIT');
    return upd.rows[0];
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

/** Helpers para testes / seed */
async function createPart(companyId, data) {
  const id = uuidv4();
  const r = await db.query(
    `INSERT INTO ppap_parts (id, company_id, part_number, part_name, revision)
     VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [id, companyId, data.part_number, data.part_name, data.revision || 'A']
  );
  return r.rows[0];
}

async function createSupplier(companyId, data) {
  const id = uuidv4();
  const r = await db.query(
    `INSERT INTO ppap_suppliers (id, company_id, supplier_code, supplier_name)
     VALUES ($1,$2,$3,$4) RETURNING *`,
    [id, companyId, data.supplier_code, data.supplier_name]
  );
  return r.rows[0];
}

async function createCustomer(companyId, data) {
  const id = uuidv4();
  const r = await db.query(
    `INSERT INTO ppap_customers (id, company_id, customer_code, customer_name)
     VALUES ($1,$2,$3,$4) RETURNING *`,
    [id, companyId, data.customer_code, data.customer_name]
  );
  return r.rows[0];
}

module.exports = {
  listSubmissions,
  getSubmissionDetail,
  createSubmission,
  updateSubmission,
  runWorkflowAction,
  createPart,
  createSupplier,
  createCustomer,
  getSubmissionById
};
