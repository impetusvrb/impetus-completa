'use strict';

const db = require('../../../db');
const { v4: uuidv4 } = require('uuid');
const { MSA_STUDY_KIND } = require('../semantics/msaCoreSemantics');

async function insertStudyTypeExtension(client, companyId, studyId, studyKind, typeData = {}) {
  const id = uuidv4();
  switch (studyKind) {
    case MSA_STUDY_KIND.VARIABLE_GRR:
      await client.query(
        `INSERT INTO msa_variable_grr_studies
          (id, company_id, study_id, grr_method, num_operators, num_parts, num_trials, tolerance_usl, tolerance_lsl)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [
          id,
          companyId,
          studyId,
          typeData.grr_method || 'crossed',
          typeData.num_operators ?? 3,
          typeData.num_parts ?? 10,
          typeData.num_trials ?? 3,
          typeData.tolerance_usl ?? null,
          typeData.tolerance_lsl ?? null
        ]
      );
      break;
    case MSA_STUDY_KIND.ATTRIBUTE_AGREEMENT:
      await client.query(
        `INSERT INTO msa_attribute_agreement_studies
          (id, company_id, study_id, agreement_method, num_operators, num_parts, num_trials)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [
          id,
          companyId,
          studyId,
          typeData.agreement_method || 'kappa',
          typeData.num_operators ?? 3,
          typeData.num_parts ?? 30,
          typeData.num_trials ?? 3
        ]
      );
      break;
    case MSA_STUDY_KIND.BIAS:
      await client.query(
        `INSERT INTO msa_bias_studies (id, company_id, study_id, reference_value, num_measurements)
         VALUES ($1,$2,$3,$4,$5)`,
        [id, companyId, studyId, typeData.reference_value, typeData.num_measurements ?? 15]
      );
      break;
    case MSA_STUDY_KIND.LINEARITY:
      await client.query(
        `INSERT INTO msa_linearity_studies
          (id, company_id, study_id, range_min, range_max, num_reference_points, measurements_per_point)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [
          id,
          companyId,
          studyId,
          typeData.range_min,
          typeData.range_max,
          typeData.num_reference_points ?? 5,
          typeData.measurements_per_point ?? 12
        ]
      );
      break;
    case MSA_STUDY_KIND.STABILITY:
      await client.query(
        `INSERT INTO msa_stability_studies
          (id, company_id, study_id, reference_value, subgroup_size, num_subgroups, chart_type)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [
          id,
          companyId,
          studyId,
          typeData.reference_value,
          typeData.subgroup_size ?? 1,
          typeData.num_subgroups ?? 25,
          typeData.chart_type || 'i_mr'
        ]
      );
      break;
    default:
      throw new Error(`unknown study_kind: ${studyKind}`);
  }
}

async function loadStudyTypeExtension(companyId, studyId) {
  const queries = {
    variable_grr: db.query(
      'SELECT * FROM msa_variable_grr_studies WHERE study_id = $1 AND company_id = $2',
      [studyId, companyId]
    ),
    attribute_agreement: db.query(
      'SELECT * FROM msa_attribute_agreement_studies WHERE study_id = $1 AND company_id = $2',
      [studyId, companyId]
    ),
    bias: db.query('SELECT * FROM msa_bias_studies WHERE study_id = $1 AND company_id = $2', [studyId, companyId]),
    linearity: db.query('SELECT * FROM msa_linearity_studies WHERE study_id = $1 AND company_id = $2', [
      studyId,
      companyId
    ]),
    stability: db.query('SELECT * FROM msa_stability_studies WHERE study_id = $1 AND company_id = $2', [
      studyId,
      companyId
    ])
  };

  const [variableGrr, attribute, bias, linearity, stability] = await Promise.all(Object.values(queries));

  if (variableGrr.rows[0]) return { study_kind: MSA_STUDY_KIND.VARIABLE_GRR, extension: variableGrr.rows[0] };
  if (attribute.rows[0]) return { study_kind: MSA_STUDY_KIND.ATTRIBUTE_AGREEMENT, extension: attribute.rows[0] };
  if (bias.rows[0]) return { study_kind: MSA_STUDY_KIND.BIAS, extension: bias.rows[0] };
  if (linearity.rows[0]) return { study_kind: MSA_STUDY_KIND.LINEARITY, extension: linearity.rows[0] };
  if (stability.rows[0]) return { study_kind: MSA_STUDY_KIND.STABILITY, extension: stability.rows[0] };
  return { study_kind: null, extension: null };
}

async function addMeasurementSample(companyId, studyId, data) {
  const id = uuidv4();
  const r = await db.query(
    `INSERT INTO msa_measurement_samples
      (id, company_id, study_id, operator_id, part_id, trial_number, measured_value, attribute_result, measured_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
    [
      id,
      companyId,
      studyId,
      data.operator_id ?? null,
      data.part_id ?? null,
      data.trial_number ?? 1,
      data.measured_value ?? null,
      data.attribute_result ?? null,
      data.measured_at ?? null
    ]
  );
  return r.rows[0];
}

async function addAttachedDocument(companyId, studyId, data, userId) {
  const id = uuidv4();
  const r = await db.query(
    `INSERT INTO msa_attached_documents
      (id, company_id, study_id, document_type, title, file_ref, version, uploaded_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [
      id,
      companyId,
      studyId,
      data.document_type,
      data.title,
      data.file_ref ?? null,
      data.version ?? null,
      userId ?? null
    ]
  );
  return r.rows[0];
}

async function addStudyApproval(companyId, studyId, data) {
  const id = uuidv4();
  const r = await db.query(
    `INSERT INTO msa_study_approvals
      (id, company_id, study_id, approval_role, approver_name, approved, approved_at, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [
      id,
      companyId,
      studyId,
      data.approval_role,
      data.approver_name,
      data.approved === true,
      data.approved === true ? new Date().toISOString() : null,
      data.notes ?? null
    ]
  );
  return r.rows[0];
}

async function linkStudyOperator(companyId, studyId, operatorId, roleLabel = 'appraiser') {
  const study = await db.query('SELECT id FROM msa_measurement_studies WHERE id = $1 AND company_id = $2', [
    studyId,
    companyId
  ]);
  if (!study.rows[0]) throw new Error('study not found');
  const op = await db.query('SELECT id FROM msa_operators WHERE id = $1 AND company_id = $2', [
    operatorId,
    companyId
  ]);
  if (!op.rows[0]) throw new Error('operator not found');
  const id = uuidv4();
  const r = await db.query(
    `INSERT INTO msa_study_operators (id, company_id, study_id, operator_id, role_label)
     VALUES ($1,$2,$3,$4,$5)
     ON CONFLICT (study_id, operator_id) DO NOTHING
     RETURNING *`,
    [id, companyId, studyId, operatorId, roleLabel]
  );
  return r.rows[0] || { study_id: studyId, operator_id: operatorId, role_label: roleLabel };
}

async function linkStudyPart(companyId, studyId, partId, partSequence = 1) {
  const study = await db.query('SELECT id FROM msa_measurement_studies WHERE id = $1 AND company_id = $2', [
    studyId,
    companyId
  ]);
  if (!study.rows[0]) throw new Error('study not found');
  const part = await db.query('SELECT id FROM msa_parts WHERE id = $1 AND company_id = $2', [partId, companyId]);
  if (!part.rows[0]) throw new Error('part not found');
  const id = uuidv4();
  const r = await db.query(
    `INSERT INTO msa_study_parts (id, company_id, study_id, part_id, part_sequence)
     VALUES ($1,$2,$3,$4,$5)
     ON CONFLICT (study_id, part_id) DO NOTHING
     RETURNING *`,
    [id, companyId, studyId, partId, partSequence]
  );
  return r.rows[0] || { study_id: studyId, part_id: partId, part_sequence: partSequence };
}

module.exports = {
  insertStudyTypeExtension,
  loadStudyTypeExtension,
  addMeasurementSample,
  addAttachedDocument,
  addStudyApproval,
  linkStudyOperator,
  linkStudyPart
};
