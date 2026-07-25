'use strict';

const { ISHIKAWA_BLOCK_ALIASES } = require('../../../registry/ishikawaCognitiveBlockPack');
const { ISHIKAWA_INVESTIGATION_STATUS } = require('../../../../domains/ishikawa/semantics/ishikawaCoreSemantics');

function _result(blockId, { engine_ok, binding_ok, dataset_used, signal_count, reason, metrics = {}, summary = null }) {
  return {
    block_id: blockId,
    engine_ok: engine_ok === true,
    binding_ok: binding_ok === true,
    dataset_used: dataset_used || null,
    signal_count: signal_count ?? 0,
    reason: reason || (binding_ok ? 'BOUND' : 'NOT_BOUND'),
    bridge_status: binding_ok ? 'bound_z20' : 'bound_empty',
    data_status: binding_ok ? 'engine_bound' : 'graceful_empty',
    metrics,
    summary,
    engine_invoked: true,
    assistive_only: true,
    render_active: false
  };
}

function bindInvestigationRegistry(bundle) {
  const ds = bundle.datasets?.ishikawa_root_cause_investigations;
  if (!ds?.available) {
    return _result('ishikawa.investigation_registry', {
      engine_ok: false,
      binding_ok: false,
      dataset_used: 'ishikawa_root_cause_investigations',
      signal_count: 0,
      reason: 'NO_DATASET'
    });
  }
  const total = bundle.investigations?.total ?? 0;
  if (total === 0) {
    return _result('ishikawa.investigation_registry', {
      engine_ok: true,
      binding_ok: false,
      dataset_used: 'ishikawa_root_cause_investigations',
      signal_count: 0,
      reason: 'NO_DATASET'
    });
  }
  return _result('ishikawa.investigation_registry', {
    engine_ok: true,
    binding_ok: true,
    dataset_used: 'ishikawa_root_cause_investigations',
    signal_count: total,
    reason: 'BOUND',
    metrics: {
      total,
      status_counts: bundle.investigations?.status_counts || {},
      workflow_stage_counts: bundle.investigations?.workflow_stage_counts || {}
    },
    summary: `Investigações observadas: ${total}`
  });
}

function bindRootCauseRepository(bundle) {
  const ds = bundle.datasets?.ishikawa_root_cause_investigations;
  if (!ds?.available) {
    return _result('ishikawa.root_cause_repository', {
      engine_ok: false,
      binding_ok: false,
      dataset_used: 'ishikawa_root_cause_investigations',
      signal_count: 0,
      reason: 'NO_DATASET'
    });
  }
  const count = bundle.investigations?.root_cause_defined_count ?? 0;
  if (count === 0) {
    return _result('ishikawa.root_cause_repository', {
      engine_ok: true,
      binding_ok: false,
      dataset_used: 'ishikawa_root_cause_investigations',
      signal_count: 0,
      reason: 'NO_DATASET'
    });
  }
  return _result('ishikawa.root_cause_repository', {
    engine_ok: true,
    binding_ok: true,
    dataset_used: 'ishikawa_root_cause_investigations',
    signal_count: count,
    reason: 'BOUND',
    metrics: {
      root_cause_defined: count,
      status_gate: ISHIKAWA_INVESTIGATION_STATUS.ROOT_CAUSE_DEFINED
    },
    summary: `Causas raiz definidas: ${count}`
  });
}

function bindFishboneAnalysis(bundle) {
  const dsDiagrams = bundle.datasets?.ishikawa_fishbone_diagrams;
  const dsCauses = bundle.datasets?.ishikawa_fishbone_causes;
  if (!dsDiagrams?.available && !dsCauses?.available) {
    return _result('ishikawa.fishbone_analysis', {
      engine_ok: false,
      binding_ok: false,
      dataset_used: 'ishikawa_fishbone_diagrams,ishikawa_fishbone_causes',
      signal_count: 0,
      reason: 'NO_DATASET'
    });
  }
  const diagrams = bundle.fishbone?.diagrams ?? 0;
  const causes = bundle.fishbone?.causes ?? 0;
  const total = diagrams + causes;
  if (total === 0) {
    return _result('ishikawa.fishbone_analysis', {
      engine_ok: true,
      binding_ok: false,
      dataset_used: 'ishikawa_fishbone_diagrams,ishikawa_fishbone_causes',
      signal_count: 0,
      reason: 'NO_DATASET'
    });
  }
  return _result('ishikawa.fishbone_analysis', {
    engine_ok: true,
    binding_ok: true,
    dataset_used: 'ishikawa_fishbone_diagrams,ishikawa_fishbone_causes',
    signal_count: total,
    reason: 'BOUND',
    metrics: {
      diagrams,
      causes,
      category_counts: bundle.fishbone?.category_counts || {}
    },
    summary: `Fishbone: ${diagrams} diagramas · ${causes} causas`
  });
}

function bindFiveWhys(bundle) {
  const dsAnalysis = bundle.datasets?.ishikawa_five_why_analyses;
  const dsSteps = bundle.datasets?.ishikawa_five_why_steps;
  if (!dsAnalysis?.available && !dsSteps?.available) {
    return _result('ishikawa.five_whys', {
      engine_ok: false,
      binding_ok: false,
      dataset_used: 'ishikawa_five_why_analyses,ishikawa_five_why_steps',
      signal_count: 0,
      reason: 'NO_DATASET'
    });
  }
  const analyses = bundle.five_whys?.analyses ?? 0;
  const steps = bundle.five_whys?.steps ?? 0;
  const total = analyses + steps;
  if (total === 0) {
    return _result('ishikawa.five_whys', {
      engine_ok: true,
      binding_ok: false,
      dataset_used: 'ishikawa_five_why_analyses,ishikawa_five_why_steps',
      signal_count: 0,
      reason: 'NO_DATASET'
    });
  }
  return _result('ishikawa.five_whys', {
    engine_ok: true,
    binding_ok: true,
    dataset_used: 'ishikawa_five_why_analyses,ishikawa_five_why_steps',
    signal_count: total,
    reason: 'BOUND',
    metrics: { analyses, steps },
    summary: `5 Porquês: ${analyses} análises · ${steps} passos`
  });
}

function bindCorrectiveActions(bundle) {
  const ds = bundle.datasets?.ishikawa_corrective_actions;
  if (!ds?.available) {
    return _result('ishikawa.corrective_actions', {
      engine_ok: false,
      binding_ok: false,
      dataset_used: 'ishikawa_corrective_actions',
      signal_count: 0,
      reason: 'NO_DATASET'
    });
  }
  const count = bundle.support?.corrective_actions?.count ?? 0;
  if (count === 0) {
    return _result('ishikawa.corrective_actions', {
      engine_ok: true,
      binding_ok: false,
      dataset_used: 'ishikawa_corrective_actions',
      signal_count: 0,
      reason: 'NO_DATASET'
    });
  }
  return _result('ishikawa.corrective_actions', {
    engine_ok: true,
    binding_ok: true,
    dataset_used: 'ishikawa_corrective_actions',
    signal_count: count,
    reason: 'BOUND',
    metrics: { corrective_actions: count },
    summary: `Ações corretivas: ${count}`
  });
}

function bindPreventiveActions(bundle) {
  const ds = bundle.datasets?.ishikawa_preventive_actions;
  if (!ds?.available) {
    return _result('ishikawa.preventive_actions', {
      engine_ok: false,
      binding_ok: false,
      dataset_used: 'ishikawa_preventive_actions',
      signal_count: 0,
      reason: 'NO_DATASET'
    });
  }
  const count = bundle.support?.preventive_actions?.count ?? 0;
  if (count === 0) {
    return _result('ishikawa.preventive_actions', {
      engine_ok: true,
      binding_ok: false,
      dataset_used: 'ishikawa_preventive_actions',
      signal_count: 0,
      reason: 'NO_DATASET'
    });
  }
  return _result('ishikawa.preventive_actions', {
    engine_ok: true,
    binding_ok: true,
    dataset_used: 'ishikawa_preventive_actions',
    signal_count: count,
    reason: 'BOUND',
    metrics: { preventive_actions: count },
    summary: `Ações preventivas: ${count}`
  });
}

function bindEvidenceRepository(bundle) {
  const dsEvidence = bundle.datasets?.ishikawa_investigation_evidence;
  const dsDocs = bundle.datasets?.ishikawa_attached_documents;
  if (!dsEvidence?.available && !dsDocs?.available) {
    return _result('ishikawa.evidence_repository', {
      engine_ok: false,
      binding_ok: false,
      dataset_used: 'ishikawa_investigation_evidence,ishikawa_attached_documents',
      signal_count: 0,
      reason: 'NO_DATASET'
    });
  }
  const evidenceCount = bundle.support?.evidence?.count ?? 0;
  const docCount = bundle.support?.attached_documents?.count ?? 0;
  const total = evidenceCount + docCount;
  if (total === 0) {
    return _result('ishikawa.evidence_repository', {
      engine_ok: true,
      binding_ok: false,
      dataset_used: 'ishikawa_investigation_evidence,ishikawa_attached_documents',
      signal_count: 0,
      reason: 'NO_DATASET'
    });
  }
  return _result('ishikawa.evidence_repository', {
    engine_ok: true,
    binding_ok: true,
    dataset_used: 'ishikawa_investigation_evidence,ishikawa_attached_documents',
    signal_count: total,
    reason: 'BOUND',
    metrics: { evidence: evidenceCount, documents: docCount },
    summary: `Evidências: ${evidenceCount} · documentos: ${docCount}`
  });
}

function bindInvestigationWorkflow(bundle) {
  const dsHist = bundle.datasets?.ishikawa_investigation_history;
  const dsAppr = bundle.datasets?.ishikawa_investigation_approvals;
  if (!dsHist?.available && !dsAppr?.available) {
    return _result('ishikawa.investigation_workflow', {
      engine_ok: false,
      binding_ok: false,
      dataset_used: 'ishikawa_investigation_history,ishikawa_investigation_approvals',
      signal_count: 0,
      reason: 'NO_DATASET'
    });
  }
  const histCount = bundle.support?.history?.count ?? 0;
  const apprCount = bundle.support?.approvals?.count ?? 0;
  const total = histCount + apprCount;
  if (total === 0) {
    return _result('ishikawa.investigation_workflow', {
      engine_ok: true,
      binding_ok: false,
      dataset_used: 'ishikawa_investigation_history,ishikawa_investigation_approvals',
      signal_count: 0,
      reason: 'NO_DATASET'
    });
  }
  return _result('ishikawa.investigation_workflow', {
    engine_ok: true,
    binding_ok: true,
    dataset_used: 'ishikawa_investigation_history,ishikawa_investigation_approvals',
    signal_count: total,
    reason: 'BOUND',
    metrics: {
      history_rows: histCount,
      approval_rows: apprCount,
      workflow_stage_counts: bundle.investigations?.workflow_stage_counts || {}
    },
    summary: `Workflow: ${histCount} transições · ${apprCount} aprovações`
  });
}

function bindRecurrenceMonitor(bundle) {
  const dsVer = bundle.datasets?.ishikawa_verification_results;
  const dsInv = bundle.datasets?.ishikawa_root_cause_investigations;
  if (!dsVer?.available && !dsInv?.available) {
    return _result('ishikawa.recurrence_monitor', {
      engine_ok: false,
      binding_ok: false,
      dataset_used: 'ishikawa_verification_results,ishikawa_root_cause_investigations',
      signal_count: 0,
      reason: 'NO_DATASET'
    });
  }
  const verCount = bundle.support?.verification_results?.count ?? 0;
  const closedCount = bundle.investigations?.status_counts?.[ISHIKAWA_INVESTIGATION_STATUS.CLOSED] ?? 0;
  const total = verCount + closedCount;
  if (total === 0) {
    return _result('ishikawa.recurrence_monitor', {
      engine_ok: true,
      binding_ok: false,
      dataset_used: 'ishikawa_verification_results,ishikawa_root_cause_investigations',
      signal_count: 0,
      reason: 'NO_DATASET'
    });
  }
  return _result('ishikawa.recurrence_monitor', {
    engine_ok: true,
    binding_ok: true,
    dataset_used: 'ishikawa_verification_results,ishikawa_root_cause_investigations',
    signal_count: total,
    reason: 'BOUND',
    metrics: { verification_results: verCount, closed_investigations: closedCount },
    summary: `Recorrência: ${verCount} verificações · ${closedCount} encerradas`
  });
}

function bindOrganizationalLearning(bundle) {
  const dsHist = bundle.datasets?.ishikawa_investigation_history;
  const dsInv = bundle.datasets?.ishikawa_root_cause_investigations;
  if (!dsHist?.available && !dsInv?.available) {
    return _result('ishikawa.organizational_learning', {
      engine_ok: false,
      binding_ok: false,
      dataset_used: 'ishikawa_investigation_history,ishikawa_root_cause_investigations',
      signal_count: 0,
      reason: 'NO_DATASET'
    });
  }
  const histCount = bundle.support?.history?.count ?? 0;
  const archivedCount = bundle.investigations?.status_counts?.[ISHIKAWA_INVESTIGATION_STATUS.ARCHIVED] ?? 0;
  const closedCount = bundle.investigations?.status_counts?.[ISHIKAWA_INVESTIGATION_STATUS.CLOSED] ?? 0;
  const total = histCount + archivedCount + closedCount;
  if (total === 0) {
    return _result('ishikawa.organizational_learning', {
      engine_ok: true,
      binding_ok: false,
      dataset_used: 'ishikawa_investigation_history,ishikawa_root_cause_investigations',
      signal_count: 0,
      reason: 'NO_DATASET'
    });
  }
  return _result('ishikawa.organizational_learning', {
    engine_ok: true,
    binding_ok: true,
    dataset_used: 'ishikawa_investigation_history,ishikawa_root_cause_investigations',
    signal_count: total,
    reason: 'BOUND',
    metrics: { history_rows: histCount, closed: closedCount, archived: archivedCount },
    summary: `Aprendizagem: ${histCount} eventos · ${closedCount + archivedCount} concluídas`
  });
}

function bindContextualRootCauseAi(bundle, priorBindings = []) {
  const boundCount = priorBindings.filter((b) => b.binding_ok).length;
  if (boundCount === 0) {
    return _result('ishikawa.contextual_root_cause_ai', {
      engine_ok: true,
      binding_ok: false,
      dataset_used: 'bound_block_signals',
      signal_count: 0,
      reason: 'NO_DATASET'
    });
  }
  return _result('ishikawa.contextual_root_cause_ai', {
    engine_ok: true,
    binding_ok: true,
    dataset_used: 'bound_block_signals',
    signal_count: boundCount,
    reason: 'BOUND',
    metrics: { blocks_with_data: boundCount },
    summary: `Blocos operacionais observados: ${boundCount}`
  });
}

function bindIshikawaNarrative(bundle, priorBindings = []) {
  const summaries = priorBindings.filter((b) => b.binding_ok && b.summary).map((b) => b.summary);
  if (summaries.length === 0) {
    return _result('ishikawa.ishikawa_narrative', {
      engine_ok: true,
      binding_ok: false,
      dataset_used: 'bound_block_summaries',
      signal_count: 0,
      reason: 'NO_DATASET'
    });
  }
  return _result('ishikawa.ishikawa_narrative', {
    engine_ok: true,
    binding_ok: true,
    dataset_used: 'bound_block_summaries',
    signal_count: summaries.length,
    reason: 'BOUND',
    metrics: { facts_used: summaries.length },
    summary: summaries.slice(0, 3).join(' · ')
  });
}

const PRIMARY_BINDERS = {
  'ishikawa.investigation_registry': bindInvestigationRegistry,
  'ishikawa.root_cause_repository': bindRootCauseRepository,
  'ishikawa.fishbone_analysis': bindFishboneAnalysis,
  'ishikawa.five_whys': bindFiveWhys,
  'ishikawa.corrective_actions': bindCorrectiveActions,
  'ishikawa.preventive_actions': bindPreventiveActions,
  'ishikawa.evidence_repository': bindEvidenceRepository,
  'ishikawa.investigation_workflow': bindInvestigationWorkflow,
  'ishikawa.recurrence_monitor': bindRecurrenceMonitor,
  'ishikawa.organizational_learning': bindOrganizationalLearning
};

function invokeIshikawaBlockBridge(blockId, signalBundle = {}, ctx = {}) {
  const canonical = ISHIKAWA_BLOCK_ALIASES[blockId] || blockId;
  if (canonical === 'ishikawa.contextual_root_cause_ai') {
    return bindContextualRootCauseAi(signalBundle, ctx._prior_bindings || []);
  }
  if (canonical === 'ishikawa.ishikawa_narrative') {
    return bindIshikawaNarrative(signalBundle, ctx._prior_bindings || []);
  }
  const fn = PRIMARY_BINDERS[canonical];
  if (!fn) {
    return _result(canonical, {
      engine_ok: false,
      binding_ok: false,
      dataset_used: null,
      signal_count: 0,
      reason: 'NOT_BOUND'
    });
  }
  return fn(signalBundle);
}

module.exports = {
  invokeIshikawaBlockBridge,
  PRIMARY_BINDERS
};
