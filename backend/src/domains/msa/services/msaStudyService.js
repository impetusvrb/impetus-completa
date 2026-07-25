'use strict';

const db = require('../../../db');
const { v4: uuidv4 } = require('uuid');
const {
  MSA_STUDY_STATUS,
  MSA_WORKFLOW_ACTION,
  initialStudyState
} = require('../semantics/msaCoreSemantics');
const {
  applyWorkflowAction,
  validateStudyPayload,
  canEditStudy
} = require('../workflow/msaWorkflowEngine');
const { ensureGauge, ensureInstrument } = require('./msaMasterDataService');
const {
  insertStudyTypeExtension,
  loadStudyTypeExtension
} = require('./msaStudyEvidenceService');

async function appendStudyHistory(client, companyId, studyId, transition, actorId, notes) {
  await client.query(
    `INSERT INTO msa_study_history
      (id, company_id, study_id, from_status, to_status, from_workflow_stage, to_workflow_stage, action, actor_id, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
    [
      uuidv4(),
      companyId,
      studyId,
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

async function getStudyById(companyId, id) {
  const r = await db.query(
    `SELECT s.*, g.gauge_code, g.gauge_name, i.instrument_code
     FROM msa_measurement_studies s
     LEFT JOIN msa_gauges g ON g.id = s.gauge_id
     LEFT JOIN msa_instruments i ON i.id = s.instrument_id
     WHERE s.id = $1 AND s.company_id = $2`,
    [id, companyId]
  );
  return r.rows[0] || null;
}

async function listStudies(companyId, { status, limit = 50, offset = 0 } = {}) {
  const params = [companyId];
  let sql = `
    SELECT s.id, s.study_number, s.study_title, s.characteristic_name,
           s.status, s.workflow_stage, s.planned_at, s.started_at, s.approved_at, s.created_at,
           g.gauge_code
    FROM msa_measurement_studies s
    LEFT JOIN msa_gauges g ON g.id = s.gauge_id
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

async function getStudyDetail(companyId, id) {
  const study = await getStudyById(companyId, id);
  if (!study) return null;

  const [typeExt, operators, parts, samples, approvals, history, documents] = await Promise.all([
    loadStudyTypeExtension(companyId, id),
    db.query(
      `SELECT so.*, o.operator_code, o.operator_name
       FROM msa_study_operators so
       JOIN msa_operators o ON o.id = so.operator_id
       WHERE so.study_id = $1 AND so.company_id = $2`,
      [id, companyId]
    ),
    db.query(
      `SELECT sp.*, p.part_number, p.part_name
       FROM msa_study_parts sp
       JOIN msa_parts p ON p.id = sp.part_id
       WHERE sp.study_id = $1 AND sp.company_id = $2`,
      [id, companyId]
    ),
    db.query(
      'SELECT * FROM msa_measurement_samples WHERE study_id = $1 AND company_id = $2 ORDER BY trial_number, created_at',
      [id, companyId]
    ),
    db.query('SELECT * FROM msa_study_approvals WHERE study_id = $1 AND company_id = $2 ORDER BY created_at', [
      id,
      companyId
    ]),
    db.query(
      'SELECT * FROM msa_study_history WHERE study_id = $1 AND company_id = $2 ORDER BY created_at DESC',
      [id, companyId]
    ),
    db.query('SELECT * FROM msa_attached_documents WHERE study_id = $1 AND company_id = $2 ORDER BY created_at', [
      id,
      companyId
    ])
  ]);

  return {
    study,
    study_kind: typeExt.study_kind,
    type_extension: typeExt.extension,
    operators: operators.rows,
    parts: parts.rows,
    measurement_samples: samples.rows,
    study_approvals: approvals.rows,
    study_history: history.rows,
    attached_documents: documents.rows
  };
}

async function createStudy(companyId, data, userId) {
  validateStudyPayload(data);
  await ensureGauge(companyId, data.gauge_id);
  await ensureInstrument(companyId, data.instrument_id);

  const init = initialStudyState();
  const studyNumber =
    data.study_number ||
    `MSA-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  const id = uuidv4();
  const typeData = data.type_data || data;

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const r = await client.query(
      `INSERT INTO msa_measurement_studies
        (id, company_id, study_number, study_title, characteristic_name, measurement_unit,
         gauge_id, instrument_id, calibration_reference_id, status, workflow_stage, notes,
         created_by, updated_by,
         quality_inspection_id, ppap_submission_id, ppap_capability_study_id,
         supplier_ref, production_order_ref, spc_chart_ref, capability_study_ref)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$13,$14,$15,$16,$17,$18,$19,$20)
       RETURNING *`,
      [
        id,
        companyId,
        studyNumber,
        data.study_title,
        data.characteristic_name,
        data.measurement_unit ?? null,
        data.gauge_id ?? null,
        data.instrument_id ?? null,
        data.calibration_reference_id ?? null,
        init.status,
        init.workflow_stage,
        data.notes ?? null,
        userId || null,
        data.quality_inspection_id ?? null,
        data.ppap_submission_id ?? null,
        data.ppap_capability_study_id ?? null,
        data.supplier_ref ?? null,
        data.production_order_ref ?? null,
        data.spc_chart_ref ?? null,
        data.capability_study_ref ?? null
      ]
    );

    await insertStudyTypeExtension(client, companyId, id, data.study_kind, typeData);
    await client.query('COMMIT');
    return r.rows[0];
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

async function updateStudy(companyId, id, data, userId) {
  const existing = await getStudyById(companyId, id);
  if (!existing) throw new Error('study not found');
  if (!canEditStudy(existing)) {
    throw new Error('study not editable in current status');
  }

  await ensureGauge(companyId, data.gauge_id);
  await ensureInstrument(companyId, data.instrument_id);

  const fields = [];
  const params = [companyId, id];
  const allowed = [
    'study_title',
    'characteristic_name',
    'measurement_unit',
    'gauge_id',
    'instrument_id',
    'calibration_reference_id',
    'notes',
    'quality_inspection_id',
    'ppap_submission_id',
    'ppap_capability_study_id',
    'supplier_ref',
    'production_order_ref',
    'spc_chart_ref',
    'capability_study_ref'
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
    `UPDATE msa_measurement_studies SET ${fields.join(', ')} WHERE company_id = $1 AND id = $2 RETURNING *`,
    params
  );
  return r.rows[0];
}

async function runWorkflowAction(companyId, id, action, { userId, notes, rejection_reason } = {}) {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const res = await client.query(
      'SELECT * FROM msa_measurement_studies WHERE id = $1 AND company_id = $2 FOR UPDATE',
      [id, companyId]
    );
    const study = res.rows[0];
    if (!study) throw new Error('study not found');

    const transition = applyWorkflowAction(study, action, { userId, notes });

    const updateFields = [
      'status = $1',
      'workflow_stage = $2',
      'updated_by = $3',
      'updated_at = now()'
    ];
    const updateParams = [transition.status, transition.workflow_stage, userId || null];
    let idx = 4;

    const tsFields = ['planned_at', 'started_at', 'reviewed_at', 'approved_at', 'rejected_at', 'archived_at'];
    for (const field of tsFields) {
      if (transition[field]) {
        updateFields.push(`${field} = $${idx++}`);
        updateParams.push(transition[field]);
      }
    }
    if (action === MSA_WORKFLOW_ACTION.REJECT) {
      updateFields.push(`rejection_reason = $${idx++}`);
      updateParams.push(rejection_reason || notes || 'rejected');
    }
    if (action === MSA_WORKFLOW_ACTION.REOPEN) {
      updateFields.push('rejection_reason = NULL', 'rejected_at = NULL');
    }

    updateParams.push(companyId, id);
    const upd = await client.query(
      `UPDATE msa_measurement_studies SET ${updateFields.join(', ')}
       WHERE company_id = $${idx++} AND id = $${idx} RETURNING *`,
      updateParams
    );

    await appendStudyHistory(client, companyId, id, transition, userId, notes);
    await client.query('COMMIT');
    return upd.rows[0];
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

/** Aprovação API: avança para APPROVAL se em TECHNICAL_REVIEW, depois aprova */
async function approveStudy(companyId, id, ctx = {}) {
  let study = await getStudyById(companyId, id);
  if (!study) throw new Error('study not found');

  if (study.workflow_stage === 'TECHNICAL_REVIEW' && study.status === MSA_STUDY_STATUS.UNDER_REVIEW) {
    study = await runWorkflowAction(companyId, id, MSA_WORKFLOW_ACTION.ADVANCE_APPROVAL, ctx);
  }
  return runWorkflowAction(companyId, id, MSA_WORKFLOW_ACTION.APPROVE, ctx);
}

module.exports = {
  listStudies,
  getStudyDetail,
  getStudyById,
  createStudy,
  updateStudy,
  runWorkflowAction,
  approveStudy
};
