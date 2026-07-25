'use strict';

/**
 * GF-002 — Semântica canónica PPAP (AIAG/VDA).
 * Fonte única de verdade para estados, workflow e níveis.
 * Loaders/hubs/adapters DEVEM importar daqui — nunca redefinir inline.
 */

/** Estados de negócio da submissão — sem ambiguidade */
const PPAP_SUBMISSION_STATUS = Object.freeze({
  DRAFT: 'DRAFT',
  UNDER_REVIEW: 'UNDER_REVIEW',
  PENDING_APPROVAL: 'PENDING_APPROVAL',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  EXPIRED: 'EXPIRED',
  SUPERSEDED: 'SUPERSEDED'
});

const PPAP_SUBMISSION_STATUS_LIST = Object.freeze(Object.values(PPAP_SUBMISSION_STATUS));

/** Etapas do workflow normativo */
const PPAP_WORKFLOW_STAGE = Object.freeze({
  DRAFT: 'DRAFT',
  SUBMISSION: 'SUBMISSION',
  TECHNICAL_REVIEW: 'TECHNICAL_REVIEW',
  QUALITY_REVIEW: 'QUALITY_REVIEW',
  APPROVAL: 'APPROVAL',
  RELEASE: 'RELEASE'
});

const PPAP_WORKFLOW_STAGE_LIST = Object.freeze(Object.values(PPAP_WORKFLOW_STAGE));

/** Níveis AIAG (1–5) */
const PPAP_SUBMISSION_LEVELS = Object.freeze({
  1: { level: 1, aiag_name: 'Level 1 — Warrant only', vda_name: 'Stufe 1', document_scope: 'PSW only' },
  2: { level: 2, aiag_name: 'Level 2 — Warrant + product/sample', vda_name: 'Stufe 2', document_scope: 'PSW + limited data' },
  3: { level: 3, aiag_name: 'Level 3 — Warrant + product/sample + limited data', vda_name: 'Stufe 3', document_scope: 'PSW + partial PPAP elements' },
  4: { level: 4, aiag_name: 'Level 4 — Warrant + other requirements per customer', vda_name: 'Stufe 4', document_scope: 'Customer-defined subset' },
  5: { level: 5, aiag_name: 'Level 5 — Warrant + full PPAP documentation', vda_name: 'Stufe 5', document_scope: 'Full 18-element package' }
});

/** Ações de transição workflow */
const PPAP_WORKFLOW_ACTION = Object.freeze({
  SUBMIT: 'submit',
  ADVANCE_TECHNICAL: 'advance_technical',
  ADVANCE_QUALITY: 'advance_quality',
  REQUEST_APPROVAL: 'request_approval',
  APPROVE: 'approve',
  REJECT: 'reject',
  RESUBMIT: 'resubmit',
  EXPIRE: 'expire',
  SUPERSEDE: 'supersede'
});

/**
 * Mapa canónico: (workflow_stage, action) → { next_stage, status }
 * Rejeição e reenvio explícitos.
 */
const PPAP_WORKFLOW_TRANSITIONS = Object.freeze({
  [`${PPAP_WORKFLOW_STAGE.DRAFT}:${PPAP_WORKFLOW_ACTION.SUBMIT}`]: {
    next_stage: PPAP_WORKFLOW_STAGE.SUBMISSION,
    status: PPAP_SUBMISSION_STATUS.UNDER_REVIEW
  },
  [`${PPAP_WORKFLOW_STAGE.SUBMISSION}:${PPAP_WORKFLOW_ACTION.ADVANCE_TECHNICAL}`]: {
    next_stage: PPAP_WORKFLOW_STAGE.TECHNICAL_REVIEW,
    status: PPAP_SUBMISSION_STATUS.UNDER_REVIEW
  },
  [`${PPAP_WORKFLOW_STAGE.TECHNICAL_REVIEW}:${PPAP_WORKFLOW_ACTION.ADVANCE_QUALITY}`]: {
    next_stage: PPAP_WORKFLOW_STAGE.QUALITY_REVIEW,
    status: PPAP_SUBMISSION_STATUS.UNDER_REVIEW
  },
  [`${PPAP_WORKFLOW_STAGE.QUALITY_REVIEW}:${PPAP_WORKFLOW_ACTION.REQUEST_APPROVAL}`]: {
    next_stage: PPAP_WORKFLOW_STAGE.APPROVAL,
    status: PPAP_SUBMISSION_STATUS.PENDING_APPROVAL
  },
  [`${PPAP_WORKFLOW_STAGE.APPROVAL}:${PPAP_WORKFLOW_ACTION.APPROVE}`]: {
    next_stage: PPAP_WORKFLOW_STAGE.RELEASE,
    status: PPAP_SUBMISSION_STATUS.APPROVED
  },
  [`${PPAP_WORKFLOW_STAGE.SUBMISSION}:${PPAP_WORKFLOW_ACTION.REJECT}`]: {
    next_stage: PPAP_WORKFLOW_STAGE.DRAFT,
    status: PPAP_SUBMISSION_STATUS.REJECTED
  },
  [`${PPAP_WORKFLOW_STAGE.TECHNICAL_REVIEW}:${PPAP_WORKFLOW_ACTION.REJECT}`]: {
    next_stage: PPAP_WORKFLOW_STAGE.DRAFT,
    status: PPAP_SUBMISSION_STATUS.REJECTED
  },
  [`${PPAP_WORKFLOW_STAGE.QUALITY_REVIEW}:${PPAP_WORKFLOW_ACTION.REJECT}`]: {
    next_stage: PPAP_WORKFLOW_STAGE.DRAFT,
    status: PPAP_SUBMISSION_STATUS.REJECTED
  },
  [`${PPAP_WORKFLOW_STAGE.APPROVAL}:${PPAP_WORKFLOW_ACTION.REJECT}`]: {
    next_stage: PPAP_WORKFLOW_STAGE.DRAFT,
    status: PPAP_SUBMISSION_STATUS.REJECTED
  },
  [`${PPAP_WORKFLOW_STAGE.DRAFT}:${PPAP_WORKFLOW_ACTION.RESUBMIT}`]: {
    next_stage: PPAP_WORKFLOW_STAGE.DRAFT,
    status: PPAP_SUBMISSION_STATUS.DRAFT
  },
  [`${PPAP_WORKFLOW_STAGE.RELEASE}:${PPAP_WORKFLOW_ACTION.EXPIRE}`]: {
    next_stage: PPAP_WORKFLOW_STAGE.RELEASE,
    status: PPAP_SUBMISSION_STATUS.EXPIRED
  }
});

/** Tipos documentais AIAG element mapping (referência) */
const PPAP_DOCUMENT_TYPES = Object.freeze([
  'design_record',
  'engineering_change',
  'customer_approval',
  'design_fmea',
  'process_flow',
  'process_fmea',
  'control_plan',
  'msa_study',
  'dimensional_results',
  'material_test',
  'initial_process_study',
  'qualified_lab',
  'aar',
  'sample_production',
  'standard_sample',
  'checking_aid',
  'customer_specific',
  'psw'
]);

/** Pontos de integração futura (FK nullable — GF-003+) */
const PPAP_INTEGRATION_REFS = Object.freeze([
  'quality_inspection_id',
  'raw_material_lot_id',
  'raw_material_receipt_id',
  'fmea_study_ref',
  'ishikawa_analysis_ref',
  'supplier_scorecard_ref'
]);

function isValidSubmissionStatus(s) {
  return PPAP_SUBMISSION_STATUS_LIST.includes(String(s || '').toUpperCase());
}

function isValidWorkflowStage(s) {
  return PPAP_WORKFLOW_STAGE_LIST.includes(String(s || '').toUpperCase());
}

function isValidSubmissionLevel(n) {
  const l = Number(n);
  return Number.isInteger(l) && l >= 1 && l <= 5;
}

function resolveTransition(workflowStage, action) {
  const key = `${String(workflowStage).toUpperCase()}:${String(action).toLowerCase()}`;
  return PPAP_WORKFLOW_TRANSITIONS[key] || null;
}

function initialSubmissionState() {
  return {
    status: PPAP_SUBMISSION_STATUS.DRAFT,
    workflow_stage: PPAP_WORKFLOW_STAGE.DRAFT
  };
}

module.exports = {
  PPAP_SUBMISSION_STATUS,
  PPAP_SUBMISSION_STATUS_LIST,
  PPAP_WORKFLOW_STAGE,
  PPAP_WORKFLOW_STAGE_LIST,
  PPAP_SUBMISSION_LEVELS,
  PPAP_WORKFLOW_ACTION,
  PPAP_WORKFLOW_TRANSITIONS,
  PPAP_DOCUMENT_TYPES,
  PPAP_INTEGRATION_REFS,
  isValidSubmissionStatus,
  isValidWorkflowStage,
  isValidSubmissionLevel,
  resolveTransition,
  initialSubmissionState
};
