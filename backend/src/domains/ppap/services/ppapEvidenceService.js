'use strict';

const db = require('../../../db');
const { v4: uuidv4 } = require('uuid');

async function ensureSubmission(companyId, submissionId) {
  const r = await db.query(
    'SELECT id, status, workflow_stage FROM ppap_submissions WHERE id = $1 AND company_id = $2',
    [submissionId, companyId]
  );
  if (!r.rows[0]) throw new Error('submission not found');
  return r.rows[0];
}

async function listParts(companyId, { limit = 100, offset = 0 } = {}) {
  const r = await db.query(
    `SELECT * FROM ppap_parts WHERE company_id = $1 AND active = true
     ORDER BY part_number LIMIT $2 OFFSET $3`,
    [companyId, Math.min(200, limit), Math.max(0, offset)]
  );
  return r.rows;
}

async function listSuppliers(companyId, { limit = 100, offset = 0 } = {}) {
  const r = await db.query(
    `SELECT * FROM ppap_suppliers WHERE company_id = $1 AND active = true
     ORDER BY supplier_code LIMIT $2 OFFSET $3`,
    [companyId, Math.min(200, limit), Math.max(0, offset)]
  );
  return r.rows;
}

async function listCustomers(companyId, { limit = 100, offset = 0 } = {}) {
  const r = await db.query(
    `SELECT * FROM ppap_customers WHERE company_id = $1 AND active = true
     ORDER BY customer_code LIMIT $2 OFFSET $3`,
    [companyId, Math.min(200, limit), Math.max(0, offset)]
  );
  return r.rows;
}

async function upsertPsw(companyId, submissionId, data = {}) {
  await ensureSubmission(companyId, submissionId);
  const existing = await db.query(
    'SELECT id FROM ppap_psw_records WHERE submission_id = $1 AND company_id = $2',
    [submissionId, companyId]
  );
  if (existing.rows[0]) {
    const r = await db.query(
      `UPDATE ppap_psw_records SET
         warrant_number = COALESCE($3, warrant_number),
         warrant_date = COALESCE($4, warrant_date),
         signatory_name = COALESCE($5, signatory_name),
         signatory_title = COALESCE($6, signatory_title),
         customer_approval_required = COALESCE($7, customer_approval_required),
         approved = COALESCE($8, approved),
         approved_at = CASE WHEN $8 = true THEN now() ELSE approved_at END,
         updated_at = now()
       WHERE submission_id = $1 AND company_id = $2 RETURNING *`,
      [
        submissionId,
        companyId,
        data.warrant_number || null,
        data.warrant_date || null,
        data.signatory_name || null,
        data.signatory_title || null,
        data.customer_approval_required,
        data.approved
      ]
    );
    return r.rows[0];
  }
  const id = uuidv4();
  const r = await db.query(
    `INSERT INTO ppap_psw_records
      (id, company_id, submission_id, warrant_number, warrant_date, signatory_name, signatory_title,
       customer_approval_required, approved, approved_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
    [
      id,
      companyId,
      submissionId,
      data.warrant_number || null,
      data.warrant_date || null,
      data.signatory_name || null,
      data.signatory_title || null,
      data.customer_approval_required !== false,
      data.approved === true,
      data.approved === true ? new Date() : null
    ]
  );
  return r.rows[0];
}

async function addDimensionalResult(companyId, submissionId, data = {}) {
  await ensureSubmission(companyId, submissionId);
  if (!data.characteristic_name) throw new Error('characteristic_name required');
  const id = uuidv4();
  const r = await db.query(
    `INSERT INTO ppap_dimensional_results
      (id, company_id, submission_id, characteristic_name, nominal, tolerance_upper, tolerance_lower,
       measured_value, unit, result, inspection_date)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
    [
      id,
      companyId,
      submissionId,
      data.characteristic_name,
      data.nominal ?? null,
      data.tolerance_upper ?? null,
      data.tolerance_lower ?? null,
      data.measured_value ?? null,
      data.unit || 'mm',
      data.result || 'conforming',
      data.inspection_date || null
    ]
  );
  return r.rows[0];
}

async function addMaterialCertification(companyId, submissionId, data = {}) {
  await ensureSubmission(companyId, submissionId);
  if (!data.cert_type || !data.cert_number) throw new Error('cert_type and cert_number required');
  const id = uuidv4();
  const r = await db.query(
    `INSERT INTO ppap_material_certifications
      (id, company_id, submission_id, cert_type, cert_number, issuer, issue_date, expiry_date, material_grade)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
    [
      id,
      companyId,
      submissionId,
      data.cert_type,
      data.cert_number,
      data.issuer || null,
      data.issue_date || null,
      data.expiry_date || null,
      data.material_grade || null
    ]
  );
  return r.rows[0];
}

async function addCapabilityStudy(companyId, submissionId, data = {}) {
  await ensureSubmission(companyId, submissionId);
  if (!data.characteristic_name) throw new Error('characteristic_name required');
  const id = uuidv4();
  const r = await db.query(
    `INSERT INTO ppap_capability_studies
      (id, company_id, submission_id, characteristic_name, cp, cpk, pp, ppk, sample_size, usl, lsl, study_date)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
    [
      id,
      companyId,
      submissionId,
      data.characteristic_name,
      data.cp ?? null,
      data.cpk ?? null,
      data.pp ?? null,
      data.ppk ?? null,
      data.sample_size ?? null,
      data.usl ?? null,
      data.lsl ?? null,
      data.study_date || null
    ]
  );
  return r.rows[0];
}

async function addAppearanceApproval(companyId, submissionId, data = {}) {
  await ensureSubmission(companyId, submissionId);
  const id = uuidv4();
  const r = await db.query(
    `INSERT INTO ppap_appearance_approvals
      (id, company_id, submission_id, standard_reference, result, inspector_name, inspection_date, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [
      id,
      companyId,
      submissionId,
      data.standard_reference || null,
      data.result || 'approved',
      data.inspector_name || null,
      data.inspection_date || null,
      data.notes || null
    ]
  );
  return r.rows[0];
}

async function addPerformanceTest(companyId, submissionId, data = {}) {
  await ensureSubmission(companyId, submissionId);
  if (!data.test_name) throw new Error('test_name required');
  const id = uuidv4();
  const r = await db.query(
    `INSERT INTO ppap_performance_tests
      (id, company_id, submission_id, test_name, test_method, specification, measured_value, result, test_date)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
    [
      id,
      companyId,
      submissionId,
      data.test_name,
      data.test_method || null,
      data.specification || null,
      data.measured_value != null ? String(data.measured_value) : null,
      data.result || 'pass',
      data.test_date || null
    ]
  );
  return r.rows[0];
}

async function addEngineeringChange(companyId, submissionId, data = {}) {
  await ensureSubmission(companyId, submissionId);
  if (!data.ecn_number || !data.change_description) {
    throw new Error('ecn_number and change_description required');
  }
  const id = uuidv4();
  const r = await db.query(
    `INSERT INTO ppap_engineering_changes
      (id, company_id, submission_id, ecn_number, change_description, change_date, approved_by_customer)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [
      id,
      companyId,
      submissionId,
      data.ecn_number,
      data.change_description,
      data.change_date || null,
      data.approved_by_customer === true
    ]
  );
  return r.rows[0];
}

async function addAttachedDocument(companyId, submissionId, data = {}) {
  await ensureSubmission(companyId, submissionId);
  if (!data.document_type || !data.title) throw new Error('document_type and title required');
  const id = uuidv4();
  const r = await db.query(
    `INSERT INTO ppap_attached_documents
      (id, company_id, submission_id, document_type, title, file_ref, aiag_element_number, version, uploaded_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
    [
      id,
      companyId,
      submissionId,
      data.document_type,
      data.title,
      data.file_ref || null,
      data.aiag_element_number ?? null,
      data.version || null,
      data.uploaded_by || null
    ]
  );
  return r.rows[0];
}

module.exports = {
  listParts,
  listSuppliers,
  listCustomers,
  upsertPsw,
  addDimensionalResult,
  addMaterialCertification,
  addCapabilityStudy,
  addAppearanceApproval,
  addPerformanceTest,
  addEngineeringChange,
  addAttachedDocument
};
