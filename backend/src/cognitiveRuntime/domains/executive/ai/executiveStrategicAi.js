'use strict';

const STRATEGIC_QUESTIONS = [
  'Onde estão os maiores riscos enterprise?',
  'Qual domínio apresenta maior deterioração?',
  'Existe convergência organizacional?',
  'Qual área está mais instável?',
  'ESG está deteriorando?',
  'Existe fadiga operacional?',
  'Qual risco estratégico exige atenção?'
];

function buildExecutiveStrategicAi(strategic = {}, enterprise = {}) {
  const answers = [];
  if ((enterprise.risk_index ?? 0) > 40) {
    answers.push({ q: STRATEGIC_QUESTIONS[0], a: `Risco enterprise elevado (${enterprise.risk_index}). Priorizar domínios em deterioração.` });
  }
  if ((strategic.convergence ?? 0.7) < 0.6) {
    answers.push({ q: STRATEGIC_QUESTIONS[2], a: 'Convergência organizacional abaixo do ideal — alinhar pressão entre domínios.' });
  }
  if (strategic.environmental_risk === 'elevated') {
    answers.push({ q: STRATEGIC_QUESTIONS[4], a: 'ESG/risco ambiental requer atenção estratégica.' });
  }
  return {
    contextual_questions: STRATEGIC_QUESTIONS,
    answers,
    strategic_only: true,
    operational_troubleshooting: false
  };
}

module.exports = { buildExecutiveStrategicAi, STRATEGIC_QUESTIONS };
