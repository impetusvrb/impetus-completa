'use strict';

function buildEnvironmentalOperationalAI(signalBundle = {}) {
  const op = signalBundle.operational || {};
  const answers = [];
  if (op.emissions_tco2e != null) {
    answers.push({ q: 'Quais emissões estão degradando?', a: `Inventário proxy: ${op.emissions_tco2e} tCO2e.` });
  }
  if (op.licenses_expiring > 0) {
    answers.push({ q: 'Há vencimentos próximos?', a: `${op.licenses_expiring} licença(s) a vencer.` });
  }
  if (op.compliance_risk_score >= 40) {
    answers.push({ q: 'Existe risco regulatório?', a: `Score risco ${op.compliance_risk_score} — rever compliance.` });
  }
  return {
    contextual_questions: [
      'Quais emissões estão degradando?',
      'Existe risco regulatório?',
      'Quais resíduos estão fora da meta?',
      'Há vencimentos próximos?',
      'Onde há maior risco ambiental?',
      'Quais indicadores ESG deterioraram?',
      'Existe risco de não conformidade?'
    ],
    answers,
    denied_topics: ['ebitda', 'oee', 'rh', 'boardroom_executivo', 'producao_turno'],
    engine: 'environmental_operational_ai_v1'
  };
}

module.exports = { buildEnvironmentalOperationalAI };
