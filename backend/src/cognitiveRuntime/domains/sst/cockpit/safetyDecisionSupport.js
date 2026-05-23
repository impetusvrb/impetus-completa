'use strict';

const SAFETY_QUESTIONS = Object.freeze([
  { id: 'q_areas_incidents', text: 'Quais áreas concentram incidentes abertos ou reincidentes?' },
  { id: 'q_apr_critical', text: 'Quais APR/PT/LOTO estão críticas ou vencidas?' },
  { id: 'q_unsafe_behavior', text: 'Qual comportamento inseguro aumentou nas últimas semanas?' },
  { id: 'q_risk_escalation', text: 'Qual risco escalou na matriz ou no heatmap?' },
  { id: 'q_sector_deterioration', text: 'Qual setor deteriorou em compliance EPI ou ocorrências?' },
  { id: 'q_recurrence', text: 'Onde há reincidência operacional de incidentes ou desvios?' }
]);

function buildSafetyDecisionSupport(bindings = [], engineContext = {}) {
  const ai = bindings.find((b) => b.block_id === 'sst.safety_ai');
  const findings = ai?.engine_output?.findings || engineContext.findings || [];
  return {
    center_id: 'safety_decision_support',
    label: 'IA Contextual SST',
    layer: 'operational',
    weight: 0.1,
    render_slot: 'pergunte_ia',
    questions: SAFETY_QUESTIONS,
    findings,
    denied_topics: ['producao', 'uptime', 'eficiencia_industrial', 'ebitda', 'oee'],
    summary: ai?.summary || 'Assistente contextual safety-native',
    ok: true
  };
}

module.exports = { buildSafetyDecisionSupport, SAFETY_QUESTIONS };
