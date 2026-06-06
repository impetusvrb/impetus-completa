'use strict';

/**
 * AIOI-P1.0 — Builder de payloads de execução
 *
 * Traduz decision_payload + metadados do IOE em payloads canônicos
 * para delegação aos soberanos workflowOrchestrator e actionRuntimeOrchestrator.
 *
 * REGRAS:
 *   ✓ Sem execução local
 *   ✓ Sem recálculo de decisão, prioridade ou Truth
 *   ✓ Apenas mapeamento determinístico de dados já persistidos
 */

const LAYER = 'AIOI_EXECUTION_PAYLOAD_BUILDER';

const CATEGORY_TO_PROCESS_KEY = {
  equipment_failure:      'aioi_equipment_failure',
  equipment_degradation:'aioi_equipment_degradation',
  maintenance_required: 'aioi_maintenance_required',
  production_deviation: 'aioi_production_deviation',
  quality_issue:        'aioi_quality_issue',
  safety_incident:      'aioi_safety_incident',
  communication_risk:   'aioi_communication_risk',
  task_overdue:         'aioi_task_overdue',
  kpi_deviation:        'aioi_kpi_deviation',
  system_event:         'aioi_system_event'
};

const CATEGORY_TO_TOOL = {
  equipment_failure:      'criar_tarefa',
  equipment_degradation:  'criar_tarefa',
  maintenance_required:   'criar_tarefa',
  production_deviation:   'criar_tarefa',
  quality_issue:          'criar_tarefa',
  safety_incident:        'criar_tarefa',
  communication_risk:     'criar_lembrete',
  task_overdue:           'criar_tarefa',
  kpi_deviation:          'criar_lembrete',
  system_event:           'criar_lembrete'
};

/**
 * Resolve alvo de execução com base em decision_type.
 *
 * @param {string} decisionType
 * @returns {{ executable: boolean, target: 'workflow'|'action'|null }}
 */
function resolveExecutionTarget(decisionType) {
  switch (decisionType) {
    case 'workflow':
      return { executable: true, target: 'workflow' };
    case 'direct_action':
      return { executable: true, target: 'action' };
    case 'suggest_only':
    case 'escalate':
      return { executable: false, target: null };
    default:
      return { executable: false, target: null };
  }
}

/**
 * Constrói payload para workflowOrchestrator.startWorkflow().
 *
 * @param {object} ioe — IOE aprovado
 * @returns {object}
 */
function buildWorkflowPayload(ioe) {
  if (!ioe) {
    throw new Error(`${LAYER}: ioe inválido`);
  }

  const payload = _parseDecisionPayload(ioe.decision_payload);
  const processKey = payload.workflow_process_key
    || payload.process_key
    || CATEGORY_TO_PROCESS_KEY[ioe.category]
    || 'aioi_operational_response';

  return {
    processKey,
    companyId:     ioe.company_id,
    userId:        ioe.approved_by_user_id,
    correlationId: ioe.correlation_id,
    context: {
      ioe_id:         ioe.id,
      category:       ioe.category,
      source_type:    ioe.source_type,
      entity_type:    ioe.entity_type,
      entity_id:      ioe.entity_id,
      equipment_id:   ioe.equipment_id,
      priority_band:  ioe.priority_band,
      priority_score: ioe.priority_score,
      recommendation: payload.recommendation || null,
      rationale:      payload.rationale || null,
      decision_type:  ioe.decision_type,
      aioi_bridge:    true
    }
  };
}

/**
 * Constrói payload para actionRuntimeOrchestrator.executeToolCall().
 *
 * @param {object} ioe — IOE aprovado
 * @returns {{ toolName: string, args: object, ctx: object }}
 */
function buildActionPayload(ioe) {
  if (!ioe) {
    throw new Error(`${LAYER}: ioe inválido`);
  }

  const payload = _parseDecisionPayload(ioe.decision_payload);
  const toolName = payload.tool_name
    || payload.action_tool
    || CATEGORY_TO_TOOL[ioe.category]
    || 'criar_tarefa';

  const recommendation = payload.recommendation || 'Ação operacional AIOI';
  const args = {
    title:       payload.action_title || recommendation.slice(0, 200),
    description: payload.rationale || recommendation,
    priority:    ioe.priority_band || 'medium',
    entity_id:   ioe.entity_id || null,
    equipment_id: ioe.equipment_id || null,
    ioe_id:      ioe.id,
    category:    ioe.category,
    source:      'aioi_execution_bridge'
  };

  const ctx = {
    companyId:      ioe.company_id,
    userId:         ioe.approved_by_user_id,
    correlation_id: ioe.correlation_id,
    ioe_id:         ioe.id,
    _hitl_approved: true,
    _aioi_approved: true,
    source:         'aioi_execution_bridge'
  };

  return { toolName, args, ctx };
}

function _parseDecisionPayload(raw) {
  if (!raw) return {};
  if (typeof raw === 'object') return raw;
  try {
    return JSON.parse(raw);
  } catch (_) {
    return {};
  }
}

module.exports = {
  buildWorkflowPayload,
  buildActionPayload,
  resolveExecutionTarget
};
