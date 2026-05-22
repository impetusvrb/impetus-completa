'use strict';

const DEFAULT_QUESTIONS = [
  { id: 'q_nc_trend', text: 'Qual setor concentra mais NC abertas esta semana?', domain: 'quality' },
  { id: 'q_capa_sla', text: 'Quantas CAPAs estão fora do prazo de contenção?', domain: 'quality' },
  { id: 'q_spc_drift', text: 'Há drift SPC activo em algum processo crítico?', domain: 'quality' }
];

function buildQualityContextualQuestions(bindings = [], engineContext = {}) {
  const questions = [];
  const nc = bindings.find((b) => b.block_id === 'quality.nc_center');
  if (nc?.metrics?.open_nc > 0) {
    questions.push({
      id: 'q_nc_open',
      text: `Existem ${nc.metrics.open_nc} NC abertas — qual a prioridade de encerramento?`,
      domain: 'quality',
      source: 'nc_center'
    });
  }
  const spc = bindings.find((b) => b.block_id === 'quality.spc_monitor');
  if (spc?.metrics?.drift_severity) {
    questions.push({
      id: 'q_spc_active',
      text: `Drift ${spc.metrics.drift_severity} detectado — rever amostragem SPC?`,
      domain: 'quality',
      source: 'spc_monitor'
    });
  }
  const rec = bindings.find((b) => b.block_id === 'quality.recurrence_analysis');
  if (rec?.metrics?.dominant_key) {
    questions.push({
      id: 'q_recurrence',
      text: `Reincidência em ${rec.metrics.dominant_key} — reforçar CAPA?`,
      domain: 'quality',
      source: 'recurrence_analysis'
    });
  }

  if (!questions.length) {
    return { questions: DEFAULT_QUESTIONS.slice(0, 2), source: 'default_quality_pack' };
  }

  return {
    questions: questions.slice(0, 5),
    source: 'z21_contextual_questions_adapter'
  };
}

module.exports = { buildQualityContextualQuestions };
