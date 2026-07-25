'use strict';

const {
  PPAP_SUBMISSION_STATUS,
  PPAP_WORKFLOW_STAGE,
  PPAP_WORKFLOW_ACTION,
  resolveTransition,
  initialSubmissionState,
  isValidSubmissionLevel
} = require('../semantics/ppapCoreSemantics');

function assertTransitionAllowed(submission, action) {
  const stage = submission.workflow_stage;
  const status = submission.status;

  if (status === PPAP_SUBMISSION_STATUS.SUPERSEDED) {
    throw new Error('ppap_workflow: submission superseded');
  }
  if (status === PPAP_SUBMISSION_STATUS.EXPIRED && action !== PPAP_WORKFLOW_ACTION.EXPIRE) {
    throw new Error('ppap_workflow: submission expired');
  }
  if (status === PPAP_SUBMISSION_STATUS.APPROVED && action === PPAP_WORKFLOW_ACTION.SUBMIT) {
    throw new Error('ppap_workflow: already approved');
  }

  const resolved = resolveTransition(stage, action);
  if (!resolved) {
    throw new Error(`ppap_workflow: invalid transition (${stage} / ${action})`);
  }

  if (action === PPAP_WORKFLOW_ACTION.RESUBMIT && status !== PPAP_SUBMISSION_STATUS.REJECTED) {
    throw new Error('ppap_workflow: resubmit only from REJECTED');
  }
  if (action === PPAP_WORKFLOW_ACTION.SUBMIT && status !== PPAP_SUBMISSION_STATUS.DRAFT) {
    throw new Error('ppap_workflow: submit only from DRAFT');
  }
  if (action === PPAP_WORKFLOW_ACTION.APPROVE) {
    if (stage !== PPAP_WORKFLOW_STAGE.APPROVAL || status !== PPAP_SUBMISSION_STATUS.PENDING_APPROVAL) {
      throw new Error('ppap_workflow: approve only from APPROVAL / PENDING_APPROVAL');
    }
  }

  return resolved;
}

function applyWorkflowAction(submission, action, _ctx = {}) {
  const resolved = assertTransitionAllowed(submission, action);
  const now = new Date().toISOString();
  const patch = {
    workflow_stage: resolved.next_stage,
    status: resolved.status
  };

  if (action === PPAP_WORKFLOW_ACTION.SUBMIT) {
    patch.submitted_at = now;
  }
  if (action === PPAP_WORKFLOW_ACTION.APPROVE) {
    patch.approved_at = now;
    patch.released_at = now;
  }
  if (action === PPAP_WORKFLOW_ACTION.REJECT) {
    patch.rejected_at = now;
  }
  if (action === PPAP_WORKFLOW_ACTION.RESUBMIT) {
    patch.rejection_reason = null;
    patch.rejected_at = null;
  }
  if (action === PPAP_WORKFLOW_ACTION.EXPIRE) {
    patch.expires_at = now;
  }

  return {
    ...patch,
    action,
    from_status: submission.status,
    from_workflow_stage: submission.workflow_stage,
    to_status: resolved.status,
    to_workflow_stage: resolved.next_stage
  };
}

function validateSubmissionPayload(data = {}) {
  if (!data.part_id) throw new Error('part_id required');
  if (!data.supplier_id) throw new Error('supplier_id required');
  if (!isValidSubmissionLevel(data.submission_level)) {
    throw new Error('submission_level must be 1–5 (AIAG)');
  }
  return true;
}

function canEditSubmission(submission) {
  return (
    submission.status === PPAP_SUBMISSION_STATUS.DRAFT ||
    submission.status === PPAP_SUBMISSION_STATUS.REJECTED
  );
}

module.exports = {
  PPAP_WORKFLOW_ACTION,
  assertTransitionAllowed,
  applyWorkflowAction,
  validateSubmissionPayload,
  canEditSubmission,
  initialSubmissionState
};
