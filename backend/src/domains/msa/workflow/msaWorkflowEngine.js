'use strict';

const {
  MSA_STUDY_STATUS,
  MSA_WORKFLOW_STAGE,
  MSA_WORKFLOW_ACTION,
  MSA_STUDY_KIND,
  resolveTransition,
  initialStudyState,
  isValidStudyKind
} = require('../semantics/msaCoreSemantics');

function assertTransitionAllowed(study, action) {
  const stage = study.workflow_stage;
  const status = study.status;

  if (status === MSA_STUDY_STATUS.ARCHIVED) {
    throw new Error('msa_workflow: study archived');
  }
  if (status === MSA_STUDY_STATUS.APPROVED && action === MSA_WORKFLOW_ACTION.START) {
    throw new Error('msa_workflow: already approved');
  }

  const resolved = resolveTransition(stage, action);
  if (!resolved) {
    throw new Error(`msa_workflow: invalid transition (${stage} / ${action})`);
  }

  if (action === MSA_WORKFLOW_ACTION.REOPEN && status !== MSA_STUDY_STATUS.REJECTED) {
    throw new Error('msa_workflow: reopen only from REJECTED');
  }
  if (action === MSA_WORKFLOW_ACTION.PLAN && status !== MSA_STUDY_STATUS.DRAFT) {
    throw new Error('msa_workflow: plan only from DRAFT');
  }
  if (action === MSA_WORKFLOW_ACTION.START && status !== MSA_STUDY_STATUS.PLANNED) {
    throw new Error('msa_workflow: start only from PLANNED');
  }
  if (action === MSA_WORKFLOW_ACTION.REVIEW && status !== MSA_STUDY_STATUS.IN_PROGRESS) {
    throw new Error('msa_workflow: review only from IN_PROGRESS');
  }
  if (action === MSA_WORKFLOW_ACTION.APPROVE) {
    if (stage !== MSA_WORKFLOW_STAGE.APPROVAL || status !== MSA_STUDY_STATUS.UNDER_REVIEW) {
      throw new Error('msa_workflow: approve only from APPROVAL / UNDER_REVIEW');
    }
  }
  if (action === MSA_WORKFLOW_ACTION.ARCHIVE && status !== MSA_STUDY_STATUS.APPROVED) {
    throw new Error('msa_workflow: archive only from APPROVED');
  }

  return resolved;
}

function applyWorkflowAction(study, action, _ctx = {}) {
  const resolved = assertTransitionAllowed(study, action);
  const now = new Date().toISOString();
  const patch = {
    workflow_stage: resolved.next_stage,
    status: resolved.status
  };

  if (action === MSA_WORKFLOW_ACTION.PLAN) {
    patch.planned_at = now;
  }
  if (action === MSA_WORKFLOW_ACTION.START) {
    patch.started_at = now;
  }
  if (action === MSA_WORKFLOW_ACTION.REVIEW || action === MSA_WORKFLOW_ACTION.ADVANCE_APPROVAL) {
    patch.reviewed_at = now;
  }
  if (action === MSA_WORKFLOW_ACTION.APPROVE) {
    patch.approved_at = now;
  }
  if (action === MSA_WORKFLOW_ACTION.REJECT) {
    patch.rejected_at = now;
  }
  if (action === MSA_WORKFLOW_ACTION.REOPEN) {
    patch.rejection_reason = null;
    patch.rejected_at = null;
  }
  if (action === MSA_WORKFLOW_ACTION.ARCHIVE) {
    patch.archived_at = now;
  }

  return {
    ...patch,
    action,
    from_status: study.status,
    from_workflow_stage: study.workflow_stage,
    to_status: resolved.status,
    to_workflow_stage: resolved.next_stage
  };
}

function validateStudyPayload(data = {}) {
  if (!data.study_title) throw new Error('study_title required');
  if (!data.characteristic_name) throw new Error('characteristic_name required');
  if (!isValidStudyKind(data.study_kind)) {
    throw new Error(`study_kind must be one of: ${Object.values(MSA_STUDY_KIND).join(', ')}`);
  }
  return true;
}

function canEditStudy(study) {
  return (
    study.status === MSA_STUDY_STATUS.DRAFT ||
    study.status === MSA_STUDY_STATUS.REJECTED ||
    study.status === MSA_STUDY_STATUS.PLANNED
  );
}

module.exports = {
  MSA_WORKFLOW_ACTION,
  MSA_STUDY_KIND,
  assertTransitionAllowed,
  applyWorkflowAction,
  validateStudyPayload,
  canEditStudy,
  initialStudyState
};
