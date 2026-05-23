'use strict';

const { buildQualityContextualQuestions } = require('../../domainAdapters/quality/qualityContextualQuestionsAdapter');

const Z23_QUESTIONS = [
  { id: 'z23_deviations', text: 'Quais desvios aumentaram no período?', domain: 'quality' },
  { id: 'z23_supplier', text: 'Qual fornecedor deteriorou no score de qualidade?', domain: 'quality' },
  { id: 'z23_capa_eff', text: 'Qual CAPA perdeu eficácia ou está vencida?', domain: 'quality' },
  { id: 'z23_lot_risk', text: 'Qual lote apresenta maior risco de rejeição?', domain: 'quality' },
  { id: 'z23_spc_ooc', text: 'Qual tendência SPC saiu do controle?', domain: 'quality' },
  { id: 'z23_rejection', text: 'Qual processo concentra mais rejeições?', domain: 'quality' }
];

function buildQualityDecisionSupport(bindings = [], engineContext = {}) {
  const base = buildQualityContextualQuestions(bindings, engineContext);
  const merged = [...(base.questions || []), ...Z23_QUESTIONS];
  const seen = new Set();
  const questions = [];
  for (const q of merged) {
    if (seen.has(q.id)) continue;
    seen.add(q.id);
    questions.push(q);
    if (questions.length >= 6) break;
  }

  return {
    center_id: 'quality_decision_support',
    label: 'IA contextual de qualidade',
    layer: 'operational',
    weight: 0.12,
    render_slot: 'pergunte_ia',
    questions,
    assistive_only: true,
    ok: questions.length > 0
  };
}

module.exports = { buildQualityDecisionSupport };
