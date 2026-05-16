'use strict';

const { qualityOperationsUiEngine } = require('../ui/qualityOperationsUiEngine');
const { qualityGovernanceUiEngine } = require('../ui/qualityGovernanceUiEngine');

const OP_IDS = new Set(qualityOperationsUiEngine.baseManifest().components.map((c) => c.id));
const GOV_IDS = new Set(qualityGovernanceUiEngine.baseManifest().components.map((c) => c.id));

const EXECUTIVE_KPI_HINTS = [
  'cost_of_poor_quality',
  'pareto_module',
  'spc_workspace',
  'fmea_panel',
  'recall_timeline',
  'supplier_quality',
  'ishikawa_canvas',
  'capa_board'
];

function _componentIds(ui) {
  if (!ui || !Array.isArray(ui.components)) return [];
  return ui.components.map((c) => c.id);
}

/**
 * Garante separação operacional vs governação nos manifestos resolvidos.
 * @param {object} resolved — saída de resolveQualityRuntime
 */
function validateRuntimeSeparation(resolved) {
  const findings = [];
  if (!resolved || !resolved.enabled) {
    return { ok: true, findings, skipped: true };
  }

  const ui = resolved.ui_engine;
  if (!ui) {
    findings.push({ code: 'UI_ENGINE_NULL', severity: 'error' });
    return { ok: false, findings };
  }

  if (ui.mode === 'dual') {
    const op = ui.operational;
    const gov = ui.governance;
    const opIds = _componentIds(op);
    const govIds = _componentIds(gov);
    for (const id of opIds) {
      if (GOV_IDS.has(id)) findings.push({ code: 'OP_MANIFEST_GOV_COMPONENT', id, severity: 'error' });
    }
    for (const id of govIds) {
      if (OP_IDS.has(id)) findings.push({ code: 'GOV_MANIFEST_OP_COMPONENT', id, severity: 'error' });
    }
    if (resolved.explainability_level > 2 && resolved.layer === 'operations') {
      findings.push({ code: 'EXPLAINABILITY_OVERFLOW_OPERATIONS', severity: 'warn' });
    }
    if (op?.ai_assistant_profile === 'governance_analyst') {
      findings.push({ code: 'AI_PROFILE_LEAK_TO_OPERATIONAL', severity: 'error' });
    }
    if (gov?.ai_assistant_profile === 'operational_assistant') {
      findings.push({ code: 'AI_PROFILE_LEAK_TO_GOVERNANCE', severity: 'warn' });
    }
    return { ok: findings.filter((f) => f.severity === 'error').length === 0, findings };
  }

  const ids = _componentIds(ui);
  const isGov = ui.engine_id === 'quality_governance_ui_engine';
  const isOp = ui.engine_id === 'quality_operations_ui_engine';

  if (isOp) {
    for (const id of ids) {
      if (GOV_IDS.has(id)) findings.push({ code: 'OPERATIONAL_CONTAMINATED', id, severity: 'error' });
      if (EXECUTIVE_KPI_HINTS.includes(id)) findings.push({ code: 'EXEC_PATTERN_IN_OP', id, severity: 'error' });
    }
    if (resolved.explainability_level > 2) {
      findings.push({ code: 'OPERATOR_EXPLAINABILITY_HIGH', level: resolved.explainability_level, severity: 'error' });
    }
    if (resolved.intended_audience === 'executive') {
      findings.push({ code: 'AUDIENCE_EXEC_IN_OP_ENGINE', severity: 'error' });
    }
    if (ui.ai_assistant_profile !== 'operational_assistant') {
      findings.push({ code: 'OP_AI_PROFILE_MISMATCH', severity: 'error' });
    }
  } else if (isGov) {
    for (const id of ids) {
      if (OP_IDS.has(id)) findings.push({ code: 'GOVERNANCE_CONTAMINATED', id, severity: 'error' });
    }
    if (ui.ai_assistant_profile !== 'governance_analyst') {
      findings.push({ code: 'GOV_AI_PROFILE_MISMATCH', severity: 'error' });
    }
  }

  return { ok: findings.filter((f) => f.severity === 'error').length === 0, findings };
}

module.exports = {
  validateRuntimeSeparation,
  OP_IDS,
  GOV_IDS
};
