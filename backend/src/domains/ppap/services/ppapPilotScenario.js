'use strict';

/**
 * GF-005 — Cenário piloto operacional completo (enablement, sem alterar runtime).
 */
const submissionService = require('./ppapSubmissionService');
const evidenceService = require('./ppapEvidenceService');
const { PPAP_WORKFLOW_ACTION } = require('../workflow/ppapWorkflowEngine');
const { PPAP_SUBMISSION_STATUS } = require('../semantics/ppapCoreSemantics');

/**
 * Executa fluxo piloto: master data → evidências → workflow APPROVED.
 * @returns {Promise<{ companyId, submissionId, submission, detail }>}
 */
async function runPpapPilotScenario(companyId, { tag = 'GF-005' } = {}) {
  const suffix = `${tag}-${Date.now().toString(36)}`.toUpperCase();

  const part = await submissionService.createPart(companyId, {
    part_number: `PN-${suffix}`,
    part_name: `Pilot Part ${suffix}`,
    revision: 'A'
  });
  const supplier = await submissionService.createSupplier(companyId, {
    supplier_code: `SUP-${suffix}`,
    supplier_name: `Pilot Supplier ${suffix}`
  });
  const customer = await submissionService.createCustomer(companyId, {
    customer_code: `OEM-${suffix}`,
    customer_name: `Pilot OEM ${suffix}`
  });

  let submission = await submissionService.createSubmission(companyId, {
    part_id: part.id,
    supplier_id: supplier.id,
    customer_id: customer.id,
    submission_level: 3,
    notes: `${tag} pilot enablement submission`
  });

  await evidenceService.upsertPsw(companyId, submission.id, {
    warrant_number: `PSW-${suffix}`,
    warrant_date: new Date().toISOString().slice(0, 10),
    signatory_name: 'Pilot Signatory',
    signatory_title: 'Quality Manager',
    customer_approval_required: true,
    approved: true
  });

  await evidenceService.addAttachedDocument(companyId, submission.id, {
    document_type: 'control_plan',
    title: 'Control Plan Rev A',
    aiag_element_number: 7,
    file_ref: `ref://ppap/${suffix}/control-plan.pdf`
  });
  await evidenceService.addAttachedDocument(companyId, submission.id, {
    document_type: 'process_fmea',
    title: 'Process FMEA Rev A',
    aiag_element_number: 6,
    file_ref: `ref://ppap/${suffix}/pfmea.pdf`
  });
  await evidenceService.addAttachedDocument(companyId, submission.id, {
    document_type: 'psw',
    title: 'Part Submission Warrant',
    aiag_element_number: 18,
    file_ref: `ref://ppap/${suffix}/psw.pdf`
  });

  await evidenceService.addMaterialCertification(companyId, submission.id, {
    cert_type: 'mill_cert',
    cert_number: `MC-${suffix}`,
    issuer: 'Steel Mill Co',
    material_grade: 'SAE 1008'
  });

  await evidenceService.addCapabilityStudy(companyId, submission.id, {
    characteristic_name: 'OD critical',
    cp: 1.45,
    cpk: 1.33,
    sample_size: 125,
    usl: 10.05,
    lsl: 9.95,
    study_date: new Date().toISOString().slice(0, 10)
  });

  await evidenceService.addDimensionalResult(companyId, submission.id, {
    characteristic_name: 'Hole diameter A',
    nominal: 5.0,
    tolerance_upper: 5.05,
    tolerance_lower: 4.95,
    measured_value: 5.01,
    result: 'conforming'
  });
  await evidenceService.addDimensionalResult(companyId, submission.id, {
    characteristic_name: 'Length B',
    nominal: 12.0,
    tolerance_upper: 12.1,
    tolerance_lower: 11.9,
    measured_value: 12.02,
    result: 'conforming'
  });

  await evidenceService.addAppearanceApproval(companyId, submission.id, {
    standard_reference: 'OEM Visual Std 1.0',
    result: 'approved',
    inspector_name: 'Pilot Inspector'
  });

  await evidenceService.addPerformanceTest(companyId, submission.id, {
    test_name: 'Tensile strength',
    test_method: 'ASTM E8',
    specification: '>= 400 MPa',
    measured_value: '425 MPa',
    result: 'pass'
  });

  await evidenceService.addEngineeringChange(companyId, submission.id, {
    ecn_number: `ECN-${suffix}`,
    change_description: 'Initial release — no prior ECN',
    approved_by_customer: true
  });

  submission = await submissionService.runWorkflowAction(companyId, submission.id, PPAP_WORKFLOW_ACTION.SUBMIT);
  submission = await submissionService.runWorkflowAction(
    companyId,
    submission.id,
    PPAP_WORKFLOW_ACTION.ADVANCE_TECHNICAL
  );
  submission = await submissionService.runWorkflowAction(
    companyId,
    submission.id,
    PPAP_WORKFLOW_ACTION.ADVANCE_QUALITY
  );
  submission = await submissionService.runWorkflowAction(
    companyId,
    submission.id,
    PPAP_WORKFLOW_ACTION.REQUEST_APPROVAL
  );
  submission = await submissionService.runWorkflowAction(companyId, submission.id, PPAP_WORKFLOW_ACTION.APPROVE);

  if (submission.status !== PPAP_SUBMISSION_STATUS.APPROVED) {
    throw new Error(`pilot scenario failed: expected APPROVED, got ${submission.status}`);
  }

  const detail = await submissionService.getSubmissionDetail(companyId, submission.id);
  return {
    companyId,
    submissionId: submission.id,
    submission,
    detail,
    master: { part, supplier, customer }
  };
}

module.exports = { runPpapPilotScenario };
