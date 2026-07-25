'use strict';

const {
  ISHIKAWA_INVESTIGATION_STATUS,
  ISHIKAWA_WORKFLOW_STAGE,
  ISHIKAWA_WORKFLOW_ACTION,
  resolveTransition,
  initialInvestigationState
} = require('../semantics/ishikawaCoreSemantics');

function assertTransitionAllowed(investigation, action) {
  const stage = investigation.workflow_stage;
  const status = investigation.status;

  if (status === ISHIKAWA_INVESTIGATION_STATUS.ARCHIVED) {
    throw new Error('ishikawa_workflow: investigation archived');
  }

  const resolved = resolveTransition(stage, action);
  if (!resolved) {
    throw new Error(`ishikawa_workflow: invalid transition (${stage} / ${action})`);
  }

  if (action === ISHIKAWA_WORKFLOW_ACTION.REOPEN && status !== ISHIKAWA_INVESTIGATION_STATUS.REJECTED) {
    throw new Error('ishikawa_workflow: reopen only from REJECTED');
  }
  if (action === ISHIKAWA_WORKFLOW_ACTION.START && status !== ISHIKAWA_INVESTIGATION_STATUS.DRAFT) {
    throw new Error('ishikawa_workflow: start only from DRAFT');
  }
  if (
    action === ISHIKAWA_WORKFLOW_ACTION.DEFINE_ROOT_CAUSE &&
    status !== ISHIKAWA_INVESTIGATION_STATUS.UNDER_INVESTIGATION
  ) {
    throw new Error('ishikawa_workflow: define_root_cause only from UNDER_INVESTIGATION');
  }
  if (
    action === ISHIKAWA_WORKFLOW_ACTION.PLAN_ACTIONS &&
    status !== ISHIKAWA_INVESTIGATION_STATUS.ROOT_CAUSE_DEFINED
  ) {
    throw new Error('ishikawa_workflow: plan_actions only from ROOT_CAUSE_DEFINED');
  }
  if (
    action === ISHIKAWA_WORKFLOW_ACTION.SUBMIT_APPROVAL &&
    status !== ISHIKAWA_INVESTIGATION_STATUS.ACTIONS_DEFINED
  ) {
    throw new Error('ishikawa_workflow: submit_approval only from ACTIONS_DEFINED');
  }
  if (action === ISHIKAWA_WORKFLOW_ACTION.APPROVE) {
    if (stage !== ISHIKAWA_WORKFLOW_STAGE.APPROVAL || status !== ISHIKAWA_INVESTIGATION_STATUS.UNDER_APPROVAL) {
      throw new Error('ishikawa_workflow: approve only from APPROVAL / UNDER_APPROVAL');
    }
  }
  if (action === ISHIKAWA_WORKFLOW_ACTION.CLOSE && status !== ISHIKAWA_INVESTIGATION_STATUS.APPROVED) {
    throw new Error('ishikawa_workflow: close only from APPROVED');
  }
  if (action === ISHIKAWA_WORKFLOW_ACTION.ARCHIVE && status !== ISHIKAWA_INVESTIGATION_STATUS.CLOSED) {
    throw new Error('ishikawa_workflow: archive only from CLOSED');
  }

  return resolved;
}

function applyWorkflowAction(investigation, action, _ctx = {}) {
  const resolved = assertTransitionAllowed(investigation, action);
  const now = new Date().toISOString();
  const patch = {
    workflow_stage: resolved.next_stage,
    status: resolved.status
  };

  if (action === ISHIKAWA_WORKFLOW_ACTION.START) patch.started_at = now;
  if (action === ISHIKAWA_WORKFLOW_ACTION.DEFINE_ROOT_CAUSE) patch.root_cause_defined_at = now;
  if (action === ISHIKAWA_WORKFLOW_ACTION.PLAN_ACTIONS) patch.actions_defined_at = now;
  if (action === ISHIKAWA_WORKFLOW_ACTION.SUBMIT_APPROVAL) patch.submitted_for_approval_at = now;
  if (action === ISHIKAWA_WORKFLOW_ACTION.APPROVE) patch.approved_at = now;
  if (action === ISHIKAWA_WORKFLOW_ACTION.REJECT) patch.rejected_at = now;
  if (action === ISHIKAWA_WORKFLOW_ACTION.REOPEN) {
    patch.rejection_reason = null;
    patch.rejected_at = null;
  }
  if (action === ISHIKAWA_WORKFLOW_ACTION.CLOSE) patch.closed_at = now;
  if (action === ISHIKAWA_WORKFLOW_ACTION.ARCHIVE) patch.archived_at = now;

  return {
    ...patch,
    action,
    from_status: investigation.status,
    from_workflow_stage: investigation.workflow_stage,
    to_status: resolved.status,
    to_workflow_stage: resolved.next_stage
  };
}

function validateInvestigationPayload(data = {}) {
  if (!data.title) throw new Error('title required');
  if (!data.problem_statement) throw new Error('problem_statement required');
  return true;
}

function canEditInvestigation(investigation) {
  return (
    investigation.status === ISHIKAWA_INVESTIGATION_STATUS.DRAFT ||
    investigation.status === ISHIKAWA_INVESTIGATION_STATUS.REJECTED
  );
}

module.exports = {
  ISHIKAWA_WORKFLOW_ACTION,
  assertTransitionAllowed,
  applyWorkflowAction,
  validateInvestigationPayload,
  canEditInvestigation,
  initialInvestigationState
};
