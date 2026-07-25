'use strict';

/**
 * GF-012 — Cenário piloto operacional MSA (enablement, sem alterar runtime).
 */
const db = require('../../../db');
const masterDataService = require('./msaMasterDataService');
const studyService = require('./msaStudyService');
const evidenceService = require('./msaStudyEvidenceService');
const { MSA_STUDY_STATUS, MSA_STUDY_KIND } = require('../semantics/msaCoreSemantics');
const { MSA_WORKFLOW_ACTION } = require('../workflow/msaWorkflowEngine');

async function tryFindPpapSubmissionId(companyId) {
  try {
    const r = await db.query('SELECT id FROM ppap_submissions WHERE company_id = $1 ORDER BY created_at DESC LIMIT 1', [
      companyId
    ]);
    return r.rows[0]?.id || null;
  } catch {
    return null;
  }
}

async function tryFindQualityInspectionId(companyId) {
  try {
    const r = await db.query(
      'SELECT id FROM quality_inspections WHERE company_id = $1 ORDER BY created_at DESC LIMIT 1',
      [companyId]
    );
    return r.rows[0]?.id || null;
  } catch {
    return null;
  }
}

async function runStudyWorkflowToApproved(companyId, studyId, userId = null) {
  let study = await studyService.runWorkflowAction(companyId, studyId, MSA_WORKFLOW_ACTION.PLAN, { userId });
  study = await studyService.runWorkflowAction(companyId, studyId, MSA_WORKFLOW_ACTION.START, { userId });
  study = await studyService.runWorkflowAction(companyId, studyId, MSA_WORKFLOW_ACTION.REVIEW, { userId });
  study = await studyService.approveStudy(companyId, studyId, { userId, notes: 'Pilot technical approval' });
  if (study.status !== MSA_STUDY_STATUS.APPROVED) {
    throw new Error(`pilot workflow failed: expected APPROVED, got ${study.status}`);
  }
  return study;
}

/**
 * Executa fluxo piloto: master data → estudos por tipo → evidências → workflow APPROVED.
 */
async function runMsaPilotScenario(companyId, { tag = 'GF-012', userId = null } = {}) {
  const suffix = `${tag}-${Date.now().toString(36)}`.toUpperCase();
  const ppapSubmissionId = await tryFindPpapSubmissionId(companyId);
  const qualityInspectionId = await tryFindQualityInspectionId(companyId);

  const gauge = await masterDataService.createGauge(companyId, {
    gauge_code: `G-${suffix}`,
    gauge_name: `Pilot Caliper ${suffix}`,
    gauge_type: 'variable',
    resolution: 0.01,
    measurement_unit: 'mm',
    calibration_due_date: new Date(Date.now() + 180 * 86400000).toISOString().slice(0, 10)
  });

  const instrument = await masterDataService.createInstrument(companyId, {
    instrument_code: `INS-${suffix}`,
    serial_number: `SN-${suffix}`,
    gauge_id: gauge.id,
    manufacturer: 'Mitutoyo',
    model: '500-196-30'
  });

  const calibrationRef = await masterDataService.createCalibrationReference(companyId, {
    reference_code: `CAL-${suffix}`,
    reference_name: 'Gauge Block Set Class 0',
    nominal_value: 25.0,
    uncertainty: 0.001,
    unit: 'mm',
    certificate_number: `CERT-${suffix}`,
    valid_until: new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10)
  });

  const operators = [];
  for (let i = 1; i <= 3; i += 1) {
    operators.push(
      await masterDataService.createOperator(companyId, {
        operator_code: `OP${i}-${suffix}`,
        operator_name: `Operator ${i} ${suffix}`
      })
    );
  }

  const parts = [];
  for (let i = 1; i <= 3; i += 1) {
    parts.push(
      await masterDataService.createPart(companyId, {
        part_number: `PT-${i}-${suffix}`,
        part_name: `Pilot Part ${i}`,
        revision: 'A',
        nominal_value: 10 + i * 0.5,
        unit: 'mm'
      })
    );
  }

  const integrationRefs = {
    quality_inspection_id: qualityInspectionId,
    ppap_submission_id: ppapSubmissionId,
    supplier_ref: ppapSubmissionId ? `SUP-${suffix}` : null
  };

  let grrStudy = await studyService.createStudy(
    companyId,
    {
      study_title: `Variable GRR Pilot ${suffix}`,
      characteristic_name: 'Hole Diameter A',
      measurement_unit: 'mm',
      study_kind: MSA_STUDY_KIND.VARIABLE_GRR,
      gauge_id: gauge.id,
      instrument_id: instrument.id,
      calibration_reference_id: calibrationRef.id,
      grr_method: 'crossed',
      num_operators: 3,
      num_parts: 3,
      num_trials: 3,
      tolerance_usl: 10.15,
      tolerance_lsl: 9.85,
      notes: `${tag} primary variable GRR pilot study`,
      ...integrationRefs
    },
    userId
  );

  for (const op of operators) {
    await evidenceService.linkStudyOperator(companyId, grrStudy.id, op.id);
  }
  for (let i = 0; i < parts.length; i += 1) {
    await evidenceService.linkStudyPart(companyId, grrStudy.id, parts[i].id, i + 1);
  }

  let opIdx = 0;
  for (const op of operators) {
    for (const part of parts) {
      for (let trial = 1; trial <= 3; trial += 1) {
        await evidenceService.addMeasurementSample(companyId, grrStudy.id, {
          operator_id: op.id,
          part_id: part.id,
          trial_number: trial,
          measured_value: Number(part.nominal_value) + (trial - 2) * 0.01 + opIdx * 0.001
        });
      }
    }
    opIdx += 1;
  }

  await evidenceService.addAttachedDocument(
    companyId,
    grrStudy.id,
    {
      document_type: 'study_plan',
      title: 'MSA Study Plan Rev A',
      file_ref: `ref://msa/${suffix}/study-plan.pdf`,
      version: 'A'
    },
    userId
  );
  await evidenceService.addAttachedDocument(
    companyId,
    grrStudy.id,
    {
      document_type: 'raw_data',
      title: 'Measurement Matrix Export',
      file_ref: `ref://msa/${suffix}/raw-data.csv`,
      version: '1'
    },
    userId
  );

  grrStudy = await runStudyWorkflowToApproved(companyId, grrStudy.id, userId);

  await evidenceService.addStudyApproval(companyId, grrStudy.id, {
    approval_role: 'metrology_engineer',
    approver_name: 'Pilot Metrology Engineer',
    approved: true,
    notes: 'GRR acceptable for production use'
  });
  await evidenceService.addStudyApproval(companyId, grrStudy.id, {
    approval_role: 'quality_manager',
    approver_name: 'Pilot Quality Manager',
    approved: true,
    notes: 'MSA study approved per AIAG'
  });

  const attributeStudy = await studyService.createStudy(companyId, {
    study_title: `Attribute Agreement Pilot ${suffix}`,
    characteristic_name: 'Visual Defect Pass/Fail',
    study_kind: MSA_STUDY_KIND.ATTRIBUTE_AGREEMENT,
    gauge_id: gauge.id,
    agreement_method: 'kappa',
    num_operators: 3,
    num_parts: 30,
    num_trials: 3,
    notes: `${tag} attribute agreement pilot`
  });

  const biasStudy = await studyService.createStudy(companyId, {
    study_title: `Bias Pilot ${suffix}`,
    characteristic_name: 'Reference Bias Check',
    measurement_unit: 'mm',
    study_kind: MSA_STUDY_KIND.BIAS,
    gauge_id: gauge.id,
    instrument_id: instrument.id,
    calibration_reference_id: calibrationRef.id,
    reference_value: 25.0,
    num_measurements: 15,
    notes: `${tag} bias study pilot`
  });

  const linearityStudy = await studyService.createStudy(companyId, {
    study_title: `Linearity Pilot ${suffix}`,
    characteristic_name: 'Pressure Linearity',
    measurement_unit: 'bar',
    study_kind: MSA_STUDY_KIND.LINEARITY,
    gauge_id: gauge.id,
    range_min: 0,
    range_max: 100,
    num_reference_points: 5,
    measurements_per_point: 12,
    notes: `${tag} linearity study pilot`
  });

  const stabilityStudy = await studyService.createStudy(companyId, {
    study_title: `Stability Pilot ${suffix}`,
    characteristic_name: 'Master Stability',
    measurement_unit: 'mm',
    study_kind: MSA_STUDY_KIND.STABILITY,
    gauge_id: gauge.id,
    instrument_id: instrument.id,
    reference_value: 10.0,
    subgroup_size: 1,
    num_subgroups: 25,
    chart_type: 'i_mr',
    notes: `${tag} stability study pilot`
  });

  await studyService.runWorkflowAction(companyId, attributeStudy.id, MSA_WORKFLOW_ACTION.PLAN, { userId });
  await studyService.runWorkflowAction(companyId, biasStudy.id, MSA_WORKFLOW_ACTION.PLAN, { userId });
  await studyService.runWorkflowAction(companyId, linearityStudy.id, MSA_WORKFLOW_ACTION.PLAN, { userId });
  await studyService.runWorkflowAction(companyId, stabilityStudy.id, MSA_WORKFLOW_ACTION.PLAN, { userId });

  const grrDetail = await studyService.getStudyDetail(companyId, grrStudy.id);

  return {
    companyId,
    primaryStudyId: grrStudy.id,
    primaryStudy: grrStudy,
    detail: grrDetail,
    master: {
      gauge,
      instrument,
      calibrationRef,
      operators,
      parts
    },
    studies: {
      variable_grr: grrStudy,
      attribute_agreement: attributeStudy,
      bias: biasStudy,
      linearity: linearityStudy,
      stability: stabilityStudy
    },
    integrations: integrationRefs
  };
}

module.exports = { runMsaPilotScenario };
