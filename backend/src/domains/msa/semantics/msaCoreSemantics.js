'use strict';

/**
 * GF-009 — Semântica canónica MSA (AIAG MSA 4th Ed.).
 * Fonte única de verdade para estados, workflow e tipos de estudo.
 * Signal Loader / runtime DEVEM importar daqui — nunca redefinir inline.
 */

const MSA_STUDY_STATUS = Object.freeze({
  DRAFT: 'DRAFT',
  PLANNED: 'PLANNED',
  IN_PROGRESS: 'IN_PROGRESS',
  UNDER_REVIEW: 'UNDER_REVIEW',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  ARCHIVED: 'ARCHIVED'
});

const MSA_STUDY_STATUS_LIST = Object.freeze(Object.values(MSA_STUDY_STATUS));

const MSA_WORKFLOW_STAGE = Object.freeze({
  DRAFT: 'DRAFT',
  PLANNING: 'PLANNING',
  EXECUTION: 'EXECUTION',
  TECHNICAL_REVIEW: 'TECHNICAL_REVIEW',
  APPROVAL: 'APPROVAL',
  ARCHIVE: 'ARCHIVE'
});

const MSA_WORKFLOW_STAGE_LIST = Object.freeze(Object.values(MSA_WORKFLOW_STAGE));

/** Discriminante para tabela de extensão — não armazena dados do estudo */
const MSA_STUDY_KIND = Object.freeze({
  VARIABLE_GRR: 'variable_grr',
  ATTRIBUTE_AGREEMENT: 'attribute_agreement',
  BIAS: 'bias',
  LINEARITY: 'linearity',
  STABILITY: 'stability'
});

const MSA_STUDY_KIND_LIST = Object.freeze(Object.values(MSA_STUDY_KIND));

const MSA_WORKFLOW_ACTION = Object.freeze({
  PLAN: 'plan',
  START: 'start',
  REVIEW: 'review',
  ADVANCE_APPROVAL: 'advance_approval',
  APPROVE: 'approve',
  REJECT: 'reject',
  REOPEN: 'reopen',
  ARCHIVE: 'archive'
});

/**
 * Mapa canónico: (workflow_stage, action) → { next_stage, status }
 */
const MSA_WORKFLOW_TRANSITIONS = Object.freeze({
  [`${MSA_WORKFLOW_STAGE.DRAFT}:${MSA_WORKFLOW_ACTION.PLAN}`]: {
    next_stage: MSA_WORKFLOW_STAGE.PLANNING,
    status: MSA_STUDY_STATUS.PLANNED
  },
  [`${MSA_WORKFLOW_STAGE.PLANNING}:${MSA_WORKFLOW_ACTION.START}`]: {
    next_stage: MSA_WORKFLOW_STAGE.EXECUTION,
    status: MSA_STUDY_STATUS.IN_PROGRESS
  },
  [`${MSA_WORKFLOW_STAGE.EXECUTION}:${MSA_WORKFLOW_ACTION.REVIEW}`]: {
    next_stage: MSA_WORKFLOW_STAGE.TECHNICAL_REVIEW,
    status: MSA_STUDY_STATUS.UNDER_REVIEW
  },
  [`${MSA_WORKFLOW_STAGE.TECHNICAL_REVIEW}:${MSA_WORKFLOW_ACTION.ADVANCE_APPROVAL}`]: {
    next_stage: MSA_WORKFLOW_STAGE.APPROVAL,
    status: MSA_STUDY_STATUS.UNDER_REVIEW
  },
  [`${MSA_WORKFLOW_STAGE.APPROVAL}:${MSA_WORKFLOW_ACTION.APPROVE}`]: {
    next_stage: MSA_WORKFLOW_STAGE.APPROVAL,
    status: MSA_STUDY_STATUS.APPROVED
  },
  [`${MSA_WORKFLOW_STAGE.APPROVAL}:${MSA_WORKFLOW_ACTION.ARCHIVE}`]: {
    next_stage: MSA_WORKFLOW_STAGE.ARCHIVE,
    status: MSA_STUDY_STATUS.ARCHIVED
  },
  [`${MSA_WORKFLOW_STAGE.EXECUTION}:${MSA_WORKFLOW_ACTION.REJECT}`]: {
    next_stage: MSA_WORKFLOW_STAGE.DRAFT,
    status: MSA_STUDY_STATUS.REJECTED
  },
  [`${MSA_WORKFLOW_STAGE.TECHNICAL_REVIEW}:${MSA_WORKFLOW_ACTION.REJECT}`]: {
    next_stage: MSA_WORKFLOW_STAGE.DRAFT,
    status: MSA_STUDY_STATUS.REJECTED
  },
  [`${MSA_WORKFLOW_STAGE.APPROVAL}:${MSA_WORKFLOW_ACTION.REJECT}`]: {
    next_stage: MSA_WORKFLOW_STAGE.DRAFT,
    status: MSA_STUDY_STATUS.REJECTED
  },
  [`${MSA_WORKFLOW_STAGE.DRAFT}:${MSA_WORKFLOW_ACTION.REOPEN}`]: {
    next_stage: MSA_WORKFLOW_STAGE.DRAFT,
    status: MSA_STUDY_STATUS.DRAFT
  }
});

/** Pontos de integração futura (FK nullable — GF-010+) */
const MSA_INTEGRATION_REFS = Object.freeze([
  'quality_inspection_id',
  'ppap_submission_id',
  'ppap_capability_study_id',
  'supplier_ref',
  'production_order_ref',
  'spc_chart_ref',
  'capability_study_ref'
]);

function isValidStudyStatus(s) {
  return MSA_STUDY_STATUS_LIST.includes(String(s || '').toUpperCase());
}

function isValidWorkflowStage(s) {
  return MSA_WORKFLOW_STAGE_LIST.includes(String(s || '').toUpperCase());
}

function isValidStudyKind(k) {
  return MSA_STUDY_KIND_LIST.includes(String(k || '').toLowerCase());
}

function resolveTransition(workflowStage, action) {
  const key = `${String(workflowStage).toUpperCase()}:${String(action).toLowerCase()}`;
  return MSA_WORKFLOW_TRANSITIONS[key] || null;
}

function initialStudyState() {
  return {
    status: MSA_STUDY_STATUS.DRAFT,
    workflow_stage: MSA_WORKFLOW_STAGE.DRAFT
  };
}

module.exports = {
  MSA_STUDY_STATUS,
  MSA_STUDY_STATUS_LIST,
  MSA_WORKFLOW_STAGE,
  MSA_WORKFLOW_STAGE_LIST,
  MSA_STUDY_KIND,
  MSA_STUDY_KIND_LIST,
  MSA_WORKFLOW_ACTION,
  MSA_WORKFLOW_TRANSITIONS,
  MSA_INTEGRATION_REFS,
  isValidStudyStatus,
  isValidWorkflowStage,
  isValidStudyKind,
  resolveTransition,
  initialStudyState
};
